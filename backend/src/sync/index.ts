/**
 * 模型目录同步主入口
 *
 * 编排流程：
 * 1. 从 OpenRouter 抓取（主数据源）
 * 2. 从 LiteLLM 抓取（补充）
 * 3. 从 BenchGecko 抓取（校验）
 * 4. 合并多数据源
 * 5. 推断缺失的意图/质量分/延迟
 * 6. 校验价格
 * 7. 写入数据库
 */

import { fetchOpenRouter, fetchLiteLLM, fetchBenchGecko } from './sources';
import { mergeSources, validatePrices, inferIntents, inferQualityScore, inferLatency } from './merge';
import type { PriceAlert } from './merge';
import type { RawModel } from './sources';
import {
  upsertModels,
  createSyncLog,
  updateSyncLog,
  getModelById,
  type ModelCatalogEntry,
} from '../db/model-catalog';

export interface SyncResult {
  source: string;
  modelsFound: number;
  modelsAdded: number;
  modelsUpdated: number;
  priceChanges: number;
  priceAlerts: PriceAlert[];
  durationMs: number;
  error?: string;
}

/**
 * 完整同步：从所有数据源抓取并更新数据库
 */
export async function syncAll(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // 1. OpenRouter (主数据源)
  results.push(await syncFromSource('openrouter'));

  // 2. LiteLLM (补充)
  results.push(await syncFromSource('litellm'));

  // 3. 合并 + 校验
  results.push(await mergeAndValidate());

  return results;
}

/**
 * 只同步价格（快速，每 6 小时）
 */
export async function syncPrices(): Promise<SyncResult> {
  return syncFromSource('openrouter');
}

/**
 * 只同步模型列表（完整，每 24 小时）
 */
export async function syncModels(): Promise<SyncResult> {
  const openRouterResult = await syncFromSource('openrouter');
  const litellmResult = await syncFromSource('litellm');
  const mergeResult = await mergeAndValidate();

  // 汇总
  return {
    source: 'all',
    modelsFound: openRouterResult.modelsFound + litellmResult.modelsFound,
    modelsAdded: openRouterResult.modelsAdded + litellmResult.modelsAdded + mergeResult.modelsAdded,
    modelsUpdated: openRouterResult.modelsUpdated + litellmResult.modelsUpdated + mergeResult.modelsUpdated,
    priceChanges: openRouterResult.priceChanges + litellmResult.priceChanges + mergeResult.priceChanges,
    priceAlerts: [...openRouterResult.priceAlerts, ...litellmResult.priceAlerts, ...mergeResult.priceAlerts],
    durationMs: openRouterResult.durationMs + litellmResult.durationMs + mergeResult.durationMs,
  };
}

/**
 * 从单个数据源同步
 */
