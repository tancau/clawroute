import { describe, it, expect, beforeEach, vi } from 'vitest';
import { acquireProviderSlot, getMaxConcurrent } from '@/lib/middleware/concurrency';

describe('middleware/concurrency', () => {
  beforeEach(() => {
    // 强制内存回退路径（确保测试确定性，不依赖 Redis）
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  });

  it('enforces per-provider maxConcurrent cap', async () => {
    vi.stubEnv('PROVIDER_CONCURRENTTEST_MAX_CONCURRENT', '2');
    const s1 = await acquireProviderSlot('concurrenttest');
    const s2 = await acquireProviderSlot('concurrenttest');
    expect(s1).not.toBeNull();
    expect(s2).not.toBeNull();
    // 第 3 个超出上限被拒
    const s3 = await acquireProviderSlot('concurrenttest');
    expect(s3).toBeNull();
    await s1!.release();
    await s2!.release();
  });

  it('release allows re-acquire', async () => {
    vi.stubEnv('PROVIDER_RELTEST_MAX_CONCURRENT', '1');
    const s1 = await acquireProviderSlot('reltest');
    expect(s1).not.toBeNull();
    expect(await acquireProviderSlot('reltest')).toBeNull();
    await s1!.release();
    const s2 = await acquireProviderSlot('reltest');
    expect(s2).not.toBeNull();
    await s2!.release();
  });

  it('release is idempotent (no over-decrement / no over-admission)', async () => {
    vi.stubEnv('PROVIDER_IDEMTEST_MAX_CONCURRENT', '1');
    const s = await acquireProviderSlot('idemtest');
    expect(s).not.toBeNull();
    await s!.release();
    await s!.release(); // 幂等：不应让计数变负
    const s2 = await acquireProviderSlot('idemtest');
    expect(s2).not.toBeNull();
    // 若 release 不幂等（计数变负），此处会错误地放行第 2 个
    expect(await acquireProviderSlot('idemtest')).toBeNull();
    await s2!.release();
  });

  it('different providers are independent', async () => {
    vi.stubEnv('PROVIDER_INDEP_A_MAX_CONCURRENT', '1');
    vi.stubEnv('PROVIDER_INDEP_B_MAX_CONCURRENT', '1');
    const a = await acquireProviderSlot('indep_a');
    const b = await acquireProviderSlot('indep_b');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(await acquireProviderSlot('indep_a')).toBeNull();
    expect(await acquireProviderSlot('indep_b')).toBeNull();
    await a!.release();
    await b!.release();
  });

  it('getMaxConcurrent reads per-provider env with default fallback', () => {
    vi.stubEnv('PROVIDER_GT_MAX_CONCURRENT', '5');
    expect(getMaxConcurrent('gt')).toBe(5);
    // 未配置的 provider 走默认 10
    expect(getMaxConcurrent('nonexistent_provider_xyz')).toBe(10);
  });
});
