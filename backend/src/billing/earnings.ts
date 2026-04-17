/**
 * 收益分成系统 - Phase 2
 * 
 * 提供收益计算、分配、汇总功能
 * 支持按 tier (free/paid/enterprise) 分层分成
 */

import { db } from '../db';
import crypto from 'crypto';
import { COMMISSION_RATES, calculateCost, calculateCommission } from '../billing';

// ==================== Types ====================

export interface EarningRule {
  provider: string;
  tier: 'free' | 'paid' | 'enterprise';
  sharePercent: number; // 5 | 50 | 自定义
}

export interface EarningRecord {
  id: string;
  userId: string;
  keyId: string;
  provider: string;
  model: string;
  usageTokens: number;
  costCents: number;
  earningCents: number;
  tier: string;
  period: string; // YYYY-MM
  createdAt: number;
}

export interface EarningSummary {
  userId: string;
  totalEarningsCents: number;
  currentPeriodEarningsCents: number;
  pendingEarningsCents: number;
  lastUpdated: number;
}

export interface EarningHistoryEntry {
  period: string;
  provider: string;
  totalEarningCents: number;
  totalUsageTokens: number;
  totalCalls: number;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  amountCents: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: number;
  processedAt: number | null;
}

// ==================== Earning Rules ====================

const DEFAULT_EARNING_RULES: EarningRule[] = [
  { provider: '*', tier: 'free', sharePercent: 5 },
  { provider: '*', tier: 'paid', sharePercent: 50 },
  { provider: '*', tier: 'enterprise', sharePercent: 30 },
];

/**
 * 获取分成比例
 */
export function getEarningSharePercent(provider: string, tier: string): number {
  // 先查找特定 provider 规则
  const specificRule = DEFAULT_EARNING_RULES.find(
    r => r.provider === provider && r.tier === tier
  );
  if (specificRule) return specificRule.sharePercent;

  // 回退到通用规则
  const genericRule = DEFAULT_EARNING_RULES.find(
    r => r.provider === '*' && r.tier === tier
  );
  if (genericRule) return genericRule.sharePercent;

  // 默认 5%
  return 5;
}

// ==================== Core Functions ====================

/**
 * 计算单次请求的收益
 * @param model 模型名称
 * @param inputTokens 输入 token 数
 * @param outputTokens 输出 token 数
 * @param keyContributor Key 贡献者信息
 */
export function calculateEarning(
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  },
  keyContributor: {
    keyId: string;
    userId: string;
    provider: string;
    tier: string;
  }
): { costCents: number; earningCents: number; sharePercent: number } {
  const costCents = calculateCost(usage.model, usage.inputTokens, usage.outputTokens);
  const sharePercent = getEarningSharePercent(keyContributor.provider, keyContributor.tier);
  const earningCents = Math.round(costCents * sharePercent / 100);

  return { costCents, earningCents, sharePercent };
}

/**
 * 分配收益 - 将某个周期内的使用日志汇总并写入收益记录
 * @param userId 用户 ID
 * @param period 周期 (YYYY-MM)
 */
