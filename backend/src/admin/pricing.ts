/**
 * Admin Pricing Management Module
 * 定价管理模块
 */

import { db } from '../db';

export interface ModelPricing {
  model: string;
  provider: string;
  inputPrice: number;  // per 1M tokens
  outputPrice: number; // per 1M tokens
  enabled: boolean;
  updatedAt: number;
}

export interface CommissionRate {
  tier: 'free' | 'paid' | 'enterprise';
  rate: number;  // percentage (0-100)
  updatedAt: number;
}

// 默认定价
const DEFAULT_PRICING: Record<string, { input: number; output: number; provider: string }> = {
  'gpt-4o': { input: 2.5, output: 10, provider: 'openai' },
  'gpt-4o-mini': { input: 0.15, output: 0.6, provider: 'openai' },
  'gpt-4-turbo': { input: 10, output: 30, provider: 'openai' },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5, provider: 'openai' },
  'claude-3-opus': { input: 15, output: 75, provider: 'anthropic' },
  'claude-3-sonnet': { input: 3, output: 15, provider: 'anthropic' },
  'claude-3-haiku': { input: 0.25, output: 1.25, provider: 'anthropic' },
  'gemini-1.5-pro': { input: 3.5, output: 10.5, provider: 'google' },
  'gemini-1.5-flash': { input: 0.075, output: 0.3, provider: 'google' },
};

// 默认分成比例
const DEFAULT_COMMISSION: Record<string, number> = {
  free: 30,
  paid: 50,
  enterprise: 70,
};

// 初始化定价表
export function initPricingTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_pricing (
      model TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      input_price REAL NOT NULL,
      output_price REAL NOT NULL,
      enabled INTEGER DEFAULT 1,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commission_rates (
      tier TEXT PRIMARY KEY,
      rate REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 初始化默认定价
  const now = Date.now();
  const insertPricing = db.prepare(`
    INSERT OR IGNORE INTO model_pricing (model, provider, input_price, output_price, enabled, updated_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `);

  for (const [model, pricing] of Object.entries(DEFAULT_PRICING)) {
    insertPricing.run(model, pricing.provider, pricing.input, pricing.output, now);
  }

  // 初始化默认分成
  const insertCommission = db.prepare(`
    INSERT OR IGNORE INTO commission_rates (tier, rate, updated_at)
    VALUES (?, ?, ?)
  `);

  for (const [tier, rate] of Object.entries(DEFAULT_COMMISSION)) {
    insertCommission.run(tier, rate, now);
  }
}

// 获取所有模型定价
export function getModelPricing(): ModelPricing[] {
  const rows = db.prepare(`
    SELECT model, provider, input_price, output_price, enabled, updated_at
    FROM model_pricing
    ORDER BY provider, model
  `).all() as any[];

  return rows.map(row => ({
    model: row.model,
    provider: row.provider,
    inputPrice: row.input_price,
    outputPrice: row.output_price,
    enabled: row.enabled === 1,
    updatedAt: row.updated_at,
  }));
}

// 获取单个模型定价
export function getModelPrice(model: string): ModelPricing | null {
  const row = db.prepare(`
    SELECT model, provider, input_price, output_price, enabled, updated_at
    FROM model_pricing
    WHERE model = ?
  `).get(model) as any;

  if (!row) return null;

  return {
    model: row.model,
    provider: row.provider,
    inputPrice: row.input_price,
    outputPrice: row.output_price,
    enabled: row.enabled === 1,
    updatedAt: row.updated_at,
  };
}

// 更新模型定价
export function updateModelPricing(
  model: string,
  inputPrice: number,
  outputPrice: number
): void {
  const now = Date.now();

  db.prepare(`
    UPDATE model_pricing
    SET input_price = ?, output_price = ?, updated_at = ?
    WHERE model = ?
  `).run(inputPrice, outputPrice, now, model);

  // 记录日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'system',
    'pricing_updated',
    JSON.stringify({ model, inputPrice, outputPrice }),
    now
  );
}

// 批量更新定价
export function batchUpdatePricing(updates: { model: string; inputPrice: number; outputPrice: number }[]): void {
  const now = Date.now();
  const update = db.prepare(`
    UPDATE model_pricing
    SET input_price = ?, output_price = ?, updated_at = ?
    WHERE model = ?
  `);

  for (const u of updates) {
    update.run(u.inputPrice, u.outputPrice, now, u.model);
  }
}

// 添加模型定价
export function addModelPricing(
  model: string,
  provider: string,
  inputPrice: number,
  outputPrice: number
): void {
  const now = Date.now();

  db.prepare(`
    INSERT OR REPLACE INTO model_pricing (model, provider, input_price, output_price, enabled, updated_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(model, provider, inputPrice, outputPrice, now);
}

// 启用/禁用模型
export function toggleModel(model: string, enabled: boolean): void {
  db.prepare(`
    UPDATE model_pricing SET enabled = ? WHERE model = ?
  `).run(enabled ? 1 : 0, model);
}

// 获取分成比例
export function getCommissionRates(): CommissionRate[] {
  const rows = db.prepare(`
    SELECT tier, rate, updated_at
    FROM commission_rates
    ORDER BY rate DESC
  `).all() as any[];

  return rows.map(row => ({
    tier: row.tier,
    rate: row.rate,
    updatedAt: row.updated_at,
  }));
}

// 更新分成比例
export function updateCommissionRate(tier: 'free' | 'paid' | 'enterprise', rate: number): void {
  if (rate < 0 || rate > 100) {
    throw new Error('Rate must be between 0 and 100');
  }

  const now = Date.now();

  db.prepare(`
    UPDATE commission_rates SET rate = ?, updated_at = ? WHERE tier = ?
  `).run(rate, now, tier);

  // 记录日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'system',
    'commission_updated',
    JSON.stringify({ tier, rate }),
    now
  );
}

// 计算成本（根据定价）
export function calculateModelCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPrice(model);
  if (!pricing) return 0;

  const inputCost = (pricing.inputPrice * inputTokens) / 1_000_000;
  const outputCost = (pricing.outputPrice * outputTokens) / 1_000_000;

  return inputCost + outputCost;
}

// 计算分成
export function calculateCommission(
  cost: number,
  tier: 'free' | 'paid' | 'enterprise'
): number {
  const rates = getCommissionRates();
  const rate = rates.find(r => r.tier === tier)?.rate || 30;

  return (cost * rate) / 100;
}

// 获取定价汇总
export function getPricingSummary(): {
  totalModels: number;
  enabledModels: number;
  avgInputPrice: number;
  avgOutputPrice: number;
} {
  const row = db.prepare(`
    SELECT 
      COUNT(*) as total_models,
      SUM(enabled) as enabled_models,
      AVG(input_price) as avg_input_price,
      AVG(output_price) as avg_output_price
    FROM model_pricing
  `).get() as any;

  return {
    totalModels: row?.total_models || 0,
    enabledModels: row?.enabled_models || 0,
    avgInputPrice: row?.avg_input_price || 0,
    avgOutputPrice: row?.avg_output_price || 0,
  };
}
