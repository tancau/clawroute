/**
 * 数据库表创建和管理
 * 用于支持通知、告警、Webhook 等功能
 *
 * 连接通过 lib/db/client.ts 统一管理（getDb）；DB 不可用时优雅降级（不抛错），
 * 索引/建表失败记录结构化日志，取代原先的静默 catch。
 * request_logs 表定义收敛到 lib/db.ts（单一来源），此处仅按需 re-export。
 */

import { getDb } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { ensureRequestLogsTable } from '@/lib/db';
import { ensureAllFeedbackTables } from './db/feedback-tables';
import { ensureSystemConfigTable, initializeDefaultConfigs } from './db/system-config';

// request_logs 表定义收敛到 lib/db.ts（单一来源），此处 re-export 供既有消费者使用
export { ensureRequestLogsTable };

// 确保所有必要的表存在
export async function ensureAllTables() {
  await Promise.all([
    ensureNotificationsTable(),
    ensureAlertsTable(),
    ensureWebhooksTable(),
    ensureRequestLogsTable(),
    ensureAllFeedbackTables(),
  ]);

  // 初始化系统配置表和默认值
  await ensureSystemConfigTable();
  await initializeDefaultConfigs();
}

// 通知记录表
export async function ensureNotificationsTable() {
  const db = await getDb();
  if (!db) return;

  try {
    await db`
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
      await db`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`;
      await db`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`;
      await db`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`;
    } catch (err) {
      logger.warn({ err }, 'notifications index creation (may already exist)');
    }
  } catch (err) {
    logger.error({ err }, 'ensureNotificationsTable failed');
  }
}

// 告警设置表
export async function ensureAlertsTable() {
  const db = await getDb();
  if (!db) return;

  try {
    await db`
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
      await db`CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)`;
    } catch (err) {
      logger.warn({ err }, 'alerts index creation (may already exist)');
    }
  } catch (err) {
    logger.error({ err }, 'ensureAlertsTable failed');
  }
}

// Webhook 配置表
export async function ensureWebhooksTable() {
  const db = await getDb();
  if (!db) return;

  try {
    await db`
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
      await db`CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id)`;
      await db`CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active)`;
    } catch (err) {
      logger.warn({ err }, 'webhooks index creation (may already exist)');
    }
  } catch (err) {
    logger.error({ err }, 'ensureWebhooksTable failed');
  }
}

// Webhook 日志表
export async function ensureWebhookLogsTable() {
  const db = await getDb();
  if (!db) return;

  try {
    await db`
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
      await db`CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id)`;
      await db`CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at)`;
    } catch (err) {
      logger.warn({ err }, 'webhook_logs index creation (may already exist)');
    }
  } catch (err) {
    logger.error({ err }, 'ensureWebhookLogsTable failed');
  }
}

// 错误追踪表
export async function ensureErrorTrackingTable() {
  const db = await getDb();
  if (!db) return;

  try {
    await db`
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
      await db`CREATE INDEX IF NOT EXISTS idx_error_tracking_user_id ON error_tracking(user_id)`;
      await db`CREATE INDEX IF NOT EXISTS idx_error_tracking_error_type ON error_tracking(error_type)`;
      await db`CREATE INDEX IF NOT EXISTS idx_error_tracking_resolved ON error_tracking(resolved)`;
    } catch (err) {
      logger.warn({ err }, 'error_tracking index creation (may already exist)');
    }
  } catch (err) {
    logger.error({ err }, 'ensureErrorTrackingTable failed');
  }
}
