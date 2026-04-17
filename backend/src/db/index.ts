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

  // Phase 3: 团队表
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      UNIQUE(team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS team_invitations (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      invited_by TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
  `);

  // Phase 3: 审计日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip TEXT,
      user_agent TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_team ON audit_logs(team_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource);
  `);

  // Phase 3: 开发者 API Key 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS developer_api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '[]',
      rate_limit INTEGER NOT NULL DEFAULT 60,
      usage_limit INTEGER NOT NULL DEFAULT 10000,
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_used_at INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_dev_api_keys_user ON developer_api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_dev_api_keys_team ON developer_api_keys(team_id);
    CREATE INDEX IF NOT EXISTS idx_dev_api_keys_prefix ON developer_api_keys(key_prefix);
    CREATE INDEX IF NOT EXISTS idx_dev_api_keys_active ON developer_api_keys(is_active);
  `);

  // Phase 4: SSO
  db.exec(`
    CREATE TABLE IF NOT EXISTS sso_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT,
      enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sso_connections (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      config TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(team_id)
    );

    CREATE TABLE IF NOT EXISTS sso_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      connection_id TEXT NOT NULL,
      sso_user_id TEXT,
      attributes TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sso_connections_team ON sso_connections(team_id);
    CREATE INDEX IF NOT EXISTS idx_sso_connections_domain ON sso_connections(domain);
    CREATE INDEX IF NOT EXISTS idx_sso_sessions_user ON sso_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires ON sso_sessions(expires_at);
  `);

  // Phase 4: Branding
  db.exec(`
    CREATE TABLE IF NOT EXISTS brand_configs (
      team_id TEXT PRIMARY KEY,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#00c9ff',
      secondary_color TEXT DEFAULT '#92fe9d',
      custom_domain TEXT,
      custom_css TEXT,
      email_templates TEXT,
      features TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_domains (
      domain TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      verification_token TEXT,
      verified INTEGER DEFAULT 0,
      ssl_enabled INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_custom_domains_team ON custom_domains(team_id);
    CREATE INDEX IF NOT EXISTS idx_custom_domains_verified ON custom_domains(verified);
  `);

  // Phase 4: Export
  db.exec(`
    CREATE TABLE IF NOT EXISTS export_jobs (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      format TEXT NOT NULL,
      filters TEXT,
      status TEXT DEFAULT 'pending',
      download_url TEXT,
      expires_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_export_jobs_team ON export_jobs(team_id);
    CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON export_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_export_jobs_expires ON export_jobs(expires_at);
  `);

  // Phase 4: Custom Routing Rules
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_routing_rules (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      condition TEXT,
      action TEXT,
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_custom_routing_team ON custom_routing_rules(team_id);
    CREATE INDEX IF NOT EXISTS idx_custom_routing_enabled ON custom_routing_rules(enabled);
    CREATE INDEX IF NOT EXISTS idx_custom_routing_priority ON custom_routing_rules(priority DESC);
  `);

  console.log('Database initialized successfully');
}
