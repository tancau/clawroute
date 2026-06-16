/**
 * Provider 健康度监控系统
 * 
 * 功能：
 * 1. 实时追踪每个 Provider 的可用性、延迟、错误率
 * 2. 自动屏蔽短时间内频繁 5xx 的 Provider
 * 3. 提供健康度数据供仪表盘展示
 */

// ==================== 类型定义 ====================

export interface ProviderHealthRecord {
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;           // 平均延迟（最近 10 分钟）
  errorRate: number;            // 错误率（0-1，最近 10 分钟）
  successCount: number;         // 成功请求数
  errorCount: number;           // 失败请求数
  lastCheckAt: number;          // 上次检查时间
  lastErrorAt: number | null;   // 上次错误时间
  lastErrorMessage: string | null;
  consecutiveErrors: number;    // 连续错误次数
  uptime5min: number;           // 5分钟可用率（0-1）
  uptime1hour: number;          // 1小时可用率（0-1）
}

export interface ProviderHealthSummary {
  providers: ProviderHealthRecord[];
  overallStatus: 'healthy' | 'degraded' | 'down';
  timestamp: number;
}

// ==================== 数据结构 ====================

interface HealthEvent {
  timestamp: number;
  success: boolean;
  latencyMs: number;
  errorMessage?: string;
}

// 事件存储：provider -> 事件列表
const healthEvents = new Map<string, HealthEvent[]>();

// 最大保留事件数（按时间窗口自动清理）
const MAX_EVENTS_PER_PROVIDER = 1000;
const EVENT_TTL_MS = 60 * 60 * 1000; // 1 小时

// 屏蔽状态
const blockedProviders = new Map<string, { until: number; reason: string }>();

// 阈值配置
const DEGRADED_ERROR_RATE = 0.1;       // 错误率 > 10% = 降级
const DOWN_ERROR_RATE = 0.5;           // 错误率 > 50% = 宕机
const DEGRADED_LATENCY_MS = 10000;     // 延迟 > 10s = 降级
const DOWN_LATENCY_MS = 30000;         // 延迟 > 30s = 宕机
const CONSECUTIVE_ERRORS_BLOCK = 5;    // 连续 5 次错误自动屏蔽
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 屏蔽 5 分钟

// ==================== 事件记录 ====================

/**
 * 记录一次请求结果
 */
export function recordProviderHealth(
  provider: string,
  success: boolean,
  latencyMs: number,
  errorMessage?: string,
): void {
  let events = healthEvents.get(provider);
  if (!events) {
    events = [];
    healthEvents.set(provider, events);
  }

  events.push({
    timestamp: Date.now(),
    success,
    latencyMs,
    errorMessage,
  });

  // 清理过期事件
  const cutoff = Date.now() - EVENT_TTL_MS;
  while (events.length > 0 && events[0]!.timestamp < cutoff) {
    events.shift();
  }

  // 防止内存泄漏
  if (events.length > MAX_EVENTS_PER_PROVIDER) {
    events.splice(0, events.length - MAX_EVENTS_PER_PROVIDER);
  }

  // 检查是否需要屏蔽
  if (!success) {
    const consecutiveErrors = getConsecutiveErrors(events);
    if (consecutiveErrors >= CONSECUTIVE_ERRORS_BLOCK) {
      blockedProviders.set(provider, {
        until: Date.now() + BLOCK_DURATION_MS,
        reason: `${consecutiveErrors} consecutive errors`,
      });
    }
  } else {
    // 成功时解除屏蔽
    blockedProviders.delete(provider);
  }
}

