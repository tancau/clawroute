/**
 * 数据库工具函数
 * 用于创建和管理数据库表
 * 
 * 包含容错机制：PostgreSQL 不可用时静默返回
 */

import { sql } from '@vercel/postgres';

// 检查 PostgreSQL 是否可用
async function getSql() {
  try {
    const { sql } = await import('@vercel/postgres');
    // 测试连接
    await sql`SELECT 1`;
    return sql;
  } catch {
    return null;
  }
}

// 确保 request_logs 表存在
export async function ensureRequestLogsTable() {
  const db = await getSql();
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
    } catch {
      // 索引可能已存在
    }
  } catch {
    // 静默处理表创建错误
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
  const db = await getSql();
  if (!db) return; // 数据库不可用时静默跳过日志记录
  
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
  } catch {
    // 日志记录失败不应影响主流程
  }
}
