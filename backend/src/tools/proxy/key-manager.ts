import { getProvider, type ProviderConfig } from '../../config/providers';
import { logger } from '../../monitoring/logger';

/**
 * Key 状态
 */
interface KeyStatus {
  key: string;
  valid: boolean;
  lastUsed: number;
  errorCount: number;
  requestCount: number;
}

/**
 * API Key 管理器
 * 
 * 功能：
 * - 多 Key 轮询 (Round Robin)
 * - Key 健康检查
 * - 失效自动切换
 * - 使用统计
 */
export class KeyManager {
  private keys: Map<string, KeyStatus[]> = new Map();
  private keyIndex: Map<string, number> = new Map();
  private stats: Map<string, { totalRequests: number; totalErrors: number }> = new Map();

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
      logger.warn(`No API key found for provider: ${providerName}`, { env: provider.apiKeyEnv });
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
    this.stats.set(providerName, { totalRequests: 0, totalErrors: 0 });

    logger.info(`Loaded ${keyStatuses.length} keys for provider`, { provider: providerName });
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
      logger.warn(`No valid keys for provider`, { provider: providerName });
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
    
    const stats = this.stats.get(providerName);
    if (stats) {
      stats.totalRequests++;
    }

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
      
      const stats = this.stats.get(providerName);
      if (stats) {
        stats.totalErrors++;
      }

      logger.warn(`Key marked invalid`, { provider: providerName, reason: reason || 'unknown error' });
    }

    // 如果所有 key 都失效，尝试重新加载
    const validKeys = keyStatuses.filter(k => k.valid);
    if (validKeys.length === 0) {
      logger.info(`All keys invalid for provider, attempting reload`, { provider: providerName });
      this.loadKeys(providerName);
    }
  }

  /**
   * 获取 Key 统计信息
   */
  getStats(providerName: string): {
    totalKeys: number;
    validKeys: number;
    totalRequests: number;
    totalErrors: number;
  } {
    if (!this.keys.has(providerName)) {
      this.loadKeys(providerName);
    }

    const keyStatuses = this.keys.get(providerName) || [];
    const stats = this.stats.get(providerName) || { totalRequests: 0, totalErrors: 0 };

    return {
      totalKeys: keyStatuses.length,
      validKeys: keyStatuses.filter(k => k.valid).length,
      totalRequests: stats.totalRequests,
      totalErrors: stats.totalErrors,
    };
  }

  /**
   * 获取所有 Provider 的统计
   */
  getAllStats(): Record<string, ReturnType<KeyManager['getStats']>> {
    const result: Record<string, ReturnType<KeyManager['getStats']>> = {};
    
    for (const providerName of Array.from(this.keys.keys())) {
      result[providerName] = this.getStats(providerName);
    }
    
    return result;
  }

  /**
   * 重置 Key 状态 (用于健康检查后恢复)
   */
  resetKeyStatus(providerName: string, key: string): void {
    const keyStatuses = this.keys.get(providerName);
    if (!keyStatuses) return;

    const keyStatus = keyStatuses.find(k => k.key === key);
    if (keyStatus) {
      keyStatus.valid = true;
      keyStatus.errorCount = 0;
      logger.info(`Key status reset`, { provider: providerName });
    }
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.keys.clear();
    this.keyIndex.clear();
    this.stats.clear();
    logger.info('All caches cleared');
  }
}

// 单例实例
export const keyManager = new KeyManager();

export default keyManager;