async function syncFromSource(source: 'openrouter' | 'litellm'): Promise<SyncResult> {
  const startTime = Date.now();
  const logId = createSyncLog({
    source,
    sync_type: 'models',
    status: 'running',
    models_found: 0,
    models_added: 0,
    models_updated: 0,
    models_deprecated: 0,
    price_changes: 0,
    price_alerts: 0,
    duration_ms: null,
    error: null,
    started_at: startTime,
    finished_at: null,
  });

  try {
    let rawModels: RawModel[];

    switch (source) {
      case 'openrouter':
        rawModels = await fetchOpenRouter();
        break;
      case 'litellm':
        rawModels = await fetchLiteLLM();
        break;
    }

    // 推断缺失字段
    const enriched = rawModels.map(m => enrichModel(m));

    // 计算价格变更
    let priceChanges = 0;
    for (const model of enriched) {
      const existing = getModelById(model.model_id);
      if (existing && (
        Math.abs(existing.input_cost_1m - model.input_cost_1m) > 0.001 ||
        Math.abs(existing.output_cost_1m - model.output_cost_1m) > 0.001
      )) {
        priceChanges++;
      }
    }

    // 写入数据库
    const { inserted, updated } = upsertModels(enriched as any);

    const durationMs = Date.now() - startTime;
    updateSyncLog(logId, {
      status: 'success',
      models_found: rawModels.length,
      models_added: inserted,
      models_updated: updated,
      price_changes: priceChanges,
      duration_ms: durationMs,
      finished_at: Date.now(),
    });

    return {
      source,
      modelsFound: rawModels.length,
      modelsAdded: inserted,
      modelsUpdated: updated,
      priceChanges,
      priceAlerts: [],
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    updateSyncLog(logId, {
      status: 'failed',
      duration_ms: durationMs,
      error: error.message,
      finished_at: Date.now(),
    });

    return {
      source,
      modelsFound: 0,
      modelsAdded: 0,
      modelsUpdated: 0,
      priceChanges: 0,
      priceAlerts: [],
      durationMs,
      error: error.message,
    };
  }
}

/**
 * 合并多数据源 + BenchGecko 校验
 */
async function mergeAndValidate(): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    // 获取两个数据源的数据
    const [openRouter, litellm] = await Promise.all([
      fetchOpenRouter().catch(() => [] as RawModel[]),
      fetchLiteLLM().catch(() => [] as RawModel[]),
    ]);

    // 合并
    const merged = mergeSources(openRouter, litellm);

    // 推断缺失字段
    const enriched = merged.map(m => enrichModel(m));

    // BenchGecko 校验
    let alerts: PriceAlert[] = [];
    try {
      const benchgecko = await fetchBenchGecko();
      const validation = validatePrices(enriched, benchgecko);
      alerts = validation.alerts;
    } catch {
      console.warn('  BenchGecko validation skipped (fetch failed)');
    }

    // 写入数据库
    const { inserted, updated } = upsertModels(enriched as any);

    const durationMs = Date.now() - startTime;

    return {
      source: 'merge+validate',
      modelsFound: merged.length,
      modelsAdded: inserted,
      modelsUpdated: updated,
      priceChanges: 0,
      priceAlerts: alerts,
      durationMs,
    };
  } catch (error: any) {
    return {
      source: 'merge+validate',
      modelsFound: 0,
      modelsAdded: 0,
      modelsUpdated: 0,
      priceChanges: 0,
      priceAlerts: [],
      durationMs: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * 补全模型缺失字段
 */
function enrichModel(model: RawModel): RawModel {
  return {
    ...model,
    intents: model.intents || JSON.stringify(inferIntents(model.model_id, model.features)),
    quality_score: model.quality_score ?? inferQualityScore(model.model_id, model.input_cost_1m, model.output_cost_1m),
    avg_latency_ms: model.avg_latency_ms ?? inferLatency(model.model_id, model.provider),
  };
}

/**
 * 从现有 providers.ts 的 modelCapabilities 导入数据库
 * 用于首次初始化
 */
export function importFromProviders(modelCapabilities: any[]): { inserted: number; updated: number } {
  const now = Date.now();
  const entries = modelCapabilities.map(m => ({
    model_id: m.model,
    provider: m.provider,
    display_name: m.model,
    input_cost_1m: m.inputCost,
    output_cost_1m: m.outputCost,
    cache_read_cost_1m: null as number | null,
    context_window: m.contextWindow || null,
    max_output_tokens: null as number | null,
    quality_score: m.qualityScore ?? null,
    avg_latency_ms: m.avgLatency ?? null,
    features: m.features ? JSON.stringify(m.features) : null,
    intents: m.intents ? JSON.stringify(m.intents) : null,
    source_tier: 'mainstream' as const,
    source_url: 'manual:providers.ts',
    is_free: m.inputCost === 0 && m.outputCost === 0 ? 1 : 0,
    is_deprecated: 0,
    deprecated_at: null as string | null,
    price_updated_at: now,
    next_update_at: now + 6 * 60 * 60 * 1000,
  }));

  return upsertModels(entries as any);
}
