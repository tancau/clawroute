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

  // 收益记录表 (Phase 2 - 详细记录)
  db.exec(`
    CREATE TABLE IF NOT EXISTS earning_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      usage_tokens INTEGER NOT NULL DEFAULT 0,
      cost_cents INTEGER NOT NULL DEFAULT 0,
      earning_cents INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'free',
      period TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (key_id) REFERENCES shared_keys(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_earning_records_user ON earning_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_earning_records_period ON earning_records(period);
    CREATE INDEX IF NOT EXISTS idx_earning_records_key ON earning_records(key_id);
    CREATE INDEX IF NOT EXISTS idx_earning_records_provider ON earning_records(provider);
  `);

  // 累计收益汇总表 (Phase 2)
  db.exec(`
    CREATE TABLE IF NOT EXISTS earning_summary (
      user_id TEXT PRIMARY KEY,
      total_earnings_cents INTEGER NOT NULL DEFAULT 0,
      current_period_earnings_cents INTEGER NOT NULL DEFAULT 0,
      pending_earnings_cents INTEGER NOT NULL DEFAULT 0,
      last_updated INTEGER NOT NULL
    )
  `);

  // 提现请求表 (Phase 2)
  db.exec(`
    CREATE TABLE IF NOT EXISTS withdraw_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      processed_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_withdraw_user ON withdraw_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdraw_requests(status);
  `);

  // 收益记录表 (Phase 1 - 保留兼容)
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
  `);

  // 使用统计表
  db.exec(`
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

  // Provider 状态指标表 (Phase 2)
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_metrics (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      total_requests INTEGER NOT NULL DEFAULT 0,
      successful_requests INTEGER NOT NULL DEFAULT 0,
      failed_requests INTEGER NOT NULL DEFAULT 0,
      total_latency_ms INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_error_at INTEGER,
      last_success_at INTEGER,
      updated_at INTEGER NOT NULL,
      UNIQUE(provider)
    );
    
    CREATE INDEX IF NOT EXISTS idx_provider_metrics_provider ON provider_metrics(provider);
  `);

  console.log('Database initialized successfully');
}
