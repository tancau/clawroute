/**
 * 非主流平台 Provider 发现和适配
 *
 * 流程：
 * 1. 用户输入 baseUrl + apiKey
 * 2. 自动尝试 GET {baseUrl}/v1/models 发现模型
 * 3. 无定价 → 提示用户手动补充
 * 4. 适配前提醒用户该平台尚未适配
 */

import { upsertModels, type ModelCatalogEntry } from '../db/model-catalog';
import { inferIntents, inferQualityScore, inferLatency } from './merge';

/** 已知但未完全适配的平台 */
export const KNOWN_BUT_UNADAPTED_PROVIDERS: Record<string, KnownProvider> = {
  'infini-ai': {
    name: 'infini-ai',
    displayName: 'Infini-AI (无限AI)',
    baseUrl: 'https://cloud.infini-ai.com/maas/coding/v1',
    status: 'partial',
    hasModelsApi: true,
    hasPricingApi: false,
    manualModels: [
      'kimi-k2.5', 'deepseek-v3.2', 'deepseek-v3.2-thinking',
      'minimax-m2.7', 'minimax-m2.5', 'minimax-m2.1',
      'glm-5.1', 'glm-5', 'glm-4.7',
    ],
  },
  'together': {
    name: 'together',
    displayName: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    status: 'unadapted',
    hasModelsApi: true,
    hasPricingApi: false,
  },
  'fireworks': {
    name: 'fireworks',
    displayName: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    status: 'unadapted',
    hasModelsApi: true,
    hasPricingApi: false,
  },
  'replicate': {
    name: 'replicate',
    displayName: 'Replicate',
    baseUrl: 'https://api.replicate.com/v1',
    status: 'unadapted',
    hasModelsApi: true,
    hasPricingApi: false,
  },
  'groq': {
    name: 'groq',
    displayName: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    status: 'unadapted',
    hasModelsApi: true,
    hasPricingApi: false,
  },
};

export interface KnownProvider {
  name: string;
  displayName: string;
  baseUrl: string;
  status: 'partial' | 'unadapted';
  hasModelsApi: boolean;
  hasPricingApi: boolean;
  manualModels?: string[];
}

/** 发现结果 */
export interface DiscoveryResult {
  success: boolean;
  provider: string;
  modelsFound: number;
  modelsWithPricing: number;
  modelsWithoutPricing: number;
  models: DiscoveredModel[];
  warnings: string[];
  error?: string;
}

export interface DiscoveredModel {
  model_id: string;
  display_name: string;
  has_pricing: boolean;
  input_cost_1m?: number;
  output_cost_1m?: number;
  context_window?: number;
}

/**
 * 发现 Provider 的模型
 * 尝试 GET {baseUrl}/v1/models
 */
export async function discoverProvider(
  providerName: string,
  baseUrl: string,
  apiKey: string
): Promise<DiscoveryResult> {
  const warnings: string[] = [];

  // 检查是否是已知但未适配的平台
  const known = KNOWN_BUT_UNADAPTED_PROVIDERS[providerName];
  if (known) {
    if (known.status === 'partial') {
      warnings.push(`${known.displayName} 已部分适配，模型将自动发现，但价格信息可能需要手动补充。`);
    } else {
      warnings.push(`${known.displayName} 尚未完全适配，正在尝试发现可用模型...`);
    }
  } else {
    warnings.push(`未知平台: ${baseUrl}，正在尝试发现模型（需兼容 OpenAI API 格式）。`);
  }

  // 尝试发现模型
  try {
    const modelsUrl = baseUrl.replace(/\/$/, '') + '/v1/models';
    const response = await fetch(modelsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        success: false,
        provider: providerName,
        modelsFound: 0,
        modelsWithPricing: 0,
        modelsWithoutPricing: 0,
        models: [],
        warnings,
        error: `API 返回 ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as { data: any[] } | any[];
    const modelList = Array.isArray(data) ? data : (data as any).data || [];

    const discovered: DiscoveredModel[] = modelList.map((m: any) => ({
      model_id: m.id || m.model || m.name,
      display_name: m.name || m.id || m.model,
      has_pricing: !!(m.pricing || m.input_price || m.output_price),
      input_cost_1m: m.pricing?.input ? parseFloat(m.pricing.input) * 1_000_000 : undefined,
      output_cost_1m: m.pricing?.output ? parseFloat(m.pricing.output) * 1_000_000 : undefined,
      context_window: m.context_length || m.context_window || m.max_tokens,
    }));

    const modelsWithPricing = discovered.filter(m => m.has_pricing).length;
    const modelsWithoutPricing = discovered.filter(m => !m.has_pricing).length;

    if (modelsWithoutPricing > 0) {
      warnings.push(
        `发现 ${discovered.length} 个模型，但 ${modelsWithoutPricing} 个缺少定价信息。` +
        `请为这些模型补充价格，未补充的模型将按中等价位估算。`
      );
    }

    return {
      success: true,
      provider: providerName,
      modelsFound: discovered.length,
      modelsWithPricing,
      modelsWithoutPricing,
      models: discovered,
      warnings,
    };
  } catch (error: any) {
    return {
      success: false,
      provider: providerName,
      modelsFound: 0,
      modelsWithPricing: 0,
      modelsWithoutPricing: 0,
      models: [],
      warnings,
      error: error.message,
    };
  }
}

/**
 * 将发现的模型写入数据库
 */
export function saveDiscoveredModels(
  providerName: string,
  models: DiscoveredModel[],
  sourceTier: 'community' | 'user' = 'user'
): { inserted: number; updated: number } {
  const now = Date.now();
  const entries = models.map(m => ({
    model_id: m.model_id,
    provider: providerName,
    display_name: m.display_name,
    input_cost_1m: m.input_cost_1m ?? 0,
    output_cost_1m: m.output_cost_1m ?? 0,
    cache_read_cost_1m: null as number | null,
    context_window: m.context_window || null,
    max_output_tokens: null as number | null,
    quality_score: inferQualityScore(m.model_id, m.input_cost_1m ?? 0, m.output_cost_1m ?? 0),
    avg_latency_ms: inferLatency(m.model_id, providerName),
    features: null as string | null,
    intents: JSON.stringify(inferIntents(m.model_id, null)),
    source_tier: sourceTier,
    source_url: 'user:discovery',
    is_free: (m.input_cost_1m === 0 && m.output_cost_1m === 0) ? 1 : 0,
    is_deprecated: 0,
    deprecated_at: null as string | null,
    price_updated_at: m.has_pricing ? now : null,
    next_update_at: now + 24 * 60 * 60 * 1000,
  }));

  return upsertModels(entries as any);
}

/**
 * 手动补充模型价格
 */
export function updateModelPricing(
  modelId: string,
  provider: string,
  inputCost1m: number,
  outputCost1m: number
): void {
  const { db } = require('../db');
  const now = Date.now();

  db.prepare(`
    UPDATE model_catalog
    SET input_cost_1m = ?, output_cost_1m = ?, price_updated_at = ?, updated_at = ?
    WHERE model_id = ? AND provider = ?
  `).run(inputCost1m, outputCost1m, now, now, modelId, provider);
}
