import { db } from './index';

/**
 * 模型目录条目
 */
export interface ModelCatalogEntry {
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
  features: string | null;       // JSON array
  intents: string | null;        // JSON array
  source_tier: 'mainstream' | 'community' | 'user';
  source_url: string | null;
  is_free: number;               // 0 or 1
  is_deprecated: number;         // 0 or 1
  deprecated_at: string | null;
  discovered_at: number;
  updated_at: number;
  price_updated_at: number | null;
  next_update_at: number | null;
}

/**
 * 模型目录查询 API
 */

/** 获取所有模型（非废弃） */
export function getAllModels(): ModelCatalogEntry[] {
  return db.prepare(
    'SELECT * FROM model_catalog WHERE is_deprecated = 0 ORDER BY provider, model_id'
  ).all() as ModelCatalogEntry[];
}

/** 按 model_id 查找 */
export function getModelById(modelId: string): ModelCatalogEntry | undefined {
  return db.prepare(
    'SELECT * FROM model_catalog WHERE model_id = ? AND is_deprecated = 0'
  ).get(modelId) as ModelCatalogEntry | undefined;
}

/** 按 provider 查找 */
export function getModelsByProvider(provider: string): ModelCatalogEntry[] {
  return db.prepare(
    'SELECT * FROM model_catalog WHERE provider = ? AND is_deprecated = 0 ORDER BY quality_score DESC'
  ).all(provider) as ModelCatalogEntry[];
}

/** 按意图查找候选模型 */
export function getModelsByIntent(intent: string): ModelCatalogEntry[] {
  // intents 存储为 JSON 数组字符串，用 LIKE 模糊匹配
  return db.prepare(
    `SELECT * FROM model_catalog
     WHERE intents LIKE ? AND is_deprecated = 0
     ORDER BY quality_score DESC`
  ).all(`%"${intent}"%`) as ModelCatalogEntry[];
}

/** 按 source_tier 查找 */
export function getModelsByTier(tier: string): ModelCatalogEntry[] {
  return db.prepare(
    'SELECT * FROM model_catalog WHERE source_tier = ? AND is_deprecated = 0'
  ).all(tier) as ModelCatalogEntry[];
}

/** 获取免费模型 */
export function getFreeModels(): ModelCatalogEntry[] {
  return db.prepare(
    'SELECT * FROM model_catalog WHERE is_free = 1 AND is_deprecated = 0'
  ).all() as ModelCatalogEntry[];
}

/** 获取需要更新的模型（next_update_at 已过） */
export function getModelsNeedingUpdate(): ModelCatalogEntry[] {
  return db.prepare(
    'SELECT * FROM model_catalog WHERE next_update_at <= ? AND is_deprecated = 0'
  ).all(Date.now()) as ModelCatalogEntry[];
}

/** 获取模型价格（含人工覆盖） */
export function getModelPricing(modelId: string): { input: number; output: number } | null {
  // 先查人工覆盖
  const override = db.prepare(
    'SELECT input_cost_1m, output_cost_1m FROM model_overrides WHERE model_id = ?'
  ).get(modelId) as { input_cost_1m: number | null; output_cost_1m: number | null } | undefined;

  if (override && override.input_cost_1m != null && override.output_cost_1m != null) {
    return { input: override.input_cost_1m, output: override.output_cost_1m };
  }

  // 再查目录
  const catalog = getModelById(modelId);
  if (catalog) {
    return { input: catalog.input_cost_1m, output: catalog.output_cost_1m };
  }

  return null;
}

/**
 * 模型目录写入 API
 */

