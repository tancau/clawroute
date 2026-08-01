/**
 * 数据库工具函数
 * 用于创建和管理数据库表
 *
 * 注意：数据库连接通过 lib/db/client.ts 统一管理（见 REFACTOR_PLAN）。
 */

import { getDb } from '@/lib/db/client';
import { logger } from '@/lib/logger';

// 确保 request_logs 表存在
export async function ensureRequestLogsTable() {
  const db = await getDb();
  if (!db) return;

  try {
    await db`
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

    // 创建索引
    try {
      await db`CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id)`;
      await db`CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at)`;
      await db`CREATE INDEX IF NOT EXISTS idx_request_logs_model ON request_logs(model)`;
      await db`CREATE INDEX IF NOT EXISTS idx_request_logs_success ON request_logs(success)`;
    } catch (err) {
      logger.warn({ err }, 'request_logs index creation (may already exist)');
    }
  } catch (err) {
    logger.error({ err }, 'ensureRequestLogsTable failed');
  }
}

// 记录请求日志
export async function logRequest(params: {
  id: string;
  userId: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  intent?: string;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) {
    logger.warn({ userId: params.userId }, 'logRequest skipped: database unavailable');
    return;
  }

  try {
    await ensureRequestLogsTable();

    await db`
      INSERT INTO request_logs (
        id, user_id, model, provider, input_tokens, output_tokens,
        cost_usd, intent, latency_ms, success, error_message, created_at, metadata
      ) VALUES (
        ${params.id},
        ${params.userId},
        ${params.model},
        ${params.provider},
        ${params.inputTokens},
        ${params.outputTokens},
        ${params.costUsd},
        ${params.intent || null},
        ${params.latencyMs},
        ${params.success},
        ${params.errorMessage || null},
        ${Date.now()},
        ${params.metadata ? JSON.stringify(params.metadata) : null}
      )
    `;
  } catch (err) {
    // 日志记录失败不阻断主流程，但必须可见（取代原静默 catch）
    logger.error({ err, requestId: params.id, userId: params.userId }, 'logRequest failed');
  }
}
