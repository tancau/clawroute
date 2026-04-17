/**
 * Admin Earnings Management Module
 * 收益管理模块
 */

import { db } from '../db';

export interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  totalUsers: number;
  pendingUsers: number;
}

export interface UserEarning {
  userId: string;
  userEmail: string;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  keyCount: number;
  requestCount: number;
  lastEarningAt: number | null;
}

export interface EarningPayout {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method: string;
  processedAt: number | null;
  createdAt: number;
}

// 获取收益汇总
export function getEarningsSummary(): EarningsSummary {
  const summary = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_earnings,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_earnings,
      COUNT(DISTINCT user_id) as total_users,
      COUNT(DISTINCT CASE WHEN status = 'pending' THEN user_id END) as pending_users
    FROM earnings
  `).get() as any;

  return {
    totalEarnings: summary?.total_earnings || 0,
    pendingEarnings: summary?.pending_earnings || 0,
    paidEarnings: summary?.paid_earnings || 0,
    totalUsers: summary?.total_users || 0,
    pendingUsers: summary?.pending_users || 0,
  };
}

// 获取用户收益列表
export function listUserEarnings(options: {
  status?: string;
  minAmount?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  offset?: number;
  limit?: number;
} = {}): { users: UserEarning[]; total: number } {
  const {
    status,
    minAmount,
    search,
    sortBy = 'total_earnings',
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

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 排序
  const sortMap: Record<string, string> = {
    total_earnings: 'total_earnings',
    pending_earnings: 'pending_earnings',
    paid_earnings: 'paid_earnings',
    last_earning: 'last_earning_at',
  };
  const orderBy = sortMap[sortBy] || 'total_earnings';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // 获取总数
  const countQuery = `
    SELECT COUNT(DISTINCT e.user_id) as total
    FROM earnings e
    JOIN users u ON e.user_id = u.id
    ${whereClause}
  `;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  // 获取列表
  const query = `
    SELECT 
      e.user_id,
      u.email as user_email,
      SUM(e.amount) as total_earnings,
      SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END) as pending_earnings,
      SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END) as paid_earnings,
      MAX(e.timestamp) as last_earning_at,
      COUNT(DISTINCT sk.id) as key_count,
      (SELECT COUNT(*) FROM usage_logs ul WHERE ul.user_id = e.user_id) as request_count
    FROM earnings e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN shared_keys sk ON e.key_id = sk.id
    ${whereClause}
    GROUP BY e.user_id
    HAVING total_earnings >= ?
    ORDER BY ${orderBy} ${order}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, minAmount || 0, limit, offset) as any[];

  const users: UserEarning[] = rows.map(row => ({
    userId: row.user_id,
    userEmail: row.user_email,
    totalEarnings: row.total_earnings || 0,
    pendingEarnings: row.pending_earnings || 0,
    paidEarnings: row.paid_earnings || 0,
    keyCount: row.key_count || 0,
    requestCount: row.request_count || 0,
    lastEarningAt: row.last_earning_at || null,
  }));

  return { users, total };
}