/** 插入或更新模型 */
export function upsertModel(model: Omit<ModelCatalogEntry, 'discovered_at' | 'updated_at'>): 'inserted' | 'updated' {
  const now = Date.now();
  const existing = db.prepare('SELECT model_id FROM model_catalog WHERE model_id = ?').get(model.model_id);

  if (existing) {
    db.prepare(`
      UPDATE model_catalog SET
        provider = ?, display_name = ?,
        input_cost_1m = ?, output_cost_1m = ?, cache_read_cost_1m = ?,
        context_window = ?, max_output_tokens = ?,
        quality_score = ?, avg_latency_ms = ?,
        features = ?, intents = ?,
        source_tier = ?, source_url = ?,
        is_free = ?, is_deprecated = ?, deprecated_at = ?,
        updated_at = ?, price_updated_at = ?, next_update_at = ?
      WHERE model_id = ?
    `).run(
      model.provider, model.display_name,
      model.input_cost_1m, model.output_cost_1m, model.cache_read_cost_1m,
      model.context_window, model.max_output_tokens,
      model.quality_score, model.avg_latency_ms,
      model.features, model.intents,
      model.source_tier, model.source_url,
      model.is_free, model.is_deprecated, model.deprecated_at,
      now, model.price_updated_at ?? now, model.next_update_at,
      model.model_id
    );
    return 'updated';
  } else {
    db.prepare(`
      INSERT INTO model_catalog (
        model_id, provider, display_name,
        input_cost_1m, output_cost_1m, cache_read_cost_1m,
        context_window, max_output_tokens,
        quality_score, avg_latency_ms,
        features, intents,
        source_tier, source_url,
        is_free, is_deprecated, deprecated_at,
        discovered_at, updated_at, price_updated_at, next_update_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      model.model_id, model.provider, model.display_name,
      model.input_cost_1m, model.output_cost_1m, model.cache_read_cost_1m,
      model.context_window, model.max_output_tokens,
      model.quality_score, model.avg_latency_ms,
      model.features, model.intents,
      model.source_tier, model.source_url,
      model.is_free, model.is_deprecated, model.deprecated_at,
      now, now, model.price_updated_at ?? now, model.next_update_at
    );
    return 'inserted';
  }
}

/** 批量 upsert（事务） */
export function upsertModels(models: Omit<ModelCatalogEntry, 'discovered_at' | 'updated_at'>[]): { inserted: number; updated: number } {
  let inserted = 0;
  let updated = 0;

  const txn = db.transaction(() => {
    for (const model of models) {
      const result = upsertModel(model);
      if (result === 'inserted') inserted++;
      else updated++;
    }
  });

  txn();
  return { inserted, updated };
}

/** 标记模型为废弃 */
export function deprecateModel(modelId: string): void {
  db.prepare(`
    UPDATE model_catalog SET is_deprecated = 1, deprecated_at = ?, updated_at = ?
    WHERE model_id = ?
  `).run(new Date().toISOString(), Date.now(), modelId);
}

/**
 * 同步日志 API
 */

export interface SyncLogEntry {
  id?: number;
  source: string;
  sync_type: string;
  status: 'running' | 'success' | 'failed';
  models_found: number;
  models_added: number;
  models_updated: number;
  models_deprecated: number;
  price_changes: number;
  price_alerts: number;
  duration_ms: number | null;
  error: string | null;
  started_at: number;
  finished_at: number | null;
}

/** 创建同步日志 */
export function createSyncLog(entry: Omit<SyncLogEntry, 'id'>): number {
  const result = db.prepare(`
    INSERT INTO sync_log (source, sync_type, status, models_found, models_added, models_updated,
      models_deprecated, price_changes, price_alerts, duration_ms, error, started_at, finished_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.source, entry.sync_type, entry.status,
    entry.models_found, entry.models_added, entry.models_updated,
    entry.models_deprecated, entry.price_changes, entry.price_alerts,
    entry.duration_ms, entry.error, entry.started_at, entry.finished_at
  );
  return Number(result.lastInsertRowid);
}

/** 更新同步日志 */
export function updateSyncLog(id: number, updates: Partial<SyncLogEntry>): void {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return;
  values.push(id);

  db.prepare(`UPDATE sync_log SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

/** 获取最近同步日志 */
export function getRecentSyncLogs(limit: number = 10): SyncLogEntry[] {
  return db.prepare(
    'SELECT * FROM sync_log ORDER BY started_at DESC LIMIT ?'
  ).all(limit) as SyncLogEntry[];
}

/** 获取上次成功同步时间 */
export function getLastSyncTime(): number | null {
  const row = db.prepare(
    "SELECT MAX(finished_at) as last_sync FROM sync_log WHERE status = 'success'"
  ).get() as { last_sync: number | null } | undefined;
  return row?.last_sync ?? null;
}

/** 获取目录统计 */
export function getCatalogStats(): { total: number; byProvider: Record<string, number>; byTier: Record<string, number>; free: number; deprecated: number } {
  const total = (db.prepare('SELECT COUNT(*) as c FROM model_catalog WHERE is_deprecated = 0').get() as any).c;
  const free = (db.prepare('SELECT COUNT(*) as c FROM model_catalog WHERE is_free = 1 AND is_deprecated = 0').get() as any).c;
  const deprecated = (db.prepare('SELECT COUNT(*) as c FROM model_catalog WHERE is_deprecated = 1').get() as any).c;

  const byProviderRows = db.prepare(
    'SELECT provider, COUNT(*) as c FROM model_catalog WHERE is_deprecated = 0 GROUP BY provider'
  ).all() as any[];
  const byProvider: Record<string, number> = {};
  for (const row of byProviderRows) byProvider[row.provider] = row.c;

  const byTierRows = db.prepare(
    'SELECT source_tier, COUNT(*) as c FROM model_catalog WHERE is_deprecated = 0 GROUP BY source_tier'
  ).all() as any[];
  const byTier: Record<string, number> = {};
  for (const row of byTierRows) byTier[row.source_tier] = row.c;

  return { total, byProvider, byTier, free, deprecated };
}
