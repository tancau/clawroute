import { z } from 'zod';
import type { Tool, ToolContext, ToolResult } from '../tools/types';
import { db } from '../db';
import crypto from 'crypto';

/**
 * 价格表（每百万 token，单位：美元）
 */
export const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  
  // Anthropic
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  
  // Google
  'gemini-pro': { input: 0.5, output: 1.5 },
  'gemini-ultra': { input: 10, output: 30 },
  
  // DeepSeek
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-coder': { input: 0.14, output: 0.28 },
  
  // 开源模型（假设价格）
  'llama-2-70b': { input: 0.7, output: 0.9 },
  'mixtral-8x7b': { input: 0.6, output: 0.6 },
  'qwen-72b': { input: 0.5, output: 0.5 },
  
  // 免费模型
  'free-tier': { input: 0, output: 0 },
};

/**
 * 分成比例
 */
export const COMMISSION_RATES: Record<string, number> = {
  free: 0.05,      // 免费池：5%
  paid: 0.50,      // 付费池：50%
  enterprise: 0.30, // 企业池：30%（自定义）
};

/**
 * 使用记录 Schema
 */
export const UsageLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  keyId: z.string().nullable(),
  requestId: z.string(),
  provider: z.string(),
  model: z.string(),
  intent: z.string().nullable(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
  savedCents: z.number().int().nonnegative(),
  creditsUsed: z.number().int().nonnegative(),
  createdAt: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type UsageLog = z.infer<typeof UsageLogSchema>;

/**
 * 记录使用输入
 */
export const LogUsageInput = z.object({
  userId: z.string(),
  keyId: z.string().optional(),
  requestId: z.string(),
  provider: z.string(),
  model: z.string(),
  intent: z.string().optional(),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  latencyMs: z.number().int().nonnegative().default(0),
  creditsUsed: z.number().int().nonnegative().default(0),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * 收益 Schema
 */
export const EarningSchema = z.object({
  id: z.string(),
  userId: z.string(),
  keyId: z.string(),
  period: z.string(),
  totalSavedCents: z.number().int().nonnegative(),
  commissionCents: z.number().int().nonnegative(),
  status: z.enum(['pending', 'paid']),
  paidAt: z.number().nullable(),
  createdAt: z.number(),
});

export type Earning = z.infer<typeof EarningSchema>;

/**
 * 计算成本（返回美分）
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] || PRICING['free-tier'] || { input: 0, output: 0 };
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  
  // 转换为美分
  return Math.round((inputCost + outputCost) * 100);
}

/**
 * 计算节省（对比付费模型）
 */
export function calculateSavings(
  usedModel: string,
  inputTokens: number,
  outputTokens: number,
  tier: 'free' | 'paid' | 'enterprise'
): number {
  // 免费模型没有节省
  if (tier === 'free') return 0;
  
  // 对比基准：GPT-4 价格
  const baselineCost = calculateCost('gpt-4', inputTokens, outputTokens);
  const actualCost = calculateCost(usedModel, inputTokens, outputTokens);
  
  return Math.max(0, baselineCost - actualCost);
}

/**
 * 计算分成
 */
export function calculateCommission(savedCents: number, tier: string): number {
  const rate = COMMISSION_RATES[tier] ?? COMMISSION_RATES.free ?? 0.05;
  return Math.round(savedCents * rate);
}

/**
 * 使用记录工具
 */
export const BillingTool: Tool<typeof LogUsageInput, UsageLog> = {
  name: 'billing',
  description: 'Usage tracking and billing: log usage, calculate costs and commissions',
  inputSchema: LogUsageInput,
  outputSchema: UsageLogSchema,

  isEnabled() {
    return true;
  },

  isConcurrencySafe() {
    return true;
  },

  isReadOnly() {
    return false;
  },

  isDestructive() {
    return false;
  },

  async call(input: z.infer<typeof LogUsageInput>, context: ToolContext): Promise<ToolResult<UsageLog>> {
    const now = Date.now();
    const id = crypto.randomUUID();

    // 计算成本
    const costCents = calculateCost(input.model, input.inputTokens, input.outputTokens);
    
    // 获取 Key tier（如果有）
    let tier = 'free';
    if (input.keyId) {
      const keyRow = db.prepare('SELECT tier FROM shared_keys WHERE id = ?').get(input.keyId) as any;
      if (keyRow) tier = keyRow.tier;
    }
    
    // 计算节省
    const savedCents = calculateSavings(input.model, input.inputTokens, input.outputTokens, tier as any);

    const stmt = db.prepare(`
      INSERT INTO usage_logs (
        id, user_id, key_id, request_id, provider, model, intent,
        input_tokens, output_tokens, latency_ms, cost_cents, saved_cents, credits_used,
        created_at, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.userId,
      input.keyId || null,
      input.requestId,
      input.provider,
      input.model,
      input.intent || null,
      input.inputTokens,
      input.outputTokens,
      input.latencyMs,
      costCents,
      savedCents,
      input.creditsUsed,
      now,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    // 如果有节省，更新收益
    if (savedCents > 0 && input.keyId) {
      await updateEarnings(input.keyId, savedCents, tier);
    }

    const log: UsageLog = {
      id,
      userId: input.userId,
      keyId: input.keyId || null,
      requestId: input.requestId,
      provider: input.provider,
      model: input.model,
      intent: input.intent || null,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      latencyMs: input.latencyMs,
      costCents,
      savedCents,
      creditsUsed: input.creditsUsed,
      createdAt: now,
      metadata: input.metadata,
    };

    return {
      data: log,
      metadata: { requestId: context.requestId },
    };
  },
};

/**
 * 更新收益记录
 */
async function updateEarnings(keyId: string, savedCents: number, tier: string): Promise<void> {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  // 获取 key 的 userId
  const keyRow = db.prepare('SELECT user_id FROM shared_keys WHERE id = ?').get(keyId) as any;
  if (!keyRow) return;
  
  const userId = keyRow.user_id;
  const commission = calculateCommission(savedCents, tier);
  
  // 尝试更新现有记录
  const updateStmt = db.prepare(`
    UPDATE earnings 
    SET total_saved_cents = total_saved_cents + ?, commission_cents = commission_cents + ?
    WHERE key_id = ? AND period = ?
  `);
  
  const result = updateStmt.run(savedCents, commission, keyId, period);
  
  // 如果没有更新任何行，插入新记录
  if (result.changes === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO earnings (id, user_id, key_id, period, total_saved_cents, commission_cents, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `);
    
    insertStmt.run(
      crypto.randomUUID(),
      userId,
      keyId,
      period,
      savedCents,
      commission,
      Date.now()
    );
  }
}

/**
 * 查询用户收益
 */
export function getUserEarnings(userId: string): { total: number; pending: number; paid: number } {
  const stmt = db.prepare(`
    SELECT 
      SUM(commission_cents) as total,
      SUM(CASE WHEN status = 'pending' THEN commission_cents ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'paid' THEN commission_cents ELSE 0 END) as paid
    FROM earnings
    WHERE user_id = ?
  `);
  
  const row = stmt.get(userId) as any;
  
  return {
    total: row?.total || 0,
    pending: row?.pending || 0,
    paid: row?.paid || 0,
  };
}

/**
 * 查询用户使用统计
 */
export function getUserUsageStats(userId: string, days: number = 30): {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  totalSaved: number;
  byModel: Record<string, { requests: number; tokens: number; cost: number }>;
} {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  
  const stmt = db.prepare(`
    SELECT 
      model,
      COUNT(*) as requests,
      SUM(input_tokens + output_tokens) as tokens,
      SUM(cost_cents) as cost
    FROM usage_logs
    WHERE user_id = ? AND created_at >= ?
    GROUP BY model
  `);
  
  const rows = stmt.all(userId, since) as any[];
  
  let totalRequests = 0;
  let totalTokens = 0;
  let totalCost = 0;
  const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};
  
  for (const row of rows) {
    totalRequests += row.requests;
    totalTokens += row.tokens;
    totalCost += row.cost;
    byModel[row.model] = {
      requests: row.requests,
      tokens: row.tokens,
      cost: row.cost,
    };
  }
  
  // 获取总节省
  const savedStmt = db.prepare(`
    SELECT SUM(saved_cents) as total_saved
    FROM usage_logs
    WHERE user_id = ? AND created_at >= ?
  `);
  const savedRow = savedStmt.get(userId, since) as any;
  const totalSaved = savedRow?.total_saved || 0;
  
  return {
    totalRequests,
    totalTokens,
    totalCost,
    totalSaved,
    byModel,
  };
}