function getConsecutiveErrors(events: HealthEvent[]): number {
  let count = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    if (!events[i]!.success) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ==================== 健康度查询 ====================

/**
 * 获取单个 Provider 的健康状态
 */
export function getProviderHealth(provider: string): ProviderHealthRecord {
  const events = healthEvents.get(provider) || [];
  const now = Date.now();
  const tenMinAgo = now - 10 * 60 * 1000;
  const fiveMinAgo = now - 5 * 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  // 最近 10 分钟的事件
  const recentEvents = events.filter(e => e.timestamp >= tenMinAgo);
  const recentSuccess = recentEvents.filter(e => e.success);
  const recentErrors = recentEvents.filter(e => !e.success);

  // 平均延迟
  const avgLatency = recentSuccess.length > 0
    ? recentSuccess.reduce((sum, e) => sum + e.latencyMs, 0) / recentSuccess.length
    : 0;

  // 错误率
  const errorRate = recentEvents.length > 0
    ? recentErrors.length / recentEvents.length
    : 0;

  // 5 分钟可用率
  const fiveMinEvents = events.filter(e => e.timestamp >= fiveMinAgo);
  const uptime5min = fiveMinEvents.length > 0
    ? fiveMinEvents.filter(e => e.success).length / fiveMinEvents.length
    : 1;

  // 1 小时可用率
  const oneHourEvents = events.filter(e => e.timestamp >= oneHourAgo);
  const uptime1hour = oneHourEvents.length > 0
    ? oneHourEvents.filter(e => e.success).length / oneHourEvents.length
    : 1;

  // 确定状态
  let status: ProviderHealthRecord['status'] = 'healthy';
  if (errorRate >= DOWN_ERROR_RATE || avgLatency >= DOWN_LATENCY_MS) {
    status = 'down';
  } else if (errorRate >= DEGRADED_ERROR_RATE || avgLatency >= DEGRADED_LATENCY_MS) {
    status = 'degraded';
  }

  // 检查是否被屏蔽
  const blocked = blockedProviders.get(provider);
  if (blocked && blocked.until > now) {
    status = 'down';
  }

  const lastError = recentErrors.length > 0 ? recentErrors[recentErrors.length - 1] : null;

  return {
    provider,
    status,
    latencyMs: Math.round(avgLatency),
    errorRate: Math.round(errorRate * 1000) / 1000,
    successCount: recentSuccess.length,
    errorCount: recentErrors.length,
    lastCheckAt: now,
    lastErrorAt: lastError?.timestamp || null,
    lastErrorMessage: lastError?.errorMessage || null,
    consecutiveErrors: getConsecutiveErrors(events),
    uptime5min: Math.round(uptime5min * 1000) / 1000,
    uptime1hour: Math.round(uptime1hour * 1000) / 1000,
  };
}

/**
 * 获取所有 Provider 的健康概览
 */
export function getProviderHealthSummary(): ProviderHealthSummary {
  const allProviders = new Set<string>([
    ...Array.from(healthEvents.keys()),
    'openai', 'anthropic', 'deepseek', 'qwen', 'google', 'openrouter',
    'mistral', 'groq', 'cohere',
  ]);

  const records = Array.from(allProviders).map(getProviderHealth);

  const hasDown = records.some(r => r.status === 'down');
  const hasDegraded = records.some(r => r.status === 'degraded');

  return {
    providers: records,
    overallStatus: hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy',
    timestamp: Date.now(),
  };
}

/**
 * 过滤掉不健康的 Provider（用于路由选择）
 */
export function filterProvidersByHealth(
  candidates: Array<{ provider: string; model: string; qualityScore?: number }>,
): Array<{ provider: string; model: string; qualityScore?: number }> {
  const now = Date.now();

  return candidates.filter(c => {
    const blocked = blockedProviders.get(c.provider);
    // 如果被屏蔽且未过期，过滤掉
    if (blocked && blocked.until > now) {
      return false;
    }
    return true;
  });
}

/**
 * 检查 Provider 是否可用
 */
export function isProviderAvailable(provider: string): boolean {
  const blocked = blockedProviders.get(provider);
  if (blocked && blocked.until > Date.now()) {
    return false;
  }
  return true;
}

/**
 * 手动解除 Provider 屏蔽
 */
export function unblockProvider(provider: string): void {
  blockedProviders.delete(provider);
}
