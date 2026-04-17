/**
 * 使用统计追踪模块
 */

import { db } from '../db';

export interface UsageRecord {
  id: string;
  userId: string;
  requestId: string;
  provider: string;
  model: string;
  intent: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  savedCents: number;
  timestamp: number;
}

export interface UserStats {
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
  totalSavedCents: number;
  byProvider: Record<string, { requests: number; tokens: number; costCents: number }>;
  byIntent: Record<string, { requests: number; tokens: number; costCents: number }>;
}

/**
 * 记录使用数据
 */
export function recordUsage(record: UsageRecord): void {
  const stmt = db.prepare(`
    INSERT INTO usage_stats 
    (id, user_id, request_id, provider, model, intent, input_tokens, output_tokens, cost_cents, saved_cents, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    record.id,
    record.userId,
    record.requestId,
    record.provider,
    record.model,
    record.intent,
    record.inputTokens,
    record.outputTokens,
    record.costCents,
    record.savedCents,
    record.timestamp
  );
}

/**
 * 获取用户统计（最近 N 天）
 */
export function getUserStats(userId: string, days: number = 30): UserStats {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  // 总体统计
  const totalStmt = db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(input_tokens + output_tokens) as total_tokens,
      SUM(cost_cents) as total_cost_cents,
      SUM(saved_cents) as total_saved_cents
    FROM usage_stats
    WHERE user_id = ? AND timestamp >= ?
  `);

  const total = totalStmt.get(userId, since) as any;

  // 按 provider 分组
  const providerStmt = db.prepare(`
    SELECT 
      provider,
      COUNT(*) as requests,
      SUM(input_tokens + output_tokens) as tokens,
      SUM(cost_cents) as cost_cents
    FROM usage_stats
    WHERE user_id = ? AND timestamp >= ?
    GROUP BY provider
  `);

  const providerRows = providerStmt.all(userId, since) as any[];
  const byProvider: Record<string, { requests: number; tokens: number; costCents: number }> = {};
  
  for (const row of providerRows) {
    byProvider[row.provider] = {
      requests: row.requests,
      tokens: row.tokens || 0,
      costCents: row.cost_cents || 0,
    };
  }

  // 按 intent 分组
  const intentStmt = db.prepare(`
    SELECT 
      intent,
      COUNT(*) as requests,
      SUM(input_tokens + output_tokens) as tokens,
      SUM(cost_cents) as cost_cents
    FROM usage_stats
    WHERE user_id = ? AND timestamp >= ?
    GROUP BY intent
  `);

  const intentRows = intentStmt.all(userId, since) as any[];
  const byIntent: Record<string, { requests: number; tokens: number; costCents: number }> = {};
  
  for (const row of intentRows) {
    byIntent[row.intent] = {
      requests: row.requests,
      tokens: row.tokens || 0,
      costCents: row.cost_cents || 0,
    };
  }

  return {
    totalRequests: total?.total_requests || 0,
    totalTokens: total?.total_tokens || 0,
    totalCostCents: total?.total_cost_cents || 0,
    totalSavedCents: total?.total_saved_cents || 0,
    byProvider,
    byIntent,
  };
}

/**
 * 获取聚合统计（简化版）
 */
export function getAggregatedStats(userId: string): {
  daily: Array<{ date: string; requests: number; costCents: number; savedCents: number }>;
} {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const stmt = db.prepare(`
    SELECT 
      date(timestamp / 1000, 'unixepoch') as date,
      COUNT(*) as requests,
      SUM(cost_cents) as cost_cents,
      SUM(saved_cents) as saved_cents
    FROM usage_stats
    WHERE user_id = ? AND timestamp >= ?
    GROUP BY date
    ORDER BY date DESC
  `);

  const rows = stmt.all(userId, since) as any[];

  return {
    daily: rows.map(row => ({
      date: row.date,
      requests: row.requests,
      costCents: row.cost_cents || 0,
      savedCents: row.saved_cents || 0,
    })),
  };
}
