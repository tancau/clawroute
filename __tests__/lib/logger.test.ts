// @vitest-environment node
// logger 基于 pino，测试纯函数与 AsyncLocalStorage 上下文，不依赖 DOM。
// 强制 NODE_ENV=production 以避免 pino-pretty transport worker 在测试中产生副作用。
import { describe, it, expect, beforeEach, vi } from 'vitest';

let loggerMod: typeof import('@/lib/logger');

beforeEach(async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.resetModules();
  loggerMod = await import('@/lib/logger');
});

describe('logger — PII 脱敏', () => {
  it('redactEmail 保留首字符 + 域名', () => {
    expect(loggerMod.redactEmail('alice@example.com')).toBe('a***@example.com');
  });

  it('redactEmail 处理无 @ 的字符串', () => {
    expect(loggerMod.redactEmail('notanemail')).toBe('[REDACTED]');
  });

  it('redactEmail 处理空值/非字符串', () => {
    expect(loggerMod.redactEmail('')).toBe('');
    expect(loggerMod.redactEmail('x')).toBe('[REDACTED]');
  });

  it('redactToken 保留前缀 + 末 4 位', () => {
    // 含 '-' 时前缀取到首个 '-'（含）
    expect(loggerMod.redactToken('hl-abcdef1234')).toBe('hl-****1234');
  });

  it('redactToken 短令牌整体脱敏', () => {
    expect(loggerMod.redactToken('short')).toBe('[REDACTED]');
    expect(loggerMod.redactToken('12345678')).toBe('[REDACTED]'); // 恰好 8 位
  });

  it('redactToken 无分隔符时取前 3 字符为前缀', () => {
    expect(loggerMod.redactToken('abcdefghijklmnop')).toBe('abc****mnop');
  });
});

describe('logger — requestId 上下文', () => {
  it('withRequestId 优先读取 x-request-id 请求头', async () => {
    const { withRequestId, getRequestLogger } = loggerMod;
    const handler = withRequestId(async (_req: unknown) => {
      return getRequestLogger().bindings().requestId;
    });
    const req = { headers: { get: (n: string) => (n === 'x-request-id' ? 'req-123' : null) } };
    const result = await handler(req as never);
    expect(result).toBe('req-123');
  });

  it('withRequestId 缺少请求头时自动生成 requestId', async () => {
    const { withRequestId, getRequestLogger } = loggerMod;
    const handler = withRequestId(async (_req: unknown) => {
      return getRequestLogger().bindings().requestId as string;
    });
    const req = { headers: { get: () => null } };
    const result = await handler(req as never);
    expect(result).toMatch(/^r-/);
  });

  it('withRequestId 透传 handler 返回值与参数', async () => {
    const { withRequestId } = loggerMod;
    const handler = withRequestId(async (a: number, b: number) => a + b);
    // 无请求对象也能正常执行，参数原样透传
    await expect(handler(2, 3)).resolves.toBe(5);
  });

  it('runWithRequestId 绑定 requestId 与 extra', async () => {
    const { runWithRequestId, getRequestLogger } = loggerMod;
    const bindings = await runWithRequestId('rid-1', () => getRequestLogger().bindings(), {
      userId: 'u1',
    });
    expect(bindings.requestId).toBe('rid-1');
    expect(bindings.userId).toBe('u1');
  });

  it('getRequestLogger 在上下文外返回根 logger（无 requestId）', () => {
    const { getRequestLogger } = loggerMod;
    expect(getRequestLogger().bindings().requestId).toBeUndefined();
  });

  it('getRequestLogger 在上下文内返回 child logger（与根不同实例）', async () => {
    const { logger, runWithRequestId, getRequestLogger } = loggerMod;
    let inside: ReturnType<typeof getRequestLogger> | null = null;
    await runWithRequestId('rid-2', () => {
      inside = getRequestLogger();
      return undefined;
    });
    expect(inside).not.toBeNull();
    expect(inside).not.toBe(logger); // child 是新实例
    expect(inside!.bindings().requestId).toBe('rid-2');
  });
});
