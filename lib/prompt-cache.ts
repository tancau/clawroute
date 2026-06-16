/**
 * Prompt 缓存感知路由
 * 
 * 功能：
 * 1. 追踪已发送到各 Provider 的 prompt 前缀
 * 2. 当相同前缀的请求再次到达时，优先路由到有缓存的 Provider
 * 3. 利用 Anthropic/DeepSeek 的 prompt caching 特性节省 90% 输入成本
 * 
 * 缓存原理：
 * - Anthropic Claude: 支持 prompt caching，重复前缀的输入成本降至 1/10
 * - DeepSeek: 支持 context caching，重复前缀自动缓存
 * - OpenAI: 自动 prompt caching（无需客户端干预）
 * - Google Gemini: context caching API
 */

// ==================== 类型定义 ====================

interface CacheEntry {
  prefixHash: string;        // prompt 前缀的 hash
  provider: string;          // 缓存所在的 Provider
  model: string;             // 缓存所在的模型
  prefixLength: number;      // 缓存的前缀长度（tokens）
  lastHitAt: number;         // 上次命中时间
  hitCount: number;          // 命中次数
  estimatedSavingUsd: number; // 预计节省金额
  createdAt: number;         // 创建时间
}

// ==================== 配置 ====================

// 支持 prompt caching 的 Provider 及其缓存效率
const CACHEABLE_PROVIDERS: Record<string, {
  cacheDiscount: number;      // 缓存命中时的输入成本折扣（0.1 = 只收 10%）
  minPrefixTokens: number;    // 最小缓存前缀 token 数
  cacheTtlMs: number;         // 缓存有效期
}> = {
  anthropic: {
    cacheDiscount: 0.1,         // 缓存命中只收 10% 输入成本
    minPrefixTokens: 1024,      // Anthropic 要求至少 1024 tokens
    cacheTtlMs: 5 * 60 * 1000,  // 5 分钟
  },
  deepseek: {
    cacheDiscount: 0.1,
    minPrefixTokens: 64,        // DeepSeek 缓存门槛较低
    cacheTtlMs: 10 * 60 * 1000, // 10 分钟
  },
  openai: {
    cacheDiscount: 0.5,         // OpenAI 自动缓存折扣约 50%
    minPrefixTokens: 1024,
    cacheTtlMs: 5 * 60 * 1000,
  },
  google: {
    cacheDiscount: 0.25,
    minPrefixTokens: 1024,
    cacheTtlMs: 10 * 60 * 1000,
  },
};

// 缓存存储：hash -> entries
const cacheStore = new Map<string, CacheEntry[]>();

// 最大缓存条目数
const MAX_CACHE_ENTRIES = 5000;
// 清理间隔
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 分钟

let lastCleanup = Date.now();

// ==================== Hash 计算 ====================

/**
 * 计算消息前缀的 hash
 * 取 system message + 前 N 个字符的 user message 作为前缀
 */
function computePrefixHash(messages: Array<{ role: string; content: string }>): string {
  // 提取 system message 和第一个 user message 的前 500 字符
  const parts: string[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      parts.push(msg.content);
    } else if (msg.role === 'user') {
      parts.push(msg.content.slice(0, 500));
      break; // 只取第一个 user message
    }
  }

  const combined = parts.join('\n---\n');

  // 简单但快速的 hash（不需要加密级别）
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * 估算消息的 token 数
 * 粗略估算：1 token ≈ 4 字符（英文）或 2 字符（中文）
 */
function estimateTokens(content: string): number {
  // 混合语言估算：平均 3 字符/token
  return Math.ceil(content.length / 3);
}

// ==================== 缓存操作 ====================

/**
 * 记录一个 prompt 已发送到某个 Provider
 */
export function recordPromptCache(
  messages: Array<{ role: string; content: string }>,
  provider: string,
  model: string,
): void {
  // 检查是否支持缓存
  const cacheConfig = CACHEABLE_PROVIDERS[provider];
  if (!cacheConfig) return;

  const prefixHash = computePrefixHash(messages);
  const prefixTokens = estimateTokens(
    messages.map(m => m.content).join('')
  );

  // 太短的 prompt 不值得缓存
  if (prefixTokens < cacheConfig.minPrefixTokens) return;

  const now = Date.now();

  let entries = cacheStore.get(prefixHash);
  if (!entries) {
    entries = [];
    cacheStore.set(prefixHash, entries);
  }

  // 检查是否已有相同 Provider 的缓存
  const existing = entries.find(e => e.provider === provider && e.model === model);
  if (existing) {
    existing.lastHitAt = now;
    existing.hitCount++;
    existing.prefixLength = Math.max(existing.prefixLength, prefixTokens);
  } else {
    entries.push({
      prefixHash,
      provider,
      model,
      prefixLength: prefixTokens,
      lastHitAt: now,
      hitCount: 1,
      estimatedSavingUsd: 0,
      createdAt: now,
    });
  }

  // 定期清理
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanup();
    lastCleanup = now;
  }
}

