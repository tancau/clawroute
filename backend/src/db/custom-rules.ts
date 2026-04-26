import { db } from './index';
import { logger } from '../monitoring/logger';
import type { IntentType } from '../tools/types';

/**
 * 用户自定义意图规则
 */
export interface CustomRule {
  id: string;
  userId: string;
  keyword: string;       // 关键词
  intent: IntentType;    // 意图类型
  priority: number;      // 优先级 (越高越先匹配)
  enabled: boolean;      // 是否启用
  createdAt: number;
  updatedAt: number;
}

/**
 * 创建自定义规则表
 */
export function initCustomRulesTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      intent TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_custom_rules_user ON custom_rules(user_id);
    CREATE INDEX IF NOT EXISTS idx_custom_rules_enabled ON custom_rules(enabled);
  `);
  logger.info('Custom rules table initialized');
}

// ==================== CRUD Operations ====================

/**
 * 获取用户的所有自定义规则
 */
export function getCustomRules(userId: string): CustomRule[] {
  const rows = db.prepare(`
    SELECT id, user_id as userId, keyword, intent, priority, enabled,
           created_at as createdAt, updated_at as updatedAt
    FROM custom_rules
    WHERE user_id = ?
    ORDER BY priority DESC, created_at DESC
  `).all(userId) as any[];

  return rows.map(row => ({
    ...row,
    enabled: row.enabled === 1,
  }));
}

/**
 * 获取用户启用的自定义规则（用于规则引擎）
 */
export function getEnabledCustomRules(userId: string): CustomRule[] {
  const rows = db.prepare(`
    SELECT id, user_id as userId, keyword, intent, priority, enabled,
           created_at as createdAt, updated_at as updatedAt
    FROM custom_rules
    WHERE user_id = ? AND enabled = 1
    ORDER BY priority DESC
  `).all(userId) as any[];

  return rows.map(row => ({
    ...row,
    enabled: true,
  }));
}

/**
 * 创建新规则
 */
export function createCustomRule(data: {
  userId: string;
  keyword: string;
  intent: IntentType;
  priority?: number;
}): CustomRule {
  const id = crypto.randomUUID();
  const now = Date.now();
  const priority = data.priority ?? 50;

  db.prepare(`
    INSERT INTO custom_rules (id, user_id, keyword, intent, priority, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, data.userId, data.keyword, data.intent, priority, now, now);

  return {
    id,
    userId: data.userId,
    keyword: data.keyword,
    intent: data.intent,
    priority,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 更新规则
 */
export function updateCustomRule(
  ruleId: string,
  userId: string,
  data: {
    keyword?: string;
    intent?: IntentType;
    priority?: number;
    enabled?: boolean;
  }
): CustomRule | null {
  const now = Date.now();
  const updates: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  if (data.keyword !== undefined) {
    updates.push('keyword = ?');
    values.push(data.keyword);
  }
  if (data.intent !== undefined) {
    updates.push('intent = ?');
    values.push(data.intent);
  }
  if (data.priority !== undefined) {
    updates.push('priority = ?');
    values.push(data.priority);
  }
  if (data.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(data.enabled ? 1 : 0);
  }

  values.push(ruleId, userId);

  const result = db.prepare(`
    UPDATE custom_rules SET ${updates.join(', ')}
    WHERE id = ? AND user_id = ?
  `).run(...values);

  if (result.changes === 0) return null;

  return getCustomRuleById(ruleId);
}

/**
 * 删除规则
 */
export function deleteCustomRule(ruleId: string, userId: string): boolean {
  const result = db.prepare(`
    DELETE FROM custom_rules WHERE id = ? AND user_id = ?
  `).run(ruleId, userId);

  return result.changes > 0;
}

/**
 * 根据 ID 获取规则
 */
export function getCustomRuleById(ruleId: string): CustomRule | null {
  const row = db.prepare(`
    SELECT id, user_id as userId, keyword, intent, priority, enabled,
           created_at as createdAt, updated_at as updatedAt
    FROM custom_rules
    WHERE id = ?
  `).get(ruleId) as any;

  if (!row) return null;

  return {
    ...row,
    enabled: row.enabled === 1,
  };
}

/**
 * 仅更新规则的优先级（用于拖拽排序）
 */
export function updateCustomRulePriority(
  ruleId: string,
  userId: string,
  priority: number
): CustomRule | null {
  const now = Date.now();

  const result = db.prepare(`
    UPDATE custom_rules SET priority = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(priority, now, ruleId, userId);

  if (result.changes === 0) return null;

  return getCustomRuleById(ruleId);
}