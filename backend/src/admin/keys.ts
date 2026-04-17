/**
 * Admin Keys Management Module
 * Key 管理 API
 */

import { db } from '../db';

export interface AdminKeyView {
  id: string;
  provider: string;
  keyPreview: string;
  userId: string;
  userEmail: string;
  status: 'pending' | 'active' | 'disabled' | 'rejected';
  requestCount: number;
  totalCost: number;
  earnings: number;
  createdAt: number;
}

export interface KeyListOptions {
  status?: string;
  provider?: string;
  search?: string;
  sortBy?: 'created_at' | 'requests' | 'cost' | 'earnings';
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

// Key 列表
export function listKeys(options: KeyListOptions = {}): { keys: AdminKeyView[]; total: number } {
  const {
    status,
    provider,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (status) {
    whereClauses.push('sk.status = ?');
    params.push(status);
  }

  if (provider) {
    whereClauses.push('sk.provider = ?');
    params.push(provider);
  }

  if (search) {
    whereClauses.push('u.email LIKE ?');
    params.push(`%${search}%`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 排序映射
  const sortMap: Record<string, string> = {
    created_at: 'sk.created_at',
    requests: 'request_count',
    cost: 'total_cost',
    earnings: 'total_earnings',
  };
  const orderBy = sortMap[sortBy] || 'sk.created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as total
    FROM shared_keys sk
    LEFT JOIN users u ON sk.user_id = u.id
    ${whereClause}
  `;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  // 获取 Key 列表
  const query = `
    SELECT 
      sk.id,
      sk.provider,
      sk.key_preview,
      sk.user_id,
      u.email as user_email,
      sk.status,
      sk.is_active,
      sk.created_at,
      COUNT(ul.id) as request_count,
      COALESCE(SUM(ul.cost), 0) as total_cost,
      COALESCE(SUM(e.amount), 0) as total_earnings
    FROM shared_keys sk
    LEFT JOIN users u ON sk.user_id = u.id
    LEFT JOIN usage_logs ul ON sk.id = ul.key_id
    LEFT JOIN earnings e ON sk.id = e.key_id
    ${whereClause}
    GROUP BY sk.id
    ORDER BY ${orderBy} ${order}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const keys: AdminKeyView[] = rows.map(row => ({
    id: row.id,
    provider: row.provider,
    keyPreview: row.key_preview || `${row.provider}-****`,
    userId: row.user_id,
    userEmail: row.user_email,
    status: row.status || (row.is_active ? 'active' : 'disabled'),
    requestCount: row.request_count,
    totalCost: row.total_cost,
    earnings: row.total_earnings,
    createdAt: row.created_at,
  }));

  return { keys, total };
}

// Key 详情
export function getKeyDetail(keyId: string): AdminKeyView | null {
  const row = db.prepare(`
    SELECT 
      sk.id,
      sk.provider,
      sk.key_preview,
      sk.user_id,
      u.email as user_email,
      sk.status,
      sk.is_active,
      sk.created_at,
      COUNT(ul.id) as request_count,
      COALESCE(SUM(ul.cost), 0) as total_cost,
      COALESCE(SUM(e.amount), 0) as total_earnings
    FROM shared_keys sk
    LEFT JOIN users u ON sk.user_id = u.id
    LEFT JOIN usage_logs ul ON sk.id = ul.key_id
    LEFT JOIN earnings e ON sk.id = e.key_id
    WHERE sk.id = ?
    GROUP BY sk.id
  `).get(keyId) as any;

  if (!row) return null;

  return {
    id: row.id,
    provider: row.provider,
    keyPreview: row.key_preview || `${row.provider}-****`,
    userId: row.user_id,
    userEmail: row.user_email,
    status: row.status || (row.is_active ? 'active' : 'disabled'),
    requestCount: row.request_count,
    totalCost: row.total_cost,
    earnings: row.total_earnings,
    createdAt: row.created_at,
  };
}

// 批准 Key
export function approveKey(keyId: string): void {
  db.prepare(`
    UPDATE shared_keys 
    SET status = 'active', is_active = 1 
    WHERE id = ?
  `).run(keyId);

  // 记录操作日志
  const key = db.prepare('SELECT user_id, provider FROM shared_keys WHERE id = ?').get(keyId) as any;
  if (key) {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `audit-${Date.now()}`,
      key.user_id,
      'key_approved',
      JSON.stringify({ keyId, provider: key.provider }),
      Date.now()
    );
  }
}

// 拒绝 Key
export function rejectKey(keyId: string, reason?: string): void {
  db.prepare(`
    UPDATE shared_keys 
    SET status = 'rejected', is_active = 0 
    WHERE id = ?
  `).run(keyId);

  // 记录操作日志
  const key = db.prepare('SELECT user_id, provider FROM shared_keys WHERE id = ?').get(keyId) as any;
  if (key) {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `audit-${Date.now()}`,
      key.user_id,
      'key_rejected',
      JSON.stringify({ keyId, provider: key.provider, reason: reason || 'Rejected by admin' }),
      Date.now()
    );
  }
}

// 禁用 Key
export function disableKey(keyId: string, reason?: string): void {
  db.prepare(`
    UPDATE shared_keys 
    SET is_active = 0, status = 'disabled'
    WHERE id = ?
  `).run(keyId);

  // 记录操作日志
  const key = db.prepare('SELECT user_id, provider FROM shared_keys WHERE id = ?').get(keyId) as any;
  if (key) {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `audit-${Date.now()}`,
      key.user_id,
      'key_disabled',
      JSON.stringify({ keyId, provider: key.provider, reason: reason || 'Disabled by admin' }),
      Date.now()
    );
  }
}

// 启用 Key
export function enableKey(keyId: string): void {
  db.prepare(`
    UPDATE shared_keys 
    SET is_active = 1, status = 'active'
    WHERE id = ?
  `).run(keyId);

  // 记录操作日志
  const key = db.prepare('SELECT user_id, provider FROM shared_keys WHERE id = ?').get(keyId) as any;
  if (key) {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `audit-${Date.now()}`,
      key.user_id,
      'key_enabled',
      JSON.stringify({ keyId, provider: key.provider }),
      Date.now()
    );
  }
}

// 批量操作
export function bulkApproveKeys(keyIds: string[]): number {
  let count = 0;
  for (const keyId of keyIds) {
    try {
      approveKey(keyId);
      count++;
    } catch (e) {
      console.error(`Failed to approve key ${keyId}:`, e);
    }
  }
  return count;
}

export function bulkRejectKeys(keyIds: string[], reason?: string): number {
  let count = 0;
  for (const keyId of keyIds) {
    try {
      rejectKey(keyId, reason);
      count++;
    } catch (e) {
      console.error(`Failed to reject key ${keyId}:`, e);
    }
  }
  return count;
}

export function bulkDisableKeys(keyIds: string[], reason?: string): number {
  let count = 0;
  for (const keyId of keyIds) {
    try {
      disableKey(keyId, reason);
      count++;
    } catch (e) {
      console.error(`Failed to disable key ${keyId}:`, e);
    }
  }
  return count;
}

// 获取 Key 使用统计
export function getKeyUsageStats(keyId: string, days: number = 7): any[] {
  const now = Date.now();
  const stats: any[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();

    const result = db.prepare(`
      SELECT COUNT(*) as requests, SUM(cost) as cost
      FROM usage_logs
      WHERE key_id = ? AND timestamp >= ? AND timestamp <= ?
    `).get(keyId, dayStart, dayEnd) as any;

    stats.push({
      date: dateStr,
      requests: result?.requests || 0,
      cost: result?.cost || 0,
    });
  }

  return stats;
}
