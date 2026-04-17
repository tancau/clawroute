/**
 * Admin Statistics Module
 * 管理后台统计 API
 */

import { db } from '../db';

export interface AdminStats {
  users: {
    total: number;
    active: number;
    newToday: number;
  };
  keys: {
    total: number;
    active: number;
    pending: number;
  };
  usage: {
    totalRequests: number;
    todayRequests: number;
    totalCost: number;
    todayCost: number;
  };
}

export interface ActivityItem {
  type: 'user_registered' | 'key_added' | 'request' | 'earning';
  description: string;
  timestamp: number;
  userId?: string;
  userEmail?: string;
}

// 获取管理仪表盘统计
export function getAdminStats(): AdminStats {
  const now = Date.now();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // 用户统计
  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
  const activeUsers = (db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count 
    FROM usage_logs 
    WHERE timestamp > ?
  `).get(weekAgo) as any)?.count || 0;
  const newToday = (db.prepare(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE created_at > ?
  `).get(todayStart) as any)?.count || 0;

  // Key 统计
  const totalKeys = (db.prepare('SELECT COUNT(*) as count FROM shared_keys').get() as any)?.count || 0;
  const activeKeys = (db.prepare(`
    SELECT COUNT(*) as count 
    FROM shared_keys 
    WHERE is_active = 1
  `).get() as any)?.count || 0;
  const pendingKeys = (db.prepare(`
    SELECT COUNT(*) as count 
    FROM shared_keys 
    WHERE status = 'pending'
  `).get() as any)?.count || 0;

  // 使用统计
  const totalRequests = (db.prepare('SELECT COUNT(*) as count FROM usage_logs').get() as any)?.count || 0;
  const todayRequests = (db.prepare(`
    SELECT COUNT(*) as count 
    FROM usage_logs 
    WHERE timestamp > ?
  `).get(todayStart) as any)?.count || 0;
  
  const totalCost = (db.prepare(`
    SELECT SUM(cost) as total 
    FROM usage_logs
  `).get() as any)?.total || 0;
  const todayCost = (db.prepare(`
    SELECT SUM(cost) as total 
    FROM usage_logs 
    WHERE timestamp > ?
  `).get(todayStart) as any)?.total || 0;

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      newToday,
    },
    keys: {
      total: totalKeys,
      active: activeKeys,
      pending: pendingKeys,
    },
    usage: {
      totalRequests,
      todayRequests,
      totalCost,
      todayCost,
    },
  };
}

// 获取最近活动
export function getRecentActivity(limit: number = 20): ActivityItem[] {
  const activities: ActivityItem[] = [];

  // 最近注册用户
  const recentUsers = db.prepare(`
    SELECT id, email, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit / 2) as any[];

  for (const user of recentUsers) {
    activities.push({
      type: 'user_registered',
      description: `新用户注册: ${user.email}`,
      timestamp: user.created_at,
      userId: user.id,
      userEmail: user.email,
    });
  }

  // 最近添加的 Key
  const recentKeys = db.prepare(`
    SELECT sk.id, sk.provider, sk.created_at, u.email as user_email
    FROM shared_keys sk
    JOIN users u ON sk.user_id = u.id
    ORDER BY sk.created_at DESC
    LIMIT ?
  `).all(limit / 2) as any[];

  for (const key of recentKeys) {
    activities.push({
      type: 'key_added',
      description: `新 Key 添加: ${key.provider} (${key.user_email})`,
      timestamp: key.created_at,
      userEmail: key.user_email,
    });
  }

  // 按时间排序
  return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

// 获取使用趋势
export function getUsageTrend(days: number = 7): { date: string; requests: number; cost: number }[] {
  const trend: { date: string; requests: number; cost: number }[] = [];
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0] || '';
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();

    const result = db.prepare(`
      SELECT COUNT(*) as requests, SUM(cost) as cost
      FROM usage_logs
      WHERE timestamp >= ? AND timestamp <= ?
    `).get(dayStart, dayEnd) as any;

    trend.push({
      date: dateStr,
      requests: result?.requests || 0,
      cost: result?.cost || 0,
    });
  }

  return trend;
}

// 获取热门模型
export function getTopModels(limit: number = 10): { model: string; count: number; cost: number }[] {
  return db.prepare(`
    SELECT 
      model as model,
      COUNT(*) as count,
      SUM(cost) as cost
    FROM usage_logs
    WHERE model IS NOT NULL
    GROUP BY model
    ORDER BY count DESC
    LIMIT ?
  `).all(limit) as any[];
}

// 获取 Provider 使用情况
export function getProviderStats(): { provider: string; requests: number; cost: number; errors: number }[] {
  return db.prepare(`
    SELECT 
      provider,
      COUNT(*) as requests,
      SUM(cost) as cost,
      SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors
    FROM usage_logs
    GROUP BY provider
    ORDER BY requests DESC
  `).all() as any[];
}
