/**
 * 数据源定义和抓取逻辑
 */

import { logger } from '../monitoring/logger';

/** 主流平台列表 */
export const MAINSTREAM_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'qwen',
  'mistral',
  'llama',
  'grok',
] as const;

/** 社区/聚合平台 */
export const COMMUNITY_PROVIDERS = [
  'openrouter',
  'litellm',
] as const;

/** OpenRouter provider ID → 我们的 provider 名称映射 */
export const PROVIDER_MAP: Record<string, string> = {
  'openai': 'openai',
  'anthropic': 'anthropic',
  'google': 'google',
  'deepseek': 'deepseek',
  'alibaba': 'qwen',
  'qwen': 'qwen',
  'mistralai': 'mistral',
  'meta-llama': 'llama',
  'x-ai': 'grok',
  'cohere': 'cohere',
  'perplexity': 'perplexity',
};

/** 我们关注的模型关键词（用于过滤 OpenRouter 的 343+ 模型） */
const MODEL_PATTERNS = [
  'gpt-', 'claude', 'gemini', 'deepseek', 'qwen', 'mistral',
  'llama', 'grok', 'codestral', 'ministral', 'command',
  'gemma',
];

/** 排除的模型关键词 */
const EXCLUDE_PATTERNS = [
  ':preview', ':beta', ':alpha', ':archived',
  '-instruct',  // 保留，但降低优先级
  'extended',   // 通常是变体
];

/**
 * 从 OpenRouter API 抓取模型和价格
 * 无需认证，343+ 模型含完整定价
 */
export async function fetchOpenRouter(): Promise<RawModel[]> {
  logger.info('Fetching from OpenRouter (no API key required)');

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const { data } = await response.json() as { data: any[] };

  const models = data
    .filter((m: any) => {
      const id = m.id.toLowerCase();
      // 必须匹配至少一个关注模式
      const isRelevant = MODEL_PATTERNS.some(p => id.includes(p));
      // 排除预览/测试模型
      const isExcluded = EXCLUDE_PATTERNS.some(p => id.includes(p));
      return isRelevant && !isExcluded;
    })
    .map((m: any): RawModel => {
      const [rawProvider, ...rest] = m.id.split('/');
      const modelId = rest.join('/') || m.id;
      const provider = PROVIDER_MAP[rawProvider] || rawProvider;

      // OpenRouter 定价单位: $/token，转为 $/1M token
      const promptPrice = parseFloat(m.pricing?.prompt || '0');
      const completionPrice = parseFloat(m.pricing?.completion || '0');
      const cacheReadPrice = m.pricing?.input_cache_read
        ? parseFloat(m.pricing.input_cache_read)
        : null;

      return {
        model_id: modelId,
        provider,
        display_name: m.name || modelId,
        input_cost_1m: promptPrice * 1_000_000,
        output_cost_1m: completionPrice * 1_000_000,
        cache_read_cost_1m: cacheReadPrice ? cacheReadPrice * 1_000_000 : null,
        context_window: m.context_length || null,
        max_output_tokens: m.top_provider?.max_completion_tokens || null,
        quality_score: null,  // OpenRouter 不提供质量分
        avg_latency_ms: null,
        features: extractFeatures(m),
        intents: null,  // 需要后续推断
        source_tier: (MAINSTREAM_PROVIDERS as readonly string[]).includes(provider)
          ? 'mainstream' as const
          : 'community' as const,
        source_url: 'https://openrouter.ai/api/v1/models',
        is_free: promptPrice === 0 && completionPrice === 0 ? 1 : 0,
        is_deprecated: 0,
        deprecated_at: null,
        price_updated_at: Date.now(),
        next_update_at: Date.now() + 6 * 60 * 60 * 1000,  // 6 小时后
      };
    });

  logger.info(`Found models from OpenRouter`, { count: models.length });
  return models;
}

/**
 * 从 LiteLLM GitHub JSON 抓取模型和价格
 * 2671 模型，字段最丰富
 */
