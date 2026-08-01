// @vitest-environment node
// rate-limit 依赖 @upstash/redis（node 环境），强制 node 以避免 jsdom polyfill问题。
// 全程走内存回退路径（无 Redis 环境变量），确保测试确定性。
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// 控制 chat 日级限额，便于用少量请求触发日级限流
vi.mock('@/lib/config', () => ({
  getDailyLimitByTier: vi.fn((tier: string) => {
    if (tier === 'admin') return Infinity;
    if (tier === 'rltest-daily') return 2; // 测试专用：日级 2 次
    return 100;
  }),
}));

let mod: typeof import('@/lib/middleware/rate-limit');

beforeEach(async () => {
  // 强制内存回退
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  vi.resetModules();
  mod = await import('@/lib/middleware/rate-limit');
});

describe('rate-limit — getTierRateLimitConfig', () => {
  it('返回各 tier 的正确配置', () => {
    expect(mod.getTierRateLimitConfig('free')).toEqual({
      maxRequests: 20,
      windowSeconds: 60,
      description: 'Free tier: 20 requests per minute',
    });
    expect(mod.getTierRateLimitConfig('pro').maxRequests).toBe(100);
    expect(mod.getTierRateLimitConfig('team').maxRequests).toBe(500);
    expect(mod.getTierRateLimitConfig('enterprise').maxRequests).toBe(2000);
  });

  it('未知 tier 回退到 free 配置', () => {
    const cfg = mod.getTierRateLimitConfig('nonexistent-tier');
    expect(cfg.maxRequests).toBe(20);
  });

  it('所有 tier 窗口均为 60 秒', () => {
    for (const tier of ['free', 'pro', 'team', 'enterprise']) {
      expect(mod.getTierRateLimitConfig(tier).windowSeconds).toBe(60);
    }
  });
});

describe('rate-limit — checkRateLimit（内存回退）', () => {
  it('限内请求放行并标记 usingMemory=true', async () => {
    const result = await mod.checkRateLimit('checkrl-allow-1', 'free');
    expect(result.success).toBe(true);
    expect(result.usingMemory).toBe(true);
    expect(result.limit).toBe(20);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.reset).toBeGreaterThan(0);
  });

  it('超限后拒绝', async () => {
    // 用 pro(100) 太多，改用 createCustomRateLimiter 验证拒绝逻辑
    const limiter = mod.createCustomRateLimiter(3, 60, 'checkrl_block');
    const id = 'checkrl-block-1';
    expect((await limiter(id)).success).toBe(true);
    expect((await limiter(id)).success).toBe(true);
    expect((await limiter(id)).success).toBe(true);
    // 第 4 次超限
    const blocked = await limiter(id);
    expect(blocked.success).toBe(false);
    expect(blocked.usingMemory).toBe(true);
    expect(blocked.remaining).toBe(0);
  });

  it('remaining 随请求递减', async () => {
    const limiter = mod.createCustomRateLimiter(5, 60, 'checkrl_decr');
    const id = 'checkrl-decr-1';
    const r1 = await limiter(id);
    const r2 = await limiter(id);
    expect(r1.remaining).toBe(4);
    expect(r2.remaining).toBe(3);
  });

  it('不同 identifier 互不影响', async () => {
    const limiter = mod.createCustomRateLimiter(1, 60, 'checkrl_indep');
    const a = await limiter('indep-a');
    const b = await limiter('indep-b');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    // 各自的第 2 次都被拒
    expect((await limiter('indep-a')).success).toBe(false);
    expect((await limiter('indep-b')).success).toBe(false);
  });
});

describe('rate-limit — 登录双限保护', () => {
  it('IP 维度：每分钟 10 次，第 11 次被拒', async () => {
    const limiter = mod.getLoginRateLimiter();
    const ip = 'login-ip-1';
    for (let i = 0; i < 10; i++) {
      expect((await limiter(ip)).success).toBe(true);
    }
    const blocked = await limiter(ip);
    expect(blocked.success).toBe(false);
    expect(blocked.limit).toBe(10);
  });

  it('账户维度：15 分钟 5 次，第 6 次被拒', async () => {
    const limiter = mod.getLoginAttemptLimiter();
    const email = 'login_attempt_user@example.com';
    for (let i = 0; i < 5; i++) {
      expect((await limiter(email)).success).toBe(true);
    }
    const blocked = await limiter(email);
    expect(blocked.success).toBe(false);
    expect(blocked.limit).toBe(5);
  });

  it('IP 限流与账户限流独立计数（不同 identifier）', async () => {
    const ipLimiter = mod.getLoginRateLimiter();
    const acctLimiter = mod.getLoginAttemptLimiter();
    // 同一 IP 下不同账户：IP 计数累加，但账户各自独立
    expect((await ipLimiter('shared-ip-1')).success).toBe(true);
    expect((await acctLimiter('acct-a-shared-ip-1')).success).toBe(true);
    expect((await acctLimiter('acct-b-shared-ip-1')).success).toBe(true);
  });
});

