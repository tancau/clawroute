/**
 * Admin Developer API Keys Management Module
 * 开发者 API Key 管理 API
 */

import { db } from '../db';

export interface AdminApiKeyView {
  id: string;
  name: string;
  prefix: string;
  userId: string;
  userEmail: string;
  teamId?: string;
  teamName?: string;
  permissions: string[];
  rateLimit: number;
  usageLimit: number;
  usageCount: number;
  lastUsedAt: number | null;
  expiresAt: number | null;
  createdAt: number;
  isActive: boolean;
}

export interface ApiKeyListOptions {
  status?: string;
  userId?: string;
  teamId?: string;
  search?: string;
  sortBy?: 'created_at' | 'usage' | 'last_used';
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface ApiKeyUsageStats {
  keyId: string;
  dailyUsage: { date: string; count: number }[];
  totalRequests: number;
  avgPerDay: number;
}

// API Key 列表
export function listDeveloperApiKeys(options: ApiKeyListOptions = {}): { keys: AdminApiKeyView[]; total: number } {
  const {
    status,
    userId,
    teamId,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (status === 'active') {
    whereClauses.push('dak.is_active = 1');
  } else if (status === 'inactive') {
    whereClauses.push('dak.is_active = 0');
  }

  if (userId) {
    whereClauses.push('dak.user_id = ?');
    params.push(userId);
  }

  if (teamId) {
    whereClauses.push('dak.team_id = ?');
    params.push(teamId);
  }

  if (search) {
    whereClauses.push('(dak.name LIKE ? OR u.email LIKE ? OR dak.key_prefix LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 排序映射
  const sortMap: Record<string, string> = {
    created_at: 'dak.created_at',
    usage: 'dak.usage_count',
    last_used: 'dak.last_used_at',
  };
  const orderBy = sortMap[sortBy] || 'dak.created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as total
    FROM developer_api_keys dak
    LEFT JOIN users u ON dak.user_id = u.id
    ${whereClause}
  `;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  // 获取 Key 列表
  const query = `
    SELECT 
      dak.id,
      dak.name,
      dak.key_prefix,
      dak.user_id,
      u.email as user_email,
      dak.team_id,
      t.name as team_name,
      dak.permissions,
      dak.rate_limit,
      dak.usage_limit,
      dak.usage_count,
      dak.last_used_at,
      dak.expires_at,
      dak.created_at,
      dak.is_active
    FROM developer_api_keys dak
    LEFT JOIN users u ON dak.user_id = u.id
    LEFT JOIN teams t ON dak.team_id = t.id
    ${whereClause}
    ORDER BY ${orderBy} ${order}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const keys: AdminApiKeyView[] = rows.map(row => ({
    id: row.id,
    name: row.name,
    prefix: row.key_prefix,
    userId: row.user_id,
    userEmail: row.user_email,
    teamId: row.team_id || undefined,
    teamName: row.team_name || undefined,
    permissions: JSON.parse(row.permissions || '[]'),
    rateLimit: row.rate_limit,
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at || null,
    expiresAt: row.expires_at || null,
    createdAt: row.created_at,
    isActive: row.is_active === 1,
  }));

  return { keys, total };
}

// API Key 详情
export function getApiKeyDetail(keyId: string): AdminApiKeyView | null {
  const row = db.prepare(`
    SELECT 
      dak.id,
      dak.name,
      dak.key_prefix,
      dak.user_id,
      u.email as user_email,
      dak.team_id,
      t.name as team_name,
      dak.permissions,
      dak.rate_limit,
      dak.usage_limit,
      dak.usage_count,
      dak.last_used_at,
      dak.expires_at,
      dak.created_at,
      dak.is_active
    FROM developer_api_keys dak
    LEFT JOIN users u ON dak.user_id = u.id
    LEFT JOIN teams t ON dak.team_id = t.id
    WHERE dak.id = ?
  `).get(keyId) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    prefix: row.key_prefix,
    userId: row.user_id,
    userEmail: row.user_email,
    teamId: row.team_id || undefined,
    teamName: row.team_name || undefined,
    permissions: JSON.parse(row.permissions || '[]'),
    rateLimit: row.rate_limit,
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at || null,
    expiresAt: row.expires_at || null,
    createdAt: row.created_at,
    isActive: row.is_active === 1,
  };
}

// 撤销 API Key
export function revokeApiKey(keyId: string, reason?: string): void {
  db.prepare(`
    UPDATE developer_api_keys SET is_active = 0 WHERE id = ?
  `).run(keyId);

  // 记录操作日志
  const key = db.prepare('SELECT user_id, team_id, name FROM developer_api_keys WHERE id = ?').get(keyId) as any;
  if (key) {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, team_id, action, resource, resource_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `audit-${Date.now()}`,
      key.user_id,
      key.team_id || null,
      'api_key_revoked',
      'developer_api_key',
      keyId,
      JSON.stringify({ name: key.name, reason: reason || 'Admin revoked' }),
      Date.now()
    );
  }
}

// 重新激活 API Key
export function reactivateApiKey(keyId: string): void {
  // 检查是否过期
  const key = db.prepare('SELECT expires_at FROM developer_api_keys WHERE id = ?').get(keyId) as any;
  if (key?.expires_at && key.expires_at < Date.now()) {
    throw new Error('Cannot reactivate expired API key');
  }

  db.prepare(`
    UPDATE developer_api_keys SET is_active = 1 WHERE id = ?
  `).run(keyId);

  // 记录操作日志
  const keyInfo = db.prepare('SELECT user_id, team_id, name FROM developer_api_keys WHERE id = ?').get(keyId) as any;
  if (keyInfo) {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, team_id, action, resource, resource_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `audit-${Date.now()}`,
      keyInfo.user_id,
      keyInfo.team_id || null,
      'api_key_reactivated',
      'developer_api_key',
      keyId,
      JSON.stringify({ name: keyInfo.name }),
      Date.now()
    );
  }
}

// 获取 API Key 使用统计
export function getApiKeyUsage(keyId: string, days: number = 7): ApiKeyUsageStats {
  const now = Date.now();
  const dailyUsage: { date: string; count: number }[] = [];

  // 获取每日使用量
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr: string = d.toISOString().split('T')[0] || '';
    const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

    // 查询该 Key 在当天的请求数
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM usage_logs
      WHERE key_id IN (
        SELECT id FROM shared_keys WHERE user_id = (SELECT user_id FROM developer_api_keys WHERE id = ?)
      )
      AND timestamp >= ? AND timestamp <= ?
    `).get(keyId, dayStart, dayEnd) as any;

    dailyUsage.push({
      date: dateStr,
      count: result?.count || 0,
    });
  }

  const totalRequests = dailyUsage.reduce((sum, d) => sum + d.count, 0);
  const avgPerDay = days > 0 ? Math.round(totalRequests / days) : 0;

  return {
    keyId,
    dailyUsage,
    totalRequests,
    avgPerDay,
  };
}

// 更新 API Key 设置
export function updateApiKeySettings(
  keyId: string,
  updates: {
    name?: string;
    permissions?: string[];
    rateLimit?: number;
    usageLimit?: number;
    expiresAt?: number;
  }
): void {
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.permissions !== undefined) {
    setClauses.push('permissions = ?');
    values.push(JSON.stringify(updates.permissions));
  }
  if (updates.rateLimit !== undefined) {
    setClauses.push('rate_limit = ?');
    values.push(updates.rateLimit);
  }
  if (updates.usageLimit !== undefined) {
    setClauses.push('usage_limit = ?');
    values.push(updates.usageLimit);
  }
  if (updates.expiresAt !== undefined) {
    setClauses.push('expires_at = ?');
    values.push(updates.expiresAt);
  }

  if (setClauses.length === 0) return;

  values.push(keyId);
  db.prepare(`UPDATE developer_api_keys SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

  // 记录操作日志
  const key = db.prepare('SELECT user_id, team_id, name FROM developer_api_keys WHERE id = ?').get(keyId) as any;
  if (key) {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, team_id, action, resource, resource_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `audit-${Date.now()}`,
      key.user_id,
      key.team_id || null,
      'api_key_updated',
      'developer_api_key',
      keyId,
      JSON.stringify({ name: key.name, updates }),
      Date.now()
    );
  }
}

// 批量撤销 API Key
export function bulkRevokeApiKeys(keyIds: string[], reason?: string): number {
  let count = 0;
  for (const keyId of keyIds) {
    try {
      revokeApiKey(keyId, reason);
      count++;
    } catch (e) {
      console.error(`Failed to revoke key ${keyId}:`, e);
    }
  }
  return count;
}
