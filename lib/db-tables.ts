/**
 * 数据库表创建和管理
 * 用于支持通知、告警、Webhook 等功能
 */

import { sql } from '@vercel/postgres';

// 确保所有必要的表存在
export async function ensureAllTables() {
  await Promise.all([
    ensureNotificationsTable(),
    ensureAlertsTable(),
    ensureWebhooksTable(),
    ensureRequestLogsTable(),
  ]);
}

// 通知记录表
export async function ensureNotificationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at INTEGER,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      metadata TEXT
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`;
  } catch {
    // 索引可能已存在
  }
}

// 告警设置表
export async function ensureAlertsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      credits_threshold INTEGER DEFAULT 20,
      daily_request_limit INTEGER DEFAULT 1000,
      error_rate_threshold DECIMAL(5, 2) DEFAULT 10.00,
      email_enabled BOOLEAN DEFAULT true,
      webhook_enabled BOOLEAN DEFAULT false,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)`;
  } catch {
    // 索引可能已存在
  }
}

// Webhook 配置表
export async function ensureWebhooksTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      secret TEXT,
      events TEXT[] NOT NULL,
      active BOOLEAN DEFAULT true,
      last_triggered_at INTEGER,
      failure_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active)`;
  } catch {
    // 索引可能已存在
  }
}

// Webhook 日志表
export async function ensureWebhookLogsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      response_status INTEGER,
      response_body TEXT,
      success BOOLEAN DEFAULT false,
      duration_ms INTEGER,
      created_at INTEGER NOT NULL
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at)`;
  } catch {
    // 索引可能已存在
  }
}

// 请求日志表（如果不存在）
export async function ensureRequestLogsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS request_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_usd DECIMAL(10, 6) DEFAULT 0,
      intent TEXT,
      latency_ms INTEGER DEFAULT 0,
      success BOOLEAN DEFAULT true,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      metadata TEXT
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_request_logs_model ON request_logs(model)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_request_logs_success ON request_logs(success)`;
  } catch {
    // 索引可能已存在
  }
}

// 错误追踪表
export async function ensureErrorTrackingTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS error_tracking (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      error_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      error_stack TEXT,
      request_id TEXT,
      model TEXT,
      provider TEXT,
      occurrence_count INTEGER DEFAULT 1,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      resolved BOOLEAN DEFAULT false,
      metadata TEXT
    )
  `;
  
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_error_tracking_user_id ON error_tracking(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_error_tracking_error_type ON error_tracking(error_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_error_tracking_resolved ON error_tracking(resolved)`;
  } catch {
    // 索引可能已存在
  }
}