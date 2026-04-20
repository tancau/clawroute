/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 系统配置 API
 * 提供类型安全的配置读取接口
 */

import {
  ensureSystemConfigTable,
  initializeDefaultConfigs,
  getConfigRaw,
  getAllConfigsRaw,
  setConfigRaw,
  setConfigsRaw,
  resetToDefaults,
  type SystemConfig,
  type ConfigType,
} from '../db/system-config';

// 解析配置值
function parseConfigValue(value: string, type: ConfigType): string | number | boolean | object {
  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    case 'boolean':
      return value === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    default:
      return value;
  }
}

// 配置缓存（内存缓存，减少数据库查询）
let configCache: Map<string, { value: unknown; timestamp: number }> | null = null;
const CACHE_TTL = 60000; // 1 分钟缓存

// 清除缓存
export function clearConfigCache() {
  configCache = null;
}

// 获取单个配置（带缓存）
export async function getConfig<T = string | number | boolean | object>(
  key: string,
  defaultValue?: T
): Promise<T> {
  // 检查缓存
  if (configCache) {
    const cached = configCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value as T;
    }
  }

  const config = await getConfigRaw(key);
  
  if (!config) {
    return defaultValue as T;
  }
  
  const value = parseConfigValue(config.value, config.type);
  
  // 更新缓存
  if (!configCache) {
    configCache = new Map();
  }
  configCache.set(key, { value, timestamp: Date.now() });
  
  return value as T;
}

// 获取所有配置（分组）
export interface ConfigGroup {
  category: string;
  configs: Array<{
    key: string;
    value: string | number | boolean | object;
    type: ConfigType;
    description: string | null;
  }>;
}

export async function getConfigGroups(): Promise<ConfigGroup[]> {
  const configs = await getAllConfigsRaw();
  
  const groups: Map<string, ConfigGroup> = new Map();
  
  for (const config of configs) {
    const category = config.key.split('.')[0] || 'other';
    
    if (!groups.has(category)) {
      groups.set(category, {
        category: category.toUpperCase(),
        configs: [],
      });
    }
    
    groups.get(category)!.configs.push({
      key: config.key,
      value: parseConfigValue(config.value, config.type),
      type: config.type,
      description: config.description,
    });
  }
  
  return Array.from(groups.values());
}

// 获取所有配置（扁平）
export async function getAllConfigs(): Promise<Record<string, string | number | boolean | object>> {
  const configs = await getAllConfigsRaw();
  const result: Record<string, string | number | boolean | object> = {};
  
  for (const config of configs) {
    result[config.key] = parseConfigValue(config.value, config.type);
  }
  
  return result;
}

// 设置配置
export async function setConfig(key: string, value: string | number | boolean, userId?: string): Promise<boolean> {
  clearConfigCache();
  
  const valueStr = typeof value === 'boolean' 
    ? String(value) 
    : String(value);
  
  return setConfigRaw(key, valueStr, userId);
}

// 批量设置配置
export async function setConfigs(
  configs: Array<{ key: string; value: string | number | boolean }>,
  userId?: string
): Promise<boolean> {
  clearConfigCache();
  
  return setConfigsRaw(
    configs.map(c => ({ key: c.key, value: String(c.value) })),
    userId
  );
}

// 重置为默认值
export async function resetConfigDefaults(userId?: string): Promise<void> {
  clearConfigCache();
  await resetToDefaults(userId);
}

// 初始化配置系统
export async function initConfigSystem(): Promise<void> {
  await ensureSystemConfigTable();
  await initializeDefaultConfigs();
}

// ===== 便捷方法 =====

// 获取 API 配置
export async function getApiConfig() {
  return {
    rateLimitPerMinute: await getConfig<number>('api.rate_limit_per_minute', 10),
    dailyLimitFree: await getConfig<number>('api.daily_limit_free', 100),
    dailyLimitPro: await getConfig<number>('api.daily_limit_pro', 1000),
    dailyLimitTeam: await getConfig<number>('api.daily_limit_team', 10000),
    ipRegisterLimit: await getConfig<number>('api.ip_register_limit', 5),
  };
}

// 获取认证配置
export async function getAuthConfig() {
  return {
    jwtExpiryHours: await getConfig<number>('auth.jwt_expiry_hours', 1),
    refreshExpiryDays: await getConfig<number>('auth.refresh_expiry_days', 7),
    emailVerificationRequired: await getConfig<boolean>('auth.email_verification_required', false),
    captchaEnabled: await getConfig<boolean>('auth.captcha_enabled', false),
  };
}

// 获取系统配置
export async function getSystemConfig() {
  return {
    maintenanceMode: await getConfig<boolean>('system.maintenance_mode', false),
    defaultCredits: await getConfig<number>('system.default_credits', 100),
    creditCostPerRequest: await getConfig<number>('system.credit_cost_per_request', 1),
  };
}

// 获取权重配置
export async function getWeightsConfig() {
  return {
    benchmark: await getConfig<number>('weights.benchmark', 0.7),
    arenaElo: await getConfig<number>('weights.arena_elo', 0.2),
    price: await getConfig<number>('weights.price', 0.1),
  };
}

// 根据用户等级获取每日限制
export async function getDailyLimitByTier(tier: string): Promise<number> {
  switch (tier) {
    case 'pro':
      return getConfig<number>('api.daily_limit_pro', 1000);
    case 'team':
      return getConfig<number>('api.daily_limit_team', 10000);
    case 'admin':
      return Infinity; // Admin 无限制
    default:
      return getConfig<number>('api.daily_limit_free', 100);
  }
}
