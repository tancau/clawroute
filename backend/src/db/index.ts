import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/clawrouter.db');

// 确保数据目录存在
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db: DatabaseType = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据库 Schema
export function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'free',
      credits INTEGER NOT NULL DEFAULT 100,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      metadata TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // 共享 API Key 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      key_encrypted TEXT NOT NULL,
      key_preview TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'free',
      is_active INTEGER NOT NULL DEFAULT 1,
      total_calls INTEGER NOT NULL DEFAULT 0,
      last_used_at INTEGER,
      created_at INTEGER NOT NULL,
      expires_at INTEGER,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_shared_keys_user ON shared_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_shared_keys_provider ON shared_keys(provider);
    CREATE INDEX IF NOT EXISTS idx_shared_keys_active ON shared_keys(is_active);
  `);

  // 使用日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_id TEXT,
      request_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      intent TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      cost_cents INTEGER NOT NULL DEFAULT 0,
      saved_cents INTEGER NOT NULL DEFAULT 0,
      credits_used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (key_id) REFERENCES shared_keys(id) ON DELETE SET NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_key ON usage_logs(key_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at);
  `);

  // 收益记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS earnings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_id TEXT NOT NULL,
      period TEXT NOT NULL,
      total_saved_cents INTEGER NOT NULL DEFAULT 0,
      commission_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      paid_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (key_id) REFERENCES shared_keys(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_earnings_user ON earnings(user_id);
    CREATE INDEX IF NOT EXISTS idx_earnings_period ON earnings(period);
    
    -- 使用统计表
    CREATE TABLE IF NOT EXISTS usage_stats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      request_id TEXT,
      provider TEXT,
      model TEXT,
      intent TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_cents INTEGER DEFAULT 0,
      saved_cents INTEGER DEFAULT 0,
      timestamp INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_stats(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_stats(timestamp);
  `);

  // 模型目录表 (单一数据源)
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_catalog (
      model_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      display_name TEXT,
      input_cost_1m REAL NOT NULL DEFAULT 0,
      output_cost_1m REAL NOT NULL DEFAULT 0,
      cache_read_cost_1m REAL,
      context_window INTEGER,
      max_output_tokens INTEGER,
      quality_score REAL,
      avg_latency_ms INTEGER,
      features TEXT,
      intents TEXT,
      source_tier TEXT NOT NULL DEFAULT 'mainstream',
      source_url TEXT,
      is_free INTEGER NOT NULL DEFAULT 0,
      is_deprecated INTEGER NOT NULL DEFAULT 0,
      deprecated_at TEXT,
      discovered_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      price_updated_at INTEGER,
      next_update_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_catalog_provider ON model_catalog(provider);
    CREATE INDEX IF NOT EXISTS idx_catalog_tier ON model_catalog(source_tier);
    CREATE INDEX IF NOT EXISTS idx_catalog_free ON model_catalog(is_free);
    CREATE INDEX IF NOT EXISTS idx_catalog_deprecated ON model_catalog(is_deprecated);
    CREATE INDEX IF NOT EXISTS idx_catalog_update ON model_catalog(next_update_at);
  `);

  // 模型人工覆盖表
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_overrides (
      model_id TEXT PRIMARY KEY,
      input_cost_1m REAL,
      output_cost_1m REAL,
      quality_score REAL,
      avg_latency_ms INTEGER,
      intents TEXT,
      features TEXT,
      override_reason TEXT,
      overridden_at INTEGER NOT NULL,
      overridden_by TEXT DEFAULT 'manual'
    );
  `);

  // 同步日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      sync_type TEXT NOT NULL,
      status TEXT NOT NULL,
      models_found INTEGER DEFAULT 0,
      models_added INTEGER DEFAULT 0,
      models_updated INTEGER DEFAULT 0,
      models_deprecated INTEGER DEFAULT 0,
      price_changes INTEGER DEFAULT 0,
      price_alerts INTEGER DEFAULT 0,
      duration_ms INTEGER,
      error TEXT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sync_source ON sync_log(source);
    CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_log(status);
  `);

  console.log('Database initialized successfully');
}
