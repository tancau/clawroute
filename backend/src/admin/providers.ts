/**
 * Admin Providers Management Module
 * Provider 管理模块
 */

import { db } from '../db';

export interface ProviderStatus {
  provider: string;
  totalKeys: number;
  activeKeys: number;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  totalCost: number;
  lastUsed: number | null;
}

export interface ProviderKey {
  id: string;
  provider: string;
  keyPreview: string;
  userId: string;
  userEmail: string;
  status: string;
  requestCount: number;
  errorCount: number;
  totalCost: number;
  earnings: number;
  lastUsed: number | null;
  createdAt: number;
}

// 获取所有 Provider 状态
export function getProviderStats(): ProviderStatus[] {
  const providers = db.prepare(`
    SELECT 
      sk.provider,
      COUNT(DISTINCT sk.id) as total_keys,
      COUNT(DISTINCT CASE WHEN sk.is_active = 1 THEN sk.id END) as active_keys,
      COUNT(ul.id) as total_requests,
      AVG(ul.latency_ms) as avg_latency,
      SUM(ul.cost) as total_cost,
      MAX(ul.timestamp) as last_used,
      SUM(CASE WHEN ul.error IS NULL THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(COUNT(ul.id), 0) as success_rate
    FROM shared_keys sk
    LEFT JOIN usage_logs ul ON sk.id = ul.key_id
    GROUP BY sk.provider
    ORDER BY total_requests DESC
  `).all() as any[];

  return providers.map(p => ({
    provider: p.provider,
    totalKeys: p.total_keys || 0,
    activeKeys: p.active_keys || 0,
    totalRequests: p.total_requests || 0,
    successRate: p.success_rate || 0,
    avgLatency: p.avg_latency || 0,
    totalCost: p.total_cost || 0,
    lastUsed: p.last_used || null,
  }));
}

// 获取 Provider 详情
export function getProviderDetail(provider: string): {
  stats: ProviderStatus;
  keys: ProviderKey[];
} {
  // Provider 统计
  const statsRow = db.prepare(`
    SELECT 
      sk.provider,
      COUNT(DISTINCT sk.id) as total_keys,
      COUNT(DISTINCT CASE WHEN sk.is_active = 1 THEN sk.id END) as active_keys,
      COUNT(ul.id) as total_requests,
      AVG(ul.latency_ms) as avg_latency,
      SUM(ul.cost) as total_cost,
      MAX(ul.timestamp) as last_used,
      SUM(CASE WHEN ul.error IS NULL THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(COUNT(ul.id), 0) as success_rate
    FROM shared_keys sk
    LEFT JOIN usage_logs ul ON sk.id = ul.key_id
    WHERE sk.provider = ?
    GROUP BY sk.provider
  `).get(provider) as any;

  const stats: ProviderStatus = {
    provider: statsRow?.provider || provider,
    totalKeys: statsRow?.total_keys || 0,
    activeKeys: statsRow?.active_keys || 0,
    totalRequests: statsRow?.total_requests || 0,
    successRate: statsRow?.success_rate || 0,
    avgLatency: statsRow?.avg_latency || 0,
    totalCost: statsRow?.total_cost || 0,
    lastUsed: statsRow?.last_used || null,
  };

  // Provider 下的所有 Key
  const keys = db.prepare(`
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
      SUM(CASE WHEN ul.error IS NOT NULL THEN 1 ELSE 0 END) as error_count,
      COALESCE(SUM(ul.cost), 0) as total_cost,
      COALESCE(SUM(e.amount), 0) as earnings,
      MAX(ul.timestamp) as last_used
    FROM shared_keys sk
    LEFT JOIN users u ON sk.user_id = u.id
    LEFT JOIN usage_logs ul ON sk.id = ul.key_id
    LEFT JOIN earnings e ON sk.id = e.key_id
    WHERE sk.provider = ?
    GROUP BY sk.id
    ORDER BY request_count DESC
  `).all(provider) as any[];

  return {
    stats,
    keys: keys.map(k => ({
      id: k.id,
      provider: k.provider,
      keyPreview: k.key_preview || `${k.provider}-****`,
      userId: k.user_id,
      userEmail: k.user_email,
      status: k.status || (k.is_active ? 'active' : 'disabled'),
      requestCount: k.request_count || 0,
      errorCount: k.error_count || 0,
      totalCost: k.total_cost || 0,
      earnings: k.earnings || 0,
      lastUsed: k.last_used || null,
      createdAt: k.created_at,
    })),
  };
}

// 获取 Provider 使用趋势
export function getProviderTrend(provider: string, days: number = 7): {
  date: string;
  requests: number;
  cost: number;
  errors: number;
}[] {
  const trend: any[] = [];
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();

    const result = db.prepare(`
      SELECT 
        COUNT(*) as requests,
        SUM(cost) as cost,
        SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors
      FROM usage_logs ul
      JOIN shared_keys sk ON ul.key_id = sk.id
      WHERE sk.provider = ? AND ul.timestamp >= ? AND ul.timestamp <= ?
    `).get(provider, dayStart, dayEnd) as any;

    trend.push({
      date: dateStr,
      requests: result?.requests || 0,
      cost: result?.cost || 0,
      errors: result?.errors || 0,
    });
  }

  return trend;
}

// 禁用 Provider 下所有 Key
export function disableProviderKeys(provider: string, reason?: string): number {
  const result = db.prepare(`
    UPDATE shared_keys 
    SET is_active = 0, status = 'disabled'
    WHERE provider = ? AND is_active = 1
  `).run(provider);

  // 记录操作日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'system',
    'provider_disabled',
    JSON.stringify({ provider, reason, keysDisabled: result.changes }),
    Date.now()
  );

  return result.changes;
}

// 启用 Provider 下所有 Key
export function enableProviderKeys(provider: string): number {
  const result = db.prepare(`
    UPDATE shared_keys 
    SET is_active = 1, status = 'active'
    WHERE provider = ? AND status = 'active'
  `).run(provider);

  return result.changes;
}