/**
 * 查询是否有缓存命中
 * 返回缓存所在的 Provider 和节省信息
 */
export function findCacheHit(
  messages: Array<{ role: string; content: string }>,
  candidateProviders: string[],
): {
  provider: string;
  model: string;
  cacheDiscount: number;
  hitCount: number;
} | null {
  const prefixHash = computePrefixHash(messages);
  const entries = cacheStore.get(prefixHash);
  if (!entries || entries.length === 0) return null;

  const now = Date.now();

  // 找到候选 Provider 中有缓存的，优先选择缓存命中次数最多的
  for (const candidateProvider of candidateProviders) {
    const cacheConfig = CACHEABLE_PROVIDERS[candidateProvider];
    if (!cacheConfig) continue;

    const entry = entries.find(e =>
      e.provider === candidateProvider &&
      (now - e.lastHitAt) < cacheConfig.cacheTtlMs
    );

    if (entry) {
      return {
        provider: entry.provider,
        model: entry.model,
        cacheDiscount: cacheConfig.cacheDiscount,
        hitCount: entry.hitCount,
      };
    }
  }

  return null;
}

/**
 * 计算缓存感知后的实际成本
 */
export function calculateCacheAwareCost(
  inputCostPer1M: number,
  inputTokens: number,
  cacheHit: { cacheDiscount: number } | null,
): number {
  const baseCost = (inputTokens / 1_000_000) * inputCostPer1M;
  if (cacheHit) {
    return baseCost * cacheHit.cacheDiscount;
  }
  return baseCost;
}

// ==================== 清理 ====================

function cleanup() {
  const now = Date.now();
  let totalEntries = 0;

  const keys = Array.from(cacheStore.keys());
  for (const hash of keys) {
    const entries = cacheStore.get(hash);
    if (!entries) continue;
    // 移除过期条目
    const valid = entries.filter((e: CacheEntry) => {
      const cacheConfig = CACHEABLE_PROVIDERS[e.provider];
      if (!cacheConfig) return false;
      return (now - e.lastHitAt) < cacheConfig.cacheTtlMs;
    });

    if (valid.length === 0) {
      cacheStore.delete(hash);
    } else {
      cacheStore.set(hash, valid);
      totalEntries += valid.length;
    }
  }

  // 如果总数仍然太多，移除最旧的
  if (totalEntries > MAX_CACHE_ENTRIES) {
    const allEntries: CacheEntry[] = [];
    cacheStore.forEach((entries: CacheEntry[]) => {
      allEntries.push(...entries);
    });
    allEntries.sort((a, b) => a.lastHitAt - b.lastHitAt);

    const toRemove = totalEntries - MAX_CACHE_ENTRIES;
    const removeSet = new Set<string>();
    for (let i = 0; i < toRemove; i++) {
      const entry = allEntries[i];
      if (entry) removeSet.add(`${entry.prefixHash}:${entry.provider}:${entry.model}`);
    }

    const keys2 = Array.from(cacheStore.keys());
    for (const hash of keys2) {
      const entries = cacheStore.get(hash);
      if (!entries) continue;
      const filtered = entries.filter((e: CacheEntry) =>
        !removeSet.has(`${e.prefixHash}:${e.provider}:${e.model}`)
      );
      if (filtered.length === 0) {
        cacheStore.delete(hash);
      } else {
        cacheStore.set(hash, filtered);
      }
    }
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  totalEntries: number;
  totalHits: number;
  totalEstimatedSavingUsd: number;
  topCachedPrefixes: Array<{
    provider: string;
    model: string;
    hitCount: number;
    prefixLength: number;
  }>;
} {
  let totalHits = 0;
  let totalSaving = 0;
  const allEntries: CacheEntry[] = [];

  cacheStore.forEach((entries: CacheEntry[]) => {
    for (const entry of entries) {
      totalHits += entry.hitCount;
      totalSaving += entry.estimatedSavingUsd;
      allEntries.push(entry);
    }
  });

  // 按命中次数排序取 top 10
  allEntries.sort((a, b) => b.hitCount - a.hitCount);

  return {
    totalEntries: allEntries.length,
    totalHits,
    totalEstimatedSavingUsd: totalSaving,
    topCachedPrefixes: allEntries.slice(0, 10).map(e => ({
      provider: e.provider,
      model: e.model,
      hitCount: e.hitCount,
      prefixLength: e.prefixLength,
    })),
  };
}
