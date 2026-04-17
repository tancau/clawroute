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
  `);

  console.log('Database initialized successfully');
}
