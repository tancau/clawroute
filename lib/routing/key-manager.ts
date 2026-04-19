/**
 * API Key 管理器 - 用于 Next.js API Routes
 * 简化版，支持多 Key 轮询
 */

import { getProvider } from './providers';

interface KeyStatus {
  key: string;
  valid: boolean;
  lastUsed: number;
  errorCount: number;
  requestCount: number;
}

class KeyManager {
  private keys: Map<string, KeyStatus[]> = new Map();
  private keyIndex: Map<string, number> = new Map();

  /**
   * 加载 Provider 的 API Keys
   */
  loadKeys(providerName: string): KeyStatus[] {
    const provider = getProvider(providerName);
    if (!provider) {
      return [];
    }

    // 从环境变量获取 key
    const envKey = process.env[provider.apiKeyEnv];
    if (!envKey) {
      console.warn(`[KeyManager] No API key found for provider: ${providerName}`);
      return [];
    }

    // 支持多个 key (用逗号分隔)
    const keyStrings = envKey.split(',').map(k => k.trim()).filter(Boolean);

    const keyStatuses: KeyStatus[] = keyStrings.map(key => ({
      key,
      valid: true,
      lastUsed: 0,
      errorCount: 0,
      requestCount: 0,
    }));

    this.keys.set(providerName, keyStatuses);
    this.keyIndex.set(providerName, 0);

    console.log(`[KeyManager] Loaded ${keyStatuses.length} keys for ${providerName}`);
    return keyStatuses;
  }

  /**
   * 获取下一个可用的 Key (轮询策略)
   */
  getNextKey(providerName: string): string | null {
    if (!this.keys.has(providerName)) {
      this.loadKeys(providerName);
    }

    const keyStatuses = this.keys.get(providerName);
    if (!keyStatuses || keyStatuses.length === 0) {
      return null;
    }

    // 过滤有效的 key
    const validKeys = keyStatuses.filter(k => k.valid);
    if (validKeys.length === 0) {
      // 尝试重新加载
      this.loadKeys(providerName);
      const reloaded = this.keys.get(providerName)?.filter(k => k.valid) || [];
      if (reloaded.length === 0) {
        return null;
      }
    }

    // 轮询选择
    const index = this.keyIndex.get(providerName) || 0;
    const selectedKey = validKeys[index % validKeys.length];

    if (!selectedKey) {
      return null;
    }

    // 更新索引
    this.keyIndex.set(providerName, (index + 1) % validKeys.length);

    // 更新统计
    selectedKey.lastUsed = Date.now();
    selectedKey.requestCount++;

    return selectedKey.key;
  }

  /**
   * 标记 Key 失效
   */
  markKeyInvalid(providerName: string, key: string, reason?: string): void {
    const keyStatuses = this.keys.get(providerName);
    if (!keyStatuses) return;

    const keyStatus = keyStatuses.find(k => k.key === key);
    if (keyStatus) {
      keyStatus.valid = false;
      keyStatus.errorCount++;
      console.warn(`[KeyManager] Key marked invalid for ${providerName}: ${reason || 'unknown error'}`);
    }

    // 如果所有 key 都失效，尝试重新加载
    const validKeys = keyStatuses.filter(k => k.valid);
    if (validKeys.length === 0) {
      console.log(`[KeyManager] All keys invalid for ${providerName}, attempting reload`);
      this.loadKeys(providerName);
    }
  }

  /**
   * 获取 Key 统计信息
   */
  getStats(providerName: string): {
    totalKeys: number;
    validKeys: number;
  } {
    if (!this.keys.has(providerName)) {
      this.loadKeys(providerName);
    }

    const keyStatuses = this.keys.get(providerName) || [];
    return {
      totalKeys: keyStatuses.length,
      validKeys: keyStatuses.filter(k => k.valid).length,
    };
  }
}

// 单例实例
export const keyManager = new KeyManager();