export async function fetchLiteLLM(): Promise<RawModel[]> {
  logger.info('Fetching from LiteLLM (GitHub raw, no API key)');

  const response = await fetch(
    'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
    { signal: AbortSignal.timeout(30000) }
  );

  if (!response.ok) {
    throw new Error(`LiteLLM fetch error: ${response.status}`);
  }

  const data = await response.json() as Record<string, any>;

  const models: RawModel[] = [];

  for (const [key, m] of Object.entries(data)) {
    // LiteLLM key 格式: "openai/gpt-4o" 或 "anthropic/claude-3-opus"
    const [rawProvider, ...rest] = key.split('/');
    const modelId = rest.join('/') || key;
    const provider = PROVIDER_MAP[rawProvider] || rawProvider;

    // 只关注主流 provider
    if (!(MAINSTREAM_PROVIDERS as readonly string[]).includes(provider) &&
        !(COMMUNITY_PROVIDERS as readonly string[]).includes(provider)) {
      continue;
    }

    // LiteLLM 定价单位: $/token，转为 $/1M token
    const inputCost = m.input_cost_per_token
      ? m.input_cost_per_token * 1_000_000
      : 0;
    const outputCost = m.output_cost_per_token
      ? m.output_cost_per_token * 1_000_000
      : 0;

    models.push({
      model_id: modelId,
      provider,
      display_name: m.model_name || modelId,
      input_cost_1m: inputCost,
      output_cost_1m: outputCost,
      cache_read_cost_1m: m.cache_read_input_token_cost
        ? m.cache_read_input_token_cost * 1_000_000
        : null,
      context_window: m.max_input_tokens || null,
      max_output_tokens: m.max_output_tokens || null,
      quality_score: null,
      avg_latency_ms: null,
      features: extractLiteLLMFeatures(m),
      intents: null,
      source_tier: (MAINSTREAM_PROVIDERS as readonly string[]).includes(provider)
        ? 'mainstream' as const
        : 'community' as const,
      source_url: 'https://github.com/BerriAI/litellm',
      is_free: inputCost === 0 && outputCost === 0 ? 1 : 0,
      is_deprecated: 0,
      deprecated_at: null,
      price_updated_at: Date.now(),
      next_update_at: Date.now() + 24 * 60 * 60 * 1000,
    });
  }

  logger.info(`Found models from LiteLLM`, { count: models.length });
  return models;
}

/**
 * 从 BenchGecko 抓取校验数据
 * 标准化格式，价格以 $/1M token 为单位
 */
export async function fetchBenchGecko(): Promise<ValidationModel[]> {
  logger.info('Fetching from BenchGecko for validation');

  const response = await fetch(
    'https://raw.githubusercontent.com/BenchGecko/llm-pricing/main/pricing.json',
    { signal: AbortSignal.timeout(30000) }
  );

  if (!response.ok) {
    throw new Error(`BenchGecko fetch error: ${response.status}`);
  }

  const data = await response.json() as {
    last_updated: string;
    models: any[];
  };

  const models = data.models.map((m: any): ValidationModel => ({
    model_id: m.id.includes('/') ? m.id.split('/').slice(1).join('/') : m.id,
    provider: m.provider?.toLowerCase() || 'unknown',
    input_cost_1m: m.input_per_million || 0,
    output_cost_1m: m.output_per_million || 0,
    context_window: m.context_window || null,
    is_free: m.is_free || false,
  }));

  logger.info(`Found models from BenchGecko`, { count: models.length });
  return models;
}

/** 从 OpenRouter 模型提取 features */
function extractFeatures(m: any): string {
  const features: string[] = [];
  if (m.architecture?.modality === 'multimodal') features.push('vision');
  if (m.supported_parameters?.includes('tools')) features.push('tool_use');
  if (m.supported_parameters?.includes('function_calling')) features.push('function_calling');
  if (m.supported_parameters?.includes('response_format')) features.push('json_mode');
  return JSON.stringify(features);
}

/** 从 LiteLLM 模型提取 features */
function extractLiteLLMFeatures(m: any): string {
  const features: string[] = [];
  if (m.supports_vision) features.push('vision');
  if (m.supports_function_calling) features.push('function_calling');
  if (m.supports_tool_calling) features.push('tool_use');
  if (m.supports_response_schema) features.push('json_mode');
  if (m.supports_prompt_caching) features.push('prompt_caching');
  if (m.supports_reasoning) features.push('reasoning');
  return JSON.stringify(features);
}

/** 原始模型数据（从数据源抓取） */
export interface RawModel {
  model_id: string;
  provider: string;
  display_name: string | null;
  input_cost_1m: number;
  output_cost_1m: number;
  cache_read_cost_1m: number | null;
  context_window: number | null;
  max_output_tokens: number | null;
  quality_score: number | null;
  avg_latency_ms: number | null;
  features: string | null;
  intents: string | null;
  source_tier: 'mainstream' | 'community' | 'user';
  source_url: string | null;
  is_free: number;
  is_deprecated: number;
  deprecated_at: string | null;
  price_updated_at: number | null;
  next_update_at: number | null;
}

/** 校验模型数据（BenchGecko） */
export interface ValidationModel {
  model_id: string;
  provider: string;
  input_cost_1m: number;
  output_cost_1m: number;
  context_window: number | null;
  is_free: boolean;
}