// 获取用户收益详情
export function getUserEarningsDetail(userId: string): {
  summary: UserEarning;
  byProvider: { provider: string; earnings: number; requests: number }[];
  history: { month: string; earnings: number }[];
} {
  // 汇总
  const summaryRow = db.prepare(`
    SELECT 
      e.user_id,
      u.email as user_email,
      SUM(e.amount) as total_earnings,
      SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END) as pending_earnings,
      SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END) as paid_earnings,
      MAX(e.timestamp) as last_earning_at,
      COUNT(DISTINCT sk.id) as key_count
    FROM earnings e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN shared_keys sk ON e.key_id = sk.id
    WHERE e.user_id = ?
    GROUP BY e.user_id
  `).get(userId) as any;

  const summary: UserEarning = {
    userId: summaryRow?.user_id || userId,
    userEmail: summaryRow?.user_email || '',
    totalEarnings: summaryRow?.total_earnings || 0,
    pendingEarnings: summaryRow?.pending_earnings || 0,
    paidEarnings: summaryRow?.paid_earnings || 0,
    keyCount: summaryRow?.key_count || 0,
    requestCount: 0,
    lastEarningAt: summaryRow?.last_earning_at || null,
  };

  // 按 Provider 分组
  const byProvider = db.prepare(`
    SELECT 
      sk.provider,
      SUM(e.amount) as earnings,
      COUNT(ul.id) as requests
    FROM earnings e
    LEFT JOIN shared_keys sk ON e.key_id = sk.id
    LEFT JOIN usage_logs ul ON sk.id = ul.key_id
    WHERE e.user_id = ?
    GROUP BY sk.provider
    ORDER BY earnings DESC
  `).all(userId) as any[];

  // 按月历史
  const history = db.prepare(`
    SELECT 
      strftime('%Y-%m', timestamp / 1000, 'unixepoch') as month,
      SUM(amount) as earnings
    FROM earnings
    WHERE user_id = ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).all(userId) as any[];

  return {
    summary,
    byProvider: byProvider.map(p => ({
      provider: p.provider || 'Unknown',
      earnings: p.earnings || 0,
      requests: p.requests || 0,
    })),
    history: history.map(h => ({
      month: h.month,
      earnings: h.earnings || 0,
    })),
  };
}

// 创建提现记录
export function createPayout(
  userId: string,
  amount: number,
  method: string = 'bank_transfer'
): EarningPayout {
  const id = `payout-${Date.now()}`;
  const now = Date.now();

  // 检查待发放金额
  const pending = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM earnings
    WHERE user_id = ? AND status = 'pending'
  `).get(userId) as any;

  if ((pending?.total || 0) < amount) {
    throw new Error('Insufficient pending earnings');
  }

  // 创建提现记录
  db.prepare(`
    INSERT INTO payouts (id, user_id, amount, status, method, created_at)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(id, userId, amount, method, now);

  // 更新收益状态
  db.prepare(`
    UPDATE earnings
    SET status = 'processing'
    WHERE user_id = ? AND status = 'pending'
    LIMIT (SELECT CAST(? AS INTEGER))
  `).run(userId, Math.ceil(amount));

  return {
    id,
    userId,
    userEmail: '',
    amount,
    status: 'pending',
    method,
    processedAt: null,
    createdAt: now,
  };
}

// 完成提现
export function completePayout(payoutId: string): void {
  const payout = db.prepare('SELECT * FROM payouts WHERE id = ?').get(payoutId) as any;
  if (!payout) throw new Error('Payout not found');

  const now = Date.now();

  // 更新提现状态
  db.prepare(`
    UPDATE payouts SET status = 'completed', processed_at = ? WHERE id = ?
  `).run(now, payoutId);

  // 更新收益状态
  db.prepare(`
    UPDATE earnings
    SET status = 'paid'
    WHERE user_id = ? AND status = 'processing'
    LIMIT (SELECT CAST(? AS INTEGER))
  `).run(payout.user_id, Math.ceil(payout.amount));

  // 记录日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, 'payout_completed', ?, ?)
  `).run(
    `audit-${Date.now()}`,
    payout.user_id,
    JSON.stringify({ payoutId, amount: payout.amount }),
    now
  );
}

// 获取提现列表
export function listPayouts(options: {
  status?: string;
  userId?: string;
  offset?: number;
  limit?: number;
} = {}): { payouts: EarningPayout[]; total: number } {
  const { status, userId, offset = 0, limit = 50 } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (status) {
    whereClauses.push('p.status = ?');
    params.push(status);
  }
  if (userId) {
    whereClauses.push('p.user_id = ?');
    params.push(userId);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM payouts p ${whereClause}`;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  const query = `
    SELECT 
      p.id,
      p.user_id,
      u.email as user_email,
      p.amount,
      p.status,
      p.method,
      p.processed_at,
      p.created_at
    FROM payouts p
    JOIN users u ON p.user_id = u.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  return {
    payouts: rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      amount: r.amount,
      status: r.status,
      method: r.method,
      processedAt: r.processed_at,
      createdAt: r.created_at,
    })),
    total,
  };
}
