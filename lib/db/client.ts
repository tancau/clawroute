/**
 * 统一数据访问层入口
 *
 * 取代散落在 lib/db.ts / lib/auth/index.ts / lib/budget-guard.ts /
 * lib/provider-health.ts / lib/prompt-cache.ts 中的重复 getSql() 实现。
 *
 * 特性：
 * 1. 单一连接复用（首次验证后缓存，不每次 SELECT 1）
 * 2. 失败可见化（结构化日志，取代静默 catch）
 * 3. 失败重试间隔（30s，避免频繁重连）
 * 4. 可选生产 fail-fast（DB_FAIL_FAST=true 时抛错而非返回 null）
 * 5. schema 表名常量集中定义，消除跨模块隐式依赖
 */

import { logger } from '@/lib/logger';

// ==================== 类型 ====================

// @vercel/postgres 的 sql tagged template 函数类型
export type DbClient = typeof import('@vercel/postgres')['sql'];

// ==================== schema 常量 ====================

/**
 * 数据库表名集中定义。
 * 所有模块引用此处常量，避免表名散落导致跨模块隐式依赖（见 DESIGN_EVALUATION P1-5）。
 */
export const SCHEMA = {
  TABLES: {
    USERS: 'users',
    REQUEST_LOGS: 'request_logs',
    USER_BUDGETS: 'user_budgets',
    FEEDBACK: 'model_feedback',
    SYSTEM_CONFIG: 'system_config',
  },
} as const;

// ==================== 连接管理 ====================

let cachedSql: DbClient | null = null;
let lastError: string | null = null;
let lastAttempt = 0;
const RETRY_INTERVAL_MS = 30_000; // 失败后 30s 内不重试

/**
 * 获取数据库客户端（纯连接提供者）。
 *
 * @returns DbClient（可用时）；null（不可用时）
 *
 * 策略说明：
 * 本函数始终返回 null | DbClient，不抛错。是否 fail-fast 由调用方决定：
 * - auth 模块（生产 fail-fast）：包装本函数，null 时在生产环境抛错
 * - budget-guard / db.logRequest 等（降级）：直接用 null 跳过 + 日志
 *
 * 失败后在 RETRY_INTERVAL_MS 内不重试，避免频繁重连。
 */
export async function getDb(): Promise<DbClient | null> {
  const now = Date.now();

  // 已缓存，直接复用
  if (cachedSql) return cachedSql;

  // 最近失败且未到重试时间
  if (lastError && now - lastAttempt < RETRY_INTERVAL_MS) {
    const retryIn = Math.ceil((RETRY_INTERVAL_MS - (now - lastAttempt)) / 1000);
    logger.warn({ retryIn, lastError }, 'database unavailable, deferring retry');
    return null;
  }

  // 尝试连接
  try {
    const { sql } = await import('@vercel/postgres');
    await sql`SELECT 1`;
    cachedSql = sql;
    lastError = null;
    logger.info('database connected');
    return sql;
  } catch (err) {
    lastAttempt = now;
    lastError = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'database connection failed');
    return null;
  }
}

/**
 * 数据库健康检查（供 /api/health/db 使用）。
 * 强制重新探测，不依赖缓存状态。
 */
export async function isDbHealthy(): Promise<boolean> {
  try {
    const { sql } = await import('@vercel/postgres');
    await sql`SELECT 1`;
    cachedSql = sql;
    lastError = null;
    return true;
  } catch (err) {
    logger.warn({ err }, 'database health check failed');
    return false;
  }
}

/**
 * 同步查询当前连接状态（供 isUsingPostgres 等同步场景使用）。
 * 注意：仅反映已建立的缓存状态，不触发新连接。
 */
export function isDbConnected(): boolean {
  return cachedSql !== null && lastError === null;
}

/**
 * 重置连接状态（仅供测试使用）。
 */
export function _resetDbClientForTesting(): void {
  cachedSql = null;
  lastError = null;
  lastAttempt = 0;
}
