/**
 * 用户使用追踪
 * 跟踪 API 调用次数，实现每日限制
 * 
 * 功能：
 * 1. 每日调用计数
 * 2. Tier-based 限制
 * 3. 使用统计
 */

import { sql } from '@vercel/postgres';

// ==================== 类型定义 ====================

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface MonthlyUsage {
  month: string; // YYYY-MM
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageStats {
  today: {
    calls: number;
    limit: number;
    remaining: number;
  };
  month: {
    calls: number;
    limit: number;
    remaining: number;
  };
}

// ==================== Tier 限制配置 ====================

const DAILY_LIMITS: Record<string, number> = {
  free: 100,        // 免费: 100次/天
  pro: 1000,        // Pro: 1000次/天
  team: 5000,       // Team: 5000次/天
  enterprise: -1,   // 企业: 无限制
};

const MONTHLY_LIMITS: Record<string, number> = {
  free: 2000,       // 免费: 2000次/月
  pro: 25000,       // Pro: 25000次/月
  team: 150000,     // Team: 150000次/月
  enterprise: -1,   // 企业: 无限制
};

// 默认限制
const DEFAULT_DAILY_LIMIT = 100;
const DEFAULT_MONTHLY_LIMIT = 2000;

// ==================== 数据库表管理 ====================

export async function ensureUsageTrackingTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date DATE NOT NULL,
      api_calls INTEGER DEFAULT 0,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      last_call TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, date)
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_usage_date ON user_usage(date)`;
  } catch {
    // 索引可能已存在
  }
}

// ==================== 使用追踪函数 ====================

/**
 * 记录 API 调用
 */
export async function recordApiCall(
  userId: string,
  inputTokens: number = 0,
  outputTokens: number = 0
): Promise<void> {
  await ensureUsageTrackingTable();
  
  const today = new Date().toISOString().split('T')[0];
  const id = `${userId}-${today}`;
  
  // 尝试更新现有记录
  const updateResult = await sql`
    UPDATE user_usage
    SET 
      api_calls = api_calls + 1,
      input_tokens = input_tokens + ${inputTokens},
      output_tokens = output_tokens + ${outputTokens},
      last_call = NOW()
    WHERE user_id = ${userId} AND date = ${today}
  `;
  
  // 如果没有更新任何行，插入新记录
  if (updateResult.rowCount === 0) {
    await sql`
      INSERT INTO user_usage (id, user_id, date, api_calls, input_tokens, output_tokens, last_call)
      VALUES (${id}, ${userId}, ${today}, 1, ${inputTokens}, ${outputTokens}, NOW())
      ON CONFLICT (user_id, date) DO UPDATE SET
        api_calls = user_usage.api_calls + 1,
        input_tokens = user_usage.input_tokens + ${inputTokens},
        output_tokens = user_usage.output_tokens + ${outputTokens},
        last_call = NOW()
    `;
  }
}

/**
 * 获取今日使用量
 */
export async function getTodayUsage(userId: string): Promise<DailyUsage> {
  await ensureUsageTrackingTable();
  
  const today = new Date().toISOString().split('T')[0] || new Date().toISOString().slice(0, 10);
  
  const result = await sql`
    SELECT api_calls, input_tokens, output_tokens
    FROM user_usage
    WHERE user_id = ${userId} AND date = ${today}
  `;
  
  if (result.rows.length === 0) {
    return {
      date: today,
      apiCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
  
  const row = result.rows[0]!;
  return {
    date: today,
    apiCalls: (row.api_calls as number) ?? 0,
    inputTokens: (row.input_tokens as number) ?? 0,
    outputTokens: (row.output_tokens as number) ?? 0,
  };
}

/**
 * 获取本月使用量
 */
export async function getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  await ensureUsageTrackingTable();
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = monthStart.toISOString().slice(0, 7) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  
  const result = await sql`
    SELECT 
      COALESCE(SUM(api_calls), 0) as api_calls,
      COALESCE(SUM(input_tokens), 0) as input_tokens,
      COALESCE(SUM(output_tokens), 0) as output_tokens
    FROM user_usage
    WHERE user_id = ${userId} 
      AND date >= ${monthStart.toISOString().split('T')[0]}
  `;
  
  const row = result.rows[0]!;
  return {
    month,
    apiCalls: (row.api_calls as number) ?? 0,
    inputTokens: (row.input_tokens as number) ?? 0,
    outputTokens: (row.output_tokens as number) ?? 0,
  };
}

/**
 * 检查每日限制
 * 
 * @returns true 如果未超过限制
 */
export async function checkDailyLimit(
  userId: string,
  tier: string = 'free'
): Promise<{ allowed: boolean; usage: number; limit: number }> {
  const limit = DAILY_LIMITS[tier] ?? DEFAULT_DAILY_LIMIT;
  
  // enterprise 无限制
  if (limit === -1) {
    const usage = await getTodayUsage(userId);
    return { allowed: true, usage: usage.apiCalls, limit: -1 };
  }
  
  const usage = await getTodayUsage(userId);
  return {
    allowed: usage.apiCalls < limit,
    usage: usage.apiCalls,
    limit,
  };
}

/**
 * 检查每月限制
 * 
 * @returns true 如果未超过限制
 */
export async function checkMonthlyLimit(
  userId: string,
  tier: string = 'free'
): Promise<{ allowed: boolean; usage: number; limit: number }> {
  const limit = MONTHLY_LIMITS[tier] ?? DEFAULT_MONTHLY_LIMIT;
  
  // enterprise 无限制
  if (limit === -1) {
    const usage = await getMonthlyUsage(userId);
    return { allowed: true, usage: usage.apiCalls, limit: -1 };
  }
  
  const usage = await getMonthlyUsage(userId);
  return {
    allowed: usage.apiCalls < limit,
    usage: usage.apiCalls,
    limit,
  };
}

/**
 * 获取使用统计
 */
export async function getUsageStats(
  userId: string,
  tier: string = 'free'
): Promise<UsageStats> {
  const [todayUsage, monthUsage] = await Promise.all([
    getTodayUsage(userId),
    getMonthlyUsage(userId),
  ]);
  
  const dailyLimit = DAILY_LIMITS[tier] ?? DEFAULT_DAILY_LIMIT;
  const monthlyLimit = MONTHLY_LIMITS[tier] ?? DEFAULT_MONTHLY_LIMIT;
  
  return {
    today: {
      calls: todayUsage.apiCalls,
      limit: dailyLimit,
      remaining: dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - todayUsage.apiCalls),
    },
    month: {
      calls: monthUsage.apiCalls,
      limit: monthlyLimit,
      remaining: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - monthUsage.apiCalls),
    },
  };
}

/**
 * 获取用户历史使用记录
 */
export async function getUsageHistory(
  userId: string,
  days: number = 30
): Promise<DailyUsage[]> {
  await ensureUsageTrackingTable();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  const result = await sql`
    SELECT date, api_calls, input_tokens, output_tokens
    FROM user_usage
    WHERE user_id = ${userId} AND date >= ${startDateStr}
    ORDER BY date DESC
  `;
  
  return result.rows.map(row => ({
    date: row.date as string,
    apiCalls: (row.api_calls as number) ?? 0,
    inputTokens: (row.input_tokens as number) ?? 0,
    outputTokens: (row.output_tokens as number) ?? 0,
  }));
}

/**
 * 重置用户每日使用量（管理员功能）
 */
export async function resetDailyUsage(userId: string): Promise<void> {
  await ensureUsageTrackingTable();
  
  const today = new Date().toISOString().split('T')[0];
  
  await sql`
    DELETE FROM user_usage
    WHERE user_id = ${userId} AND date = ${today}
  `;
}

/**
 * 获取 Tier 限制配置
 */
export function getTierLimits(tier: string): { daily: number; monthly: number } {
  return {
    daily: DAILY_LIMITS[tier] ?? DEFAULT_DAILY_LIMIT,
    monthly: MONTHLY_LIMITS[tier] ?? DEFAULT_MONTHLY_LIMIT,
  };
}