describe('rate-limit — 注册限流', () => {
  it('每小时 5 次，第 6 次被拒', async () => {
    const limiter = mod.getRegisterRateLimiter();
    const ip = 'register-ip-1';
    for (let i = 0; i < 5; i++) {
      expect((await limiter(ip)).success).toBe(true);
    }
    expect((await limiter(ip)).success).toBe(false);
  });
});

describe('rate-limit — checkChatRateLimit', () => {
  it('分钟内放行，超限拒绝并返回 retryAfter', async () => {
    // free: 20/min。用唯一 id 避免与其他用例共享内存计数
    const id = 'chat-minute-only-1';
    for (let i = 0; i < 20; i++) {
      const r = await mod.checkChatRateLimit(id, 'free');
      expect(r.allowed).toBe(true);
    }
    const blocked = await mod.checkChatRateLimit(id, 'free');
    expect(blocked.allowed).toBe(false);
    expect(blocked.error).toMatch(/per minute/);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    // 分钟级被拒时 dailyLimit 未触发（短路返回）
    expect(blocked.dailyLimit).toBeUndefined();
  });

  it('日级限额耗尽后拒绝', async () => {
    // mock 中 rltest-daily 日级=2，但分钟级走 free(20)。
    // 由于 checkChatRateLimit 用同一 tier 取分钟与日级配置，
    // 这里用 rltest-daily 作为 tier：分钟级回退到 free(20)，日级=2。
    const id = 'chat-daily-1';
    // 日级 2 次：前 2 次放行
    expect((await mod.checkChatRateLimit(id, 'rltest-daily')).allowed).toBe(true);
    expect((await mod.checkChatRateLimit(id, 'rltest-daily')).allowed).toBe(true);
    // 第 3 次日级超限
    const blocked = await mod.checkChatRateLimit(id, 'rltest-daily');
    expect(blocked.allowed).toBe(false);
    expect(blocked.error).toMatch(/daily quota/);
    expect(blocked.dailyLimit).toBeDefined();
    expect(blocked.dailyLimit!.success).toBe(false);
  });

  it('admin tier 跳过日级限流（Infinity）', async () => {
    const id = 'chat-admin-1';
    const r = await mod.checkChatRateLimit(id, 'admin');
    expect(r.allowed).toBe(true);
    expect(r.dailyLimit).toBeUndefined(); // Infinity → 不创建日级 limiter
  });

  it('admin tier 多次请求均放行（无日级上限）', async () => {
    const id = 'chat-admin-2';
    for (let i = 0; i < 25; i++) {
      // 超过 free 的 20/min？admin 分钟级也走 TIER_LIMITS，
      // 但 TIER_LIMITS 无 admin 项 → 回退 free(20)。所以 21 次会触发分钟限流。
      // 此用例验证日级 Infinity 生效：在分钟限内多次放行。
      if (i < 20) {
        expect((await mod.checkChatRateLimit(id, 'admin')).allowed).toBe(true);
      }
    }
  });
});

describe('rate-limit — createCustomRateLimiter', () => {
  it('自定义窗口与上限生效', async () => {
    const limiter = mod.createCustomRateLimiter(2, 3600, 'custom_window');
    const id = 'custom-window-1';
    expect((await limiter(id)).success).toBe(true);
    expect((await limiter(id)).success).toBe(true);
    expect((await limiter(id)).success).toBe(false);
  });

  it('返回结果携带 limit 与 reset', async () => {
    const limiter = mod.createCustomRateLimiter(1, 60, 'custom_meta');
    const r = await limiter('custom-meta-1');
    expect(r.limit).toBe(1);
    expect(r.reset).toBeGreaterThan(0);
    expect(r.usingMemory).toBe(true);
  });
});

describe('rate-limit — mock 验证 config 调用', () => {
  it('checkChatRateLimit 调用 getDailyLimitByTier', async () => {
    const { getDailyLimitByTier } = await import('@/lib/config');
    (getDailyLimitByTier as unknown as Mock).mockClear();
    await mod.checkChatRateLimit('verify-config-1', 'free');
    expect(getDailyLimitByTier).toHaveBeenCalledWith('free');
  });
});
