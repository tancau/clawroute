/**
 * 成本追踪模块
 * 价格单位：美元/1M tokens (与 providers.ts 统一)
 */

// 模型定价（每 1M tokens，单位：美元）
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // GPT 系列
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // Claude 系列
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  'claude-3.5-haiku': { input: 0.1, output: 0.5 },

  // Gemini 系列
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },

  // DeepSeek
  'deepseek-chat': { input: 0.28, output: 0.42 },
  'deepseek-coder': { input: 0.28, output: 0.42 },

  // Qwen
  'qwen-turbo': { input: 0.8, output: 0.8 },
  'qwen-plus': { input: 4.0, output: 12.0 },
  'qwen-max': { input: 12.0, output: 12.0 },

  // 其他模型默认价格
  'default': { input: 1.0, output: 2.0 },
};

// 基准模型（用于对比节省）
const BASELINE_MODEL = 'gpt-4';

export interface CostComparison {
  originalModel: string;
  originalCostCents: number;
  actualModel: string;
  actualCostCents: number;
  savedCents: number;
  savedPercent: number;
}

/**
 * 获取模型定价
 */
export function getModelPricing(model: string): { input: number; output: number } {
  const normalizedModel = model.toLowerCase();
  
  // 精确匹配优先
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }
  
  // 模糊匹配（模型名包含关键词）
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (normalizedModel === key.toLowerCase()) {
      return pricing;
    }
  }
  
  // 前缀匹配
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (normalizedModel.startsWith(key.toLowerCase()) || key.toLowerCase().startsWith(normalizedModel)) {
      return pricing;
    }
  }
  
  return { input: 0.01, output: 0.02 }; // default pricing
}

/**
 * 计算成本（cents）
 * 基于美元/1M tokens 的定价
 */
export function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = getModelPricing(model);
  // pricing 是美元/1M tokens，计算总美元成本后转为 cents
  const inputCostUsd = (inputTokens / 1_000_000) * pricing.input;
  const outputCostUsd = (outputTokens / 1_000_000) * pricing.output;
  return Math.round((inputCostUsd + outputCostUsd) * 100); // 转换为 cents
}

/**
 * 成本对比（与 GPT-4 相比）
 */
export function compareCost(
  inputTokens: number,
  outputTokens: number,
  actualModel: string
): CostComparison {
  const baselinePricing = MODEL_PRICING[BASELINE_MODEL] || { input: 3.0, output: 6.0 };
  const actualPricing = getModelPricing(actualModel);
  
  // 计算基准成本 (美元/1M tokens)
  const baselineInputCost = (inputTokens / 1_000_000) * baselinePricing.input;
  const baselineOutputCost = (outputTokens / 1_000_000) * baselinePricing.output;
  const originalCostCents = Math.round((baselineInputCost + baselineOutputCost) * 100);
  
  // 计算实际成本
  const actualCostCents = calculateCost(inputTokens, outputTokens, actualModel);
  
  // 计算节省
  const savedCents = Math.max(0, originalCostCents - actualCostCents);
  const savedPercent = originalCostCents > 0 
    ? Math.round((savedCents / originalCostCents) * 100) 
    : 0;
  
  return {
    originalModel: BASELINE_MODEL,
    originalCostCents,
    actualModel,
    actualCostCents,
    savedCents,
    savedPercent,
  };
}

/**
 * 获取用户累计节省
 */
export function getUserSavings(userId: string, days: number = 30): {
  totalSavedCents: number;
  totalRequests: number;
  averageSavingPercent: number;
} {
  // 这里需要从数据库查询
  // 暂时返回默认值，实际使用时需要配合 tracker.ts
  return {
    totalSavedCents: 0,
    totalRequests: 0,
    averageSavingPercent: 0,
  };
}