export function distributeEarnings(userId: string, period: string): number {
  // 查找该用户在该周期的所有使用记录，关联 shared_keys
  const usageRows = db.prepare(`
    SELECT 
      ul.key_id,
      ul.provider,
      ul.model,
      SUM(ul.input_tokens + ul.output_tokens) as total_tokens,
      SUM(ul.cost_cents) as total_cost_cents,
      sk.tier
    FROM usage_logs ul
    JOIN shared_keys sk ON ul.key_id = sk.id
    WHERE sk.user_id = ? AND ul.key_id IS NOT NULL
    AND ul.created_at >= ? AND ul.created_at < ?
    GROUP BY ul.key_id, ul.model
  `).all(
    userId,
    getPeriodStart(period),
    getPeriodEnd(period)
  ) as any[];

  let totalDistributed = 0;

  const insertStmt = db.prepare(`
    INSERT INTO earning_records (
      id, user_id, key_id, provider, model, usage_tokens,
      cost_cents, earning_cents, tier, period, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of usageRows) {
    const sharePercent = getEarningSharePercent(row.provider, row.tier);
    const earningCents = Math.round(row.total_cost_cents * sharePercent / 100);

    if (earningCents > 0) {
      insertStmt.run(
        crypto.randomUUID(),
        userId,
        row.key_id,
        row.provider,
        row.model,
        row.total_tokens,
        row.total_cost_cents,
        earningCents,
        row.tier,
        period,
        Date.now()
      );
      totalDistributed += earningCents;
    }
  }

  // 更新 earning_summary
  updateEarningSummary(userId, period);

  return totalDistributed;
}

/**
 * 获取用户收益汇总
 */
export function getUserEarningsSummary(userId: string): EarningSummary {
  const row = db.prepare(`
    SELECT 
      COALESCE(SUM(earning_cents), 0) as total_earnings_cents,
      COALESCE(SUM(CASE WHEN period = ? THEN earning_cents ELSE 0 END), 0) as current_period_earnings_cents,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN earning_cents ELSE 0 END), 0) as pending_earnings_cents,
      MAX(created_at) as last_updated
    FROM earning_records
    WHERE user_id = ?
  `).get(getCurrentPeriod(), userId) as any;

  return {
    userId,
    totalEarningsCents: row?.total_earnings_cents || 0,
    currentPeriodEarningsCents: row?.current_period_earnings_cents || 0,
    pendingEarningsCents: row?.pending_earnings_cents || 0,
    lastUpdated: row?.last_updated || 0,
  };
}

/**
 * 获取收益历史 - 按周期和 Provider 分组
 */
export function getEarningsHistory(
  userId: string,
  limit: number = 12
): EarningHistoryEntry[] {
  const rows = db.prepare(`
    SELECT 
      period,
      provider,
      SUM(earning_cents) as total_earning_cents,
      SUM(usage_tokens) as total_usage_tokens,
      COUNT(*) as total_calls
    FROM earning_records
    WHERE user_id = ?
    GROUP BY period, provider
    ORDER BY period DESC, provider
    LIMIT ?
  `).all(userId, limit) as any[];

  return rows.map(row => ({
    period: row.period,
    provider: row.provider,
    totalEarningCents: row.total_earning_cents || 0,
    totalUsageTokens: row.total_usage_tokens || 0,
    totalCalls: row.total_calls || 0,
  }));
}

/**
 * 获取按 Provider 分组的收益
 */
export function getEarningsByProvider(userId: string): Record<string, {
  totalEarningCents: number;
  totalUsageTokens: number;
  totalCalls: number;
}> {
  const rows = db.prepare(`
    SELECT 
      provider,
      SUM(earning_cents) as total_earning_cents,
      SUM(usage_tokens) as total_usage_tokens,
      COUNT(*) as total_calls
    FROM earning_records
    WHERE user_id = ?
    GROUP BY provider
  `).all(userId) as any[];

  const result: Record<string, { totalEarningCents: number; totalUsageTokens: number; totalCalls: number }> = {};
  for (const row of rows) {
    result[row.provider] = {
      totalEarningCents: row.total_earning_cents || 0,
      totalUsageTokens: row.total_usage_tokens || 0,
      totalCalls: row.total_calls || 0,
    };
  }
  return result;
}

/**
 * 获取收益趋势 - 按周期汇总
 */
export function getEarningsTrend(userId: string, months: number = 6): Array<{
  period: string;
  totalEarningCents: number;
}> {
  const rows = db.prepare(`
    SELECT 
      period,
      SUM(earning_cents) as total_earning_cents
    FROM earning_records
    WHERE user_id = ?
    GROUP BY period
    ORDER BY period DESC
    LIMIT ?
  `).all(userId, months) as any[];

  return rows.map(row => ({
    period: row.period,
    totalEarningCents: row.total_earning_cents || 0,
  }));
}

/**
 * 提现申请
 */
export function requestWithdraw(userId: string, amountCents: number): WithdrawRequest {
  const summary = getUserEarningsSummary(userId);

  if (amountCents > summary.pendingEarningsCents) {
    throw new Error(`Insufficient pending earnings. Available: ${summary.pendingEarningsCents} cents, requested: ${amountCents} cents`);
  }

  if (amountCents < 1000) { // 最小提现 $10.00
    throw new Error('Minimum withdrawal amount is $10.00 (1000 cents)');
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO withdraw_requests (id, user_id, amount_cents, status, created_at, processed_at)
    VALUES (?, ?, ?, 'pending', ?, NULL)
  `).run(id, userId, amountCents, now);

  return {
    id,
    userId,
    amountCents,
    status: 'pending',
    createdAt: now,
    processedAt: null,
  };
}

// ==================== Helper Functions ====================

function getCurrentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function getPeriodStart(period: string): number {
  const parts = period.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  if (year === undefined || month === undefined || isNaN(year) || isNaN(month)) return Date.now();
  return new Date(year, month - 1, 1).getTime();
}

function getPeriodEnd(period: string): number {
  const parts = period.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  if (year === undefined || month === undefined || isNaN(year) || isNaN(month)) return Date.now();
  return new Date(year, month, 1).getTime(); // next month 1st
}

function updateEarningSummary(userId: string, period: string): void {
  const now = Date.now();

  const existing = db.prepare(`
    SELECT user_id FROM earning_summary WHERE user_id = ?
  `).get(userId) as any;

  if (existing) {
    db.prepare(`
      UPDATE earning_summary
      SET total_earnings_cents = (
          SELECT COALESCE(SUM(earning_cents), 0) FROM earning_records WHERE user_id = ?
        ),
        current_period_earnings_cents = (
          SELECT COALESCE(SUM(earning_cents), 0) FROM earning_records WHERE user_id = ? AND period = ?
        ),
        pending_earnings_cents = (
          SELECT COALESCE(SUM(earning_cents), 0) FROM earning_records WHERE user_id = ? AND status = 'pending'
        ),
        last_updated = ?
      WHERE user_id = ?
    `).run(userId, userId, period, userId, now, userId);
  } else {
    const totalEarnings = db.prepare(`
      SELECT COALESCE(SUM(earning_cents), 0) as total FROM earning_records WHERE user_id = ?
    `).get(userId) as any;

    const currentPeriodEarnings = db.prepare(`
      SELECT COALESCE(SUM(earning_cents), 0) as total FROM earning_records WHERE user_id = ? AND period = ?
    `).get(userId, period) as any;

    const pendingEarnings = db.prepare(`
      SELECT COALESCE(SUM(earning_cents), 0) as total FROM earning_records WHERE user_id = ? AND status = 'pending'
    `).get(userId) as any;

    db.prepare(`
      INSERT INTO earning_summary (user_id, total_earnings_cents, current_period_earnings_cents, pending_earnings_cents, last_updated)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      totalEarnings?.total || 0,
      currentPeriodEarnings?.total || 0,
      pendingEarnings?.total || 0,
      now
    );
  }
}
