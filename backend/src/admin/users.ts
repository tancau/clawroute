/**
 * Admin Users Management Module
 * 用户管理 API
 */

import { db } from '../db';

export interface AdminUserView {
  id: string;
  email: string;
  credits: number;
  createdAt: number;
  lastActiveAt: number | null;
  keyCount: number;
  requestCount: number;
  totalCost: number;
  status: 'active' | 'suspended' | 'banned';
}

export interface UserListOptions {
  search?: string;
  status?: string;
  sortBy?: 'created_at' | 'last_active' | 'requests' | 'cost';
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

// 用户列表
export function listUsers(options: UserListOptions = {}): { users: AdminUserView[]; total: number } {
  const {
    search,
    status,
    sortBy = 'created_at',
    sortOrder = 'desc',
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (search) {
    whereClauses.push('u.email LIKE ?');
    params.push(`%${search}%`);
  }

  if (status) {
    whereClauses.push('u.status = ?');
    params.push(status);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 排序映射
  const sortMap: Record<string, string> = {
    created_at: 'u.created_at',
    last_active: 'last_active',
    requests: 'request_count',
    cost: 'total_cost',
  };
  const orderBy = sortMap[sortBy] || 'u.created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // 获取总数
  const countQuery = `
    SELECT COUNT(DISTINCT u.id) as total
    FROM users u
    ${whereClause}
  `;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  // 获取用户列表
  const query = `
    SELECT 
      u.id,
      u.email,
      u.credits,
      u.created_at,
      u.status,
      MAX(ul.created_at) as last_active,
      COUNT(DISTINCT sk.id) as key_count,
      COUNT(ul.id) as request_count,
      COALESCE(SUM(ul.cost_cents), 0) as total_cost
    FROM users u
    LEFT JOIN shared_keys sk ON u.id = sk.user_id
    LEFT JOIN usage_logs ul ON u.id = ul.user_id
    ${whereClause}
    GROUP BY u.id
    ORDER BY ${orderBy} ${order}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const users: AdminUserView[] = rows.map(row => ({
    id: row.id,
    email: row.email,
    credits: row.credits,
    createdAt: row.created_at,
    lastActiveAt: row.last_active || null,
    keyCount: row.key_count,
    requestCount: row.request_count,
    totalCost: row.total_cost,
    status: row.status || 'active',
  }));

  return { users, total };
}

// 用户详情
export function getUserDetail(userId: string): AdminUserView | null {
  const row = db.prepare(`
    SELECT 
      u.id,
      u.email,
      u.credits,
      u.created_at,
      u.status,
      MAX(ul.created_at) as last_active,
      COUNT(DISTINCT sk.id) as key_count,
      COUNT(ul.id) as request_count,
      COALESCE(SUM(ul.cost_cents), 0) as total_cost
    FROM users u
    LEFT JOIN shared_keys sk ON u.id = sk.user_id
    LEFT JOIN usage_logs ul ON u.id = ul.user_id
    WHERE u.id = ?
    GROUP BY u.id
  `).get(userId) as any;

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    credits: row.credits,
    createdAt: row.created_at,
    lastActiveAt: row.last_active || null,
    keyCount: row.key_count,
    requestCount: row.request_count,
    totalCost: row.total_cost,
    status: row.status || 'active',
  };
}

// 调整用户额度
export function updateUserCredits(userId: string, amount: number, reason?: string): void {
  // 获取当前额度
  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId) as any;
  if (!user) throw new Error('User not found');

  const newCredits = Math.max(0, user.credits + amount);

  db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(newCredits, userId);

  // 记录操作日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    userId,
    'credits_adjusted',
    JSON.stringify({
      oldCredits: user.credits,
      adjustment: amount,
      newCredits,
      reason: reason || 'Admin adjustment',
    }),
    Date.now()
  );
}

// 封禁用户
export function suspendUser(userId: string, reason?: string): void {
  db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(userId);

  // 禁用用户的所有 Key
  db.prepare('UPDATE shared_keys SET is_active = 0 WHERE user_id = ?').run(userId);

  // 记录操作日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    userId,
    'user_suspended',
    JSON.stringify({ reason: reason || 'Admin suspended' }),
    Date.now()
  );
}

// 解封用户
export function unsuspendUser(userId: string): void {
  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(userId);

  // 重新启用用户的 Key
  db.prepare('UPDATE shared_keys SET is_active = 1, status = \'active\' WHERE user_id = ? AND status = \'active\'').run(userId);

  // 记录操作日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    userId,
    'user_unsuspended',
    JSON.stringify({}),
    Date.now()
  );
}

// 获取用户操作日志
export function getUserActivityLog(userId: string, limit: number = 50): any[] {
  return db.prepare(`
    SELECT id, user_id, action, details, timestamp
    FROM audit_logs
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(userId, limit) as any[];
}

// 获取用户的 Key 列表
export function getUserKeys(userId: string): any[] {
  return db.prepare(`
    SELECT 
      id, provider, key_preview, is_active, status, 
      total_calls as request_count, created_at
    FROM shared_keys
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as any[];
}
