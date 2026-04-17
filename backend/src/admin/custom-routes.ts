/**
 * Admin Custom Routing Rules Management Module
 * 定制路由规则管理后台 API
 */

import { db } from '../db';

export interface CustomRuleView {
  id: string;
  teamId: string;
  teamName?: string;
  name: string;
  description: string | null;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  priority: number;
  enabled: boolean;
  status: 'pending' | 'approved' | 'rejected';
  matchCount: number;
  lastMatchedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CustomRuleListOptions {
  teamId?: string;
  status?: string;
  enabled?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface RuleTestResult {
  ruleId: string;
  matched: boolean;
  matchReason?: string;
  action?: Record<string, unknown>;
  executionTimeMs: number;
}

// 路由规则列表
export function listCustomRoutingRules(options: CustomRuleListOptions = {}): { rules: CustomRuleView[]; total: number } {
  const {
    teamId,
    status,
    enabled,
    search,
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (teamId) {
    whereClauses.push('cr.team_id = ?');
    params.push(teamId);
  }

  if (status) {
    whereClauses.push('cr.status = ?');
    params.push(status);
  }

  if (enabled !== undefined) {
    whereClauses.push('cr.enabled = ?');
    params.push(enabled ? 1 : 0);
  }

  if (search) {
    whereClauses.push('(cr.name LIKE ? OR cr.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM custom_routing_rules cr ${whereClause}`;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  const query = `
    SELECT 
      cr.id,
      cr.team_id,
      t.name as team_name,
      cr.name,
      cr.description,
      cr.condition,
      cr.action,
      cr.priority,
      cr.enabled,
      cr.status,
      cr.match_count,
      cr.last_matched_at,
      cr.created_at,
      cr.updated_at
    FROM custom_routing_rules cr
    LEFT JOIN teams t ON cr.team_id = t.id
    ${whereClause}
    ORDER BY cr.priority DESC, cr.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const rules: CustomRuleView[] = rows.map(row => ({
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name || undefined,
    name: row.name,
    description: row.description,
    condition: row.condition ? JSON.parse(row.condition) : {},
    action: row.action ? JSON.parse(row.action) : {},
    priority: row.priority,
    enabled: row.enabled === 1,
    status: row.status,
    matchCount: row.match_count,
    lastMatchedAt: row.last_matched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { rules, total };
}

// 路由规则详情
export function getCustomRuleDetail(ruleId: string): CustomRuleView | null {
  const row = db.prepare(`
    SELECT 
      cr.id,
      cr.team_id,
      t.name as team_name,
      cr.name,
      cr.description,
      cr.condition,
      cr.action,
      cr.priority,
      cr.enabled,
      cr.status,
      cr.match_count,
      cr.last_matched_at,
      cr.created_at,
      cr.updated_at
    FROM custom_routing_rules cr
    LEFT JOIN teams t ON cr.team_id = t.id
    WHERE cr.id = ?
  `).get(ruleId) as any;

  if (!row) return null;

  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name || undefined,
    name: row.name,
    description: row.description,
    condition: row.condition ? JSON.parse(row.condition) : {},
    action: row.action ? JSON.parse(row.action) : {},
    priority: row.priority,
    enabled: row.enabled === 1,
    status: row.status,
    matchCount: row.match_count,
    lastMatchedAt: row.last_matched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 审批通过路由规则
export function approveCustomRule(ruleId: string): void {
  db.prepare("UPDATE custom_routing_rules SET status = 'approved', updated_at = ? WHERE id = ?").run(Date.now(), ruleId);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'admin',
    'custom_rule.approved',
    JSON.stringify({ ruleId }),
    Date.now()
  );
}

// 拒绝路由规则
export function rejectCustomRule(ruleId: string, reason?: string): void {
  db.prepare("UPDATE custom_routing_rules SET status = 'rejected', updated_at = ? WHERE id = ?").run(Date.now(), ruleId);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'admin',
    'custom_rule.rejected',
    JSON.stringify({ ruleId, reason: reason || 'Admin rejected' }),
    Date.now()
  );
}

// 测试路由规则
export function testCustomRule(ruleId: string, testData: Record<string, unknown>): RuleTestResult {
  const rule = db.prepare('SELECT * FROM custom_routing_rules WHERE id = ?').get(ruleId) as any;
  if (!rule) {
    return { ruleId, matched: false, executionTimeMs: 0 };
  }

  const start = Date.now();
  const condition = rule.condition ? JSON.parse(rule.condition) : {};

  try {
    let matched = false;
    let matchReason = '';

    // Simple condition matching
    if (condition.model && testData.model) {
      if (condition.model === testData.model) {
        matched = true;
        matchReason = `Model matches: ${condition.model}`;
      }
    }

    if (condition.provider && testData.provider) {
      if (condition.provider === testData.provider) {
        matched = true;
        matchReason += matchReason ? `; Provider matches: ${condition.provider}` : `Provider matches: ${condition.provider}`;
      }
    }

    if (condition.minTokens && testData.totalTokens) {
      if ((testData.totalTokens as number) >= (condition.minTokens as number)) {
        matched = true;
        matchReason += matchReason ? `; Token threshold met` : `Token threshold met`;
      }
    }

    // Default: if no conditions specified, always matches
    if (Object.keys(condition).length === 0) {
      matched = true;
      matchReason = 'No conditions specified - always matches';
    }

    const action = rule.action ? JSON.parse(rule.action) : {};
    const executionTimeMs = Date.now() - start;

    return {
      ruleId,
      matched,
      matchReason: matched ? matchReason : 'Conditions not met',
      action: matched ? action : undefined,
      executionTimeMs,
    };
  } catch (error) {
    return {
      ruleId,
      matched: false,
      matchReason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTimeMs: Date.now() - start,
    };
  }
}

// 获取规则统计
export function getCustomRuleStats(): {
  totalRules: number;
  activeRules: number;
  pendingApproval: number;
  totalMatches: number;
} {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN enabled = 1 AND status = 'approved' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(match_count) as total_matches
    FROM custom_routing_rules
  `).get() as any;

  return {
    totalRules: stats?.total || 0,
    activeRules: stats?.active || 0,
    pendingApproval: stats?.pending || 0,
    totalMatches: stats?.total_matches || 0,
  };
}

// 启用/禁用路由规则
export function toggleCustomRule(ruleId: string, enabled: boolean): boolean {
  const result = db.prepare('UPDATE custom_routing_rules SET enabled = ?, updated_at = ? WHERE id = ?').run(enabled ? 1 : 0, Date.now(), ruleId);
  return result.changes > 0;
}
