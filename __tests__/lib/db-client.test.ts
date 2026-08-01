import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

// mock @vercel/postgres：db/client 内部 `await import('@vercel/postgres')` 会拿到此 mock
vi.mock('@vercel/postgres', () => ({ sql: vi.fn() }));

import { sql } from '@vercel/postgres';
import { getDb, isDbHealthy, isDbConnected, _resetDbClientForTesting } from '@/lib/db/client';

const sqlMock = sql as unknown as Mock;

beforeEach(() => {
  _resetDbClientForTesting();
  sqlMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('db/client / getDb', () => {
  it('returns sql client on success and caches it (no re-validation)', async () => {
    sqlMock.mockResolvedValue({ rows: [] }); // `sql\`SELECT 1\`` 校验通过

    const db1 = await getDb();
    const db2 = await getDb();

    expect(db1).toBe(sqlMock);
    expect(db2).toBe(sqlMock);
    // 校验仅发生一次；第二次命中缓存，不再 import/SELECT 1
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it('returns null on connection failure', async () => {
    sqlMock.mockRejectedValue(new Error('connection refused'));
    expect(await getDb()).toBeNull();
  });

  it('defers retry within 30s after a failure (no repeated attempts)', async () => {
    sqlMock.mockRejectedValue(new Error('fail'));
    await getDb(); // 失败，记录 lastError/lastAttempt

    sqlMock.mockClear();
    // 立即再次获取：处于 RETRY_INTERVAL(30s) 内，应直接返回 null 且不发起连接
    const db = await getDb();
    expect(db).toBeNull();
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('retries after the 30s retry interval elapses', async () => {
    vi.useFakeTimers();
    sqlMock.mockRejectedValue(new Error('fail'));
    await getDb(); // 失败

    vi.advanceTimersByTime(31_000); // 超过 30s 重试间隔
    sqlMock.mockResolvedValue({ rows: [] }); // 重试时恢复
    const db = await getDb();
    expect(db).toBe(sqlMock);
  });
});

describe('db/client / isDbHealthy', () => {
  it('returns true when SELECT 1 succeeds (also primes cache)', async () => {
    sqlMock.mockResolvedValue({ rows: [] });
    expect(await isDbHealthy()).toBe(true);
  });

  it('returns false when probe fails', async () => {
    sqlMock.mockRejectedValue(new Error('down'));
    expect(await isDbHealthy()).toBe(false);
  });
});

describe('db/client / isDbConnected', () => {
  it('is false initially and true after a successful getDb', async () => {
    expect(isDbConnected()).toBe(false);
    sqlMock.mockResolvedValue({ rows: [] });
    await getDb();
    expect(isDbConnected()).toBe(true);
  });

  it('is false after a failed getDb', async () => {
    sqlMock.mockRejectedValue(new Error('fail'));
    await getDb();
    expect(isDbConnected()).toBe(false);
  });
});
