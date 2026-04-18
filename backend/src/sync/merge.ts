import type { RawModel, ValidationModel } from './sources';

/**
 * 意图推断规则
 * 基于模型名称和 features 推断适合的意图
 */
const INTENT_RULES: { pattern: RegExp; intent: string; confidence: number }[] = [
  // 编码
  { pattern: /coder|codestral|code-|gpt-4\.1|deepseek-coder/i, intent: 'coding', confidence: 0.9 },
  { pattern: /gpt-5|claude-opus|qwen3-max|gemini-2\.5-pro/i, intent: 'coding', confidence: 0.7 },

  // 推理
  { pattern: /reasoner|reasoning|thinking|o1-|o3-|deepseek-r/i, intent: 'reasoning', confidence: 0.9 },
  { pattern: /opus|qwen3-max|gemini-2\.5-pro/i, intent: 'reasoning', confidence: 0.6 },

  // 分析
  { pattern: /analysis|analyst/i, intent: 'analysis', confidence: 0.9 },
  { pattern: /gpt-4o|sonnet|qwen-plus|gemini-2\.5/i, intent: 'analysis', confidence: 0.5 },

  // 创意
  { pattern: /creative|claude-opus|gpt-5/i, intent: 'creative', confidence: 0.6 },

  // 翻译
  { pattern: /translat/i, intent: 'translation', confidence: 0.9 },

  // 长上下文
  { pattern: /1m|1000000|long/i, intent: 'long_context', confidence: 0.5 },

  // 闲聊
  { pattern: /mini|nano|flash|haiku|8b|small/i, intent: 'casual_chat', confidence: 0.7 },
  { pattern: /mini|nano|flash|haiku|8b|small/i, intent: 'translation', confidence: 0.5 },

  // 交易
  { pattern: /trading|finance|kimi/i, intent: 'trading', confidence: 0.6 },
];

/**
 * 根据模型名称和 features 推断意图
 */
export function inferIntents(modelId: string, features: string | null): string[] {
  const intents = new Map<string, number>();

  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(modelId)) {
      const existing = intents.get(rule.intent) || 0;
      if (rule.confidence > existing) {
        intents.set(rule.intent, rule.confidence);
      }
    }
  }

  // 基于 features 补充
  if (features) {
    try {
      const featureList = JSON.parse(features);
      if (featureList.includes('code_specialized')) {
        intents.set('coding', Math.max(intents.get('coding') || 0, 0.85));
      }
      if (featureList.includes('chain_of_thought')) {
        intents.set('reasoning', Math.max(intents.get('reasoning') || 0, 0.85));
      }
      if (featureList.includes('long_context')) {
        intents.set('long_context', Math.max(intents.get('long_context') || 0, 0.7));
      }
    } catch {}
  }

  // 按置信度排序，返回意图列表
  return Array.from(intents.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([intent]) => intent);
}

/**
 * 质量分推断
 * 基于模型名称和价格推断质量分
 */
export function inferQualityScore(modelId: string, inputCost: number, outputCost: number): number {
  const name = modelId.toLowerCase();

  // 旗舰模型
  if (/gpt-5\.4$|claude-opus-4-7$|gemini-2\.5-pro$|qwen3-max$/.test(name)) return 0.97;
  if (/gpt-5\.4-mini|claude-sonnet-4-6|gemini-2\.5-flash|qwen3\.5-plus/.test(name)) return 0.92;
  if (/gpt-4o$|claude-sonnet|qwen-plus|deepseek-chat/.test(name)) return 0.90;
  if (/gpt-4o-mini|claude-haiku|qwen-flash|mistral-small/.test(name)) return 0.85;
  if (/nano|8b|mini/.test(name)) return 0.78;

  // 基于价格推断
  const totalCost = inputCost + outputCost;
  if (totalCost > 20) return 0.95;
  if (totalCost > 10) return 0.90;
  if (totalCost > 5) return 0.85;
  if (totalCost > 1) return 0.80;
  if (totalCost > 0.5) return 0.75;
  if (totalCost > 0.1) return 0.70;
  return 0.60;
}

/**
 * 延迟推断
 */
export function inferLatency(modelId: string, provider: string): number {
  const name = modelId.toLowerCase();

  if (/nano|flash|haiku|8b|small/.test(name)) return 300;
  if (/mini|sonnet|plus/.test(name)) return 600;
  if (/opus|pro|max|405b|5\.4$/.test(name)) return 1500;
  if (/reasoner|thinking/.test(name)) return 2000;

  // 按 provider 默认
  const providerLatency: Record<string, number> = {
    openai: 800, anthropic: 1000, google: 700,
    deepseek: 600, qwen: 500, mistral: 500,
    llama: 800, grok: 800,
  };
  return providerLatency[provider] || 800;
}

/**
 * 合并多数据源
 * OpenRouter 为主，LiteLLM 补缺
 */
export function mergeSources(openRouter: RawModel[], litellm: RawModel[]): RawModel[] {
  const merged = new Map<string, RawModel>();

  // 先放 LiteLLM（补充）
  for (const model of litellm) {
    merged.set(`${model.provider}/${model.model_id}`, model);
  }

  // OpenRouter 覆盖（主数据源）
  for (const model of openRouter) {
    const key = `${model.provider}/${model.model_id}`;
    const existing = merged.get(key);

    if (existing) {
      // 合并：OpenRouter 优先，但 LiteLLM 可能补充缺失字段
      merged.set(key, {
        ...existing,
        ...model,
        // 如果 OpenRouter 没有但 LiteLLM 有，保留 LiteLLM 的
        context_window: model.context_window || existing.context_window,
        max_output_tokens: model.max_output_tokens || existing.max_output_tokens,
        features: model.features || existing.features,
      });
    } else {
      merged.set(key, model);
    }
  }

  return Array.from(merged.values());
}

/**
 * 用 BenchGecko 校验价格
 * 偏差 > 20% 则告警
 */
export function validatePrices(
  models: RawModel[],
  validation: ValidationModel[]
): { validated: RawModel[]; alerts: PriceAlert[] } {
  const validationMap = new Map<string, ValidationModel>();
  for (const v of validation) {
    validationMap.set(`${v.provider}/${v.model_id}`, v);
  }

  const alerts: PriceAlert[] = [];

  for (const model of models) {
    const key = `${model.provider}/${model.model_id}`;
    const v = validationMap.get(key);

    if (v) {
      // 校验 input 价格
      if (v.input_cost_1m > 0 && model.input_cost_1m > 0) {
        const deviation = Math.abs(model.input_cost_1m - v.input_cost_1m) / v.input_cost_1m;
        if (deviation > 0.2) {
          alerts.push({
            model_id: model.model_id,
            provider: model.provider,
            field: 'input_cost_1m',
            ourValue: model.input_cost_1m,
            referenceValue: v.input_cost_1m,
            deviation: deviation,
          });
        }
      }

      // 校验 output 价格
      if (v.output_cost_1m > 0 && model.output_cost_1m > 0) {
        const deviation = Math.abs(model.output_cost_1m - v.output_cost_1m) / v.output_cost_1m;
        if (deviation > 0.2) {
          alerts.push({
            model_id: model.model_id,
            provider: model.provider,
            field: 'output_cost_1m',
            ourValue: model.output_cost_1m,
            referenceValue: v.output_cost_1m,
            deviation: deviation,
          });
        }
      }
    }
  }

  return { validated: models, alerts };
}

export interface PriceAlert {
  model_id: string;
  provider: string;
  field: string;
  ourValue: number;
  referenceValue: number;
  deviation: number;
}
