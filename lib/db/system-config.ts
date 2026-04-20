/**
 * 系统配置表管理
 * 用于动态配置系统参数
 */

import { sql } from '@vercel/postgres';

// 配置项类型
export type ConfigType = 'string' | 'number' | 'boolean' | 'json';

export interface SystemConfig {
  key: string;
  value: string;
  type: ConfigType;
  description: string | null;
  updatedAt: number;
  updatedBy: string | null;
}

// 默认配置
const DEFAULT_CONFIGS: Omit<SystemConfig, 'updatedAt' | 'updatedBy'>[] = [
  // API 配置
  { key: 'api.rate_limit_per_minute', value: '10', type: 'number', description: 'API 每分钟调用限制' },
  { key: 'api.daily_limit_free', value: '100', type: 'number', description: '免费用户每日调用限制' },
  { key: 'api.daily_limit_pro', value: '1000', type: 'number', description: 'Pro 用户每日调用限制' },
  { key: 'api.daily_limit_team', value: '10000', type: 'number', description: 'Team 用户每日调用限制' },
  { key: 'api.ip_register_limit', value: '5', type: 'number', description: '每 IP 每小时注册限制' },
  
  // 认证配置
  { key: 'auth.jwt_expiry_hours', value: '1', type: 'number', description: 'JWT 过期时间（小时）' },
  { key: 'auth.refresh_expiry_days', value: '7', type: 'number', description: 'Refresh Token 过期时间（天）' },
  { key: 'auth.email_verification_required', value: 'false', type: 'boolean', description: '是否需要邮箱验证' },
  { key: 'auth.captcha_enabled', value: 'false', type: 'boolean', description: '是否启用 CAPTCHA' },
  
  // 系统配置
  { key: 'system.maintenance_mode', value: 'false', type: 'boolean', description: '维护模式' },
  { key: 'system.default_credits', value: '100', type: 'number', description: '新用户默认 Credits' },
  { key: 'system.credit_cost_per_request', value: '1', type: 'number', description: '每次请求消耗 Credits' },
  
  // 模型权重配置
  { key: 'weights.benchmark', value: '0.70', type: 'number', description: 'Benchmark 权重' },
  { key: 'weights.arena_elo', value: '0.20', type: 'number', description: 'Arena Elo 权重' },
  { key: 'weights.price', value: '0.10', type: 'number', description: '价格权重' },
];

// 确保系统配置表存在
export async function ensureSystemConfigTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT DEFAULT 'string',
      description TEXT,
      updated_at INTEGER NOT NULL,
      updated_by TEXT
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_system_config_type ON system_config(type)`;
  } catch {
    // 索引可能已存在
  }
}

// 初始化默认配置
export async function initializeDefaultConfigs() {
  await ensureSystemConfigTable();
  
  const now = Date.now();
  
  for (const config of DEFAULT_CONFIGS) {
    // 检查是否已存在
    const existing = await sql`
      SELECT key FROM system_config WHERE key = ${config.key}
    `;
    
    if (existing.rows.length === 0) {
      await sql`
        INSERT INTO system_config (key, value, type, description, updated_at, updated_by)
        VALUES (${config.key}, ${config.value}, ${config.type}, ${config.description}, ${now}, null)
      `;
    }
  }
}

// 获取单个配置
export async function getConfigRaw(key: string): Promise<SystemConfig | null> {
  await ensureSystemConfigTable();
  
  const result = await sql`
    SELECT key, value, type, description, updated_at, updated_by
    FROM system_config WHERE key = ${key}
  `;
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0]!;
  return {
    key: row.key as string,
    value: row.value as string,
    type: row.type as ConfigType,
    description: row.description as string | null,
    updatedAt: row.updated_at as number,
    updatedBy: row.updated_by as string | null,
  };
}

// 获取所有配置
export async function getAllConfigsRaw(): Promise<SystemConfig[]> {
  await ensureSystemConfigTable();
  
  const result = await sql`
    SELECT key, value, type, description, updated_at, updated_by
    FROM system_config ORDER BY key
  `;
  
  return result.rows.map(row => ({
    key: row.key as string,
    value: row.value as string,
    type: row.type as ConfigType,
    description: row.description as string | null,
    updatedAt: row.updated_at as number,
    updatedBy: row.updated_by as string | null,
  }));
}

// 设置配置
export async function setConfigRaw(
  key: string, 
  value: string, 
  userId?: string
): Promise<boolean> {
  await ensureSystemConfigTable();
  
  const now = Date.now();
  
  const result = await sql`
    INSERT INTO system_config (key, value, type, description, updated_at, updated_by)
    VALUES (${key}, ${value}, 'string', null, ${now}, ${userId || null})
    ON CONFLICT (key) DO UPDATE SET
      value = ${value},
      updated_at = ${now},
      updated_by = ${userId || null}
  `;
  
  return (result.rowCount ?? 0) > 0;
}

// 批量设置配置
export async function setConfigsRaw(
  configs: Array<{ key: string; value: string }>,
  userId?: string
): Promise<boolean> {
  await ensureSystemConfigTable();
  
  const now = Date.now();
  
  for (const config of configs) {
    await sql`
      INSERT INTO system_config (key, value, type, description, updated_at, updated_by)
      VALUES (${config.key}, ${config.value}, 'string', null, ${now}, ${userId || null})
      ON CONFLICT (key) DO UPDATE SET
        value = ${config.value},
        updated_at = ${now},
        updated_by = ${userId || null}
    `;
  }
  
  return true;
}

// 重置为默认值
export async function resetToDefaults(userId?: string): Promise<void> {
  await ensureSystemConfigTable();
  
  const now = Date.now();
  
  for (const config of DEFAULT_CONFIGS) {
    await sql`
      UPDATE system_config 
      SET value = ${config.value}, updated_at = ${now}, updated_by = ${userId || null}
      WHERE key = ${config.key}
    `;
  }
}
