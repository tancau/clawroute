/**
 * 结构化日志模块
 *
 * 基于 Pino，提供：
 * 1. 统一 JSON 日志（生产）/ pretty（开发）
 * 2. requestId 串联（AsyncLocalStorage，贯穿单次请求）
 * 3. PII 脱敏（email / token / apiKey 半掩码）
 *
 * 用法：
 *   import { getRequestLogger, redactEmail } from '@/lib/logger';
 *   const log = getRequestLogger();
 *   log.info({ userId, email: redactEmail(email) }, 'login success');
 */

import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// ==================== 单例 Logger ====================

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
        },
      }
    : {
        // 生产：纯 JSON，由日志收集器解析
        formatters: {
          level: (label) => ({ level: label }),
        },
      }),
  // 默认 redact：防止敏感字段全量入日志
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.cookies',
      'password',
      'passwordHash',
      'apiKey',
      'token',
      'secret',
      '*.password',
      '*.passwordHash',
      '*.apiKey',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
});

// ==================== PII 脱敏工具 ====================

/**
 * 邮箱脱敏：u***@example.com
 */
export function redactEmail(email: string): string {
  if (!email || typeof email !== 'string') return String(email);
  const [local, domain] = email.split('@');
  if (!domain || !local) return '[REDACTED]';
  const head = local[0] ?? '';
  return `${head}***@${domain}`;
}

/**
 * 令牌/密钥脱敏：保留前缀 + 末 4 位
 */
export function redactToken(token: string): string {
  if (!token || typeof token !== 'string') return String(token);
  if (token.length <= 8) return '[REDACTED]';
  const prefix = token.slice(0, token.indexOf('-') + 1 || 3);
  const tail = token.slice(-4);
  return `${prefix}****${tail}`;
}

// ==================== requestId 上下文 ====================

interface RequestLogContext {
  requestId: string;
  extra?: Record<string, unknown>;
}

const requestStorage = new AsyncLocalStorage<RequestLogContext>();

/**
 * 获取当前请求的 logger（自动绑定 requestId）。
 * 在请求上下文外调用时返回根 logger。
 */
export function getRequestLogger(): pino.Logger {
  const ctx = requestStorage.getStore();
  if (ctx) {
    return logger.child({ requestId: ctx.requestId, ...ctx.extra });
  }
  return logger;
}

/**
 * 包裹一个 handler，注入 requestId 上下文。
 * 适用于 Next.js Route Handler。
 *
 *   export const POST = withRequestId(async (req) => { ... });
 */
export function withRequestId<TArgs extends unknown[], TRet>(
  handler: (...args: TArgs) => Promise<TRet>
): (...args: TArgs) => Promise<TRet> {
  return async (...args: TArgs) => {
    // 从首个参数（NextRequest）尝试读取 header，否则生成
    const req = args[0] as { headers?: { get?: (n: string) => string | null } } | undefined;
    const incomingId = req?.headers?.get?.('x-request-id');
    const requestId = incomingId || generateRequestId();
    return requestStorage.run({ requestId }, () => handler(...args));
  };
}

/**
 * 手动进入 requestId 上下文（用于无法用 withRequestId 包裹的场景）。
 */
export function runWithRequestId<T>(
  requestId: string,
  fn: () => Promise<T> | T,
  extra?: Record<string, unknown>
): Promise<T> | T {
  return requestStorage.run({ requestId, extra }, fn);
}

function generateRequestId(): string {
  // 轻量生成，避免引入 uuid 依赖
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
