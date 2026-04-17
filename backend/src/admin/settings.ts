/**
 * Admin Settings Module
 * 系统设置 API
 */

import { db } from '../db';

export interface SystemSettings {
  registration: {
    enabled: boolean;
    inviteOnly: boolean;
  };
  features: {
    keySharing: boolean;
    earningsEnabled: boolean;
  };
  limits: {
    maxKeysPerUser: number;
    maxRequestsPerDay: number;
  };
  maintenance: {
    enabled: boolean;
    message: string;
  };
}

// 默认设置
const DEFAULT_SETTINGS: SystemSettings = {
  registration: {
    enabled: true,
    inviteOnly: false,
  },
  features: {
    keySharing: true,
    earningsEnabled: true,
  },
  limits: {
    maxKeysPerUser: 10,
    maxRequestsPerDay: 1000,
  },
  maintenance: {
    enabled: false,
    message: '',
  },
};

// 初始化设置表
export function initSettingsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 初始化默认设置
  const now = Date.now();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insert.run(key, JSON.stringify(value), now);
  }
}

// 获取系统设置
export function getSettings(): SystemSettings {
  const rows = db.prepare('SELECT key, value FROM system_settings').all() as any[];
  
  const settings = { ...DEFAULT_SETTINGS };
  
  for (const row of rows) {
    if (row.key in settings) {
      (settings as any)[row.key] = JSON.parse(row.value);
    }
  }

  return settings;
}

// 获取单个设置
export function getSetting<K extends keyof SystemSettings>(key: K): SystemSettings[K] {
  const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key) as any;
  
  if (!row) return DEFAULT_SETTINGS[key];
  
  return JSON.parse(row.value);
}

// 更新设置
export function updateSettings(settings: Partial<SystemSettings>): void {
  const now = Date.now();
  const update = db.prepare(`
    INSERT OR REPLACE INTO system_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  for (const [key, value] of Object.entries(settings)) {
    if (key in DEFAULT_SETTINGS) {
      update.run(key, JSON.stringify(value), now);
    }
  }

  // 记录操作日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'system',
    'settings_updated',
    JSON.stringify({ changes: settings }),
    Date.now()
  );
}

// 更新单个设置
export function updateSetting<K extends keyof SystemSettings>(
  key: K,
  value: SystemSettings[K]
): void {
  const now = Date.now();
  
  db.prepare(`
    INSERT OR REPLACE INTO system_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `).run(key, JSON.stringify(value), now);

  // 记录操作日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'system',
    `${key}_updated`,
    JSON.stringify({ key, value }),
    Date.now()
  );
}

// 检查功能是否启用
export function isFeatureEnabled(feature: keyof SystemSettings['features']): boolean {
  const settings = getSettings();
  return settings.features[feature];
}

// 检查是否在维护模式
export function isMaintenanceMode(): boolean {
  const settings = getSettings();
  return settings.maintenance.enabled;
}

// 获取维护消息
export function getMaintenanceMessage(): string {
  const settings = getSettings();
  return settings.maintenance.message || 'System is under maintenance. Please try again later.';
}

// 检查是否允许注册
export function isRegistrationEnabled(): boolean {
  const settings = getSettings();
  return settings.registration.enabled;
}

// 检查是否为邀请制
export function isInviteOnly(): boolean {
  const settings = getSettings();
  return settings.registration.inviteOnly;
}

// 获取用户限制
export function getUserLimits(): SystemSettings['limits'] {
  return getSetting('limits');
}
