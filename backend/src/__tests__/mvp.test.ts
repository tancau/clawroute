import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, db } from '../db';
import { UserTool, getUser, updateUser, deductCredits, addCredits, verifyPassword } from '../users';
import { KeyTool, getKeys, getAvailableKey, updateKey, deleteKey } from '../keys';
import { BillingTool, getUserEarnings, getUserUsageStats, calculateCost, calculateSavings, calculateCommission } from '../billing';

describe('Database', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('should initialize tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);
    
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('shared_keys');
    expect(tableNames).toContain('usage_logs');
    expect(tableNames).toContain('earnings');
  });
});

describe('User Management', () => {
  beforeAll(() => {
    initDatabase();
    // 清理测试数据
    db.exec("DELETE FROM users WHERE email LIKE '%test%'");
  });

  it('should create a user', async () => {
    const context = {
      requestId: 'test-1',
      timestamp: Date.now(),
      startTime: Date.now(),
    };

    const result = await UserTool.call({
      email: 'test@example.com',
      password: 'password123',
      tier: 'free',
    }, context);

    expect(result.data.email).toBe('test@example.com');
    expect(result.data.tier).toBe('free');
    expect(result.data.credits).toBe(100);
  });

  it('should get user by email', () => {
    const user = getUser({ email: 'test@example.com' });
    expect(user).toBeDefined();
    expect(user?.email).toBe('test@example.com');
  });

  it('should verify password', () => {
    const user = getUser({ email: 'test@example.com' });
    expect(user).toBeDefined();
    expect(verifyPassword('password123', user!.passwordHash)).toBe(true);
    expect(verifyPassword('wrongpassword', user!.passwordHash)).toBe(false);
  });

  it('should update user tier', () => {
    const user = getUser({ email: 'test@example.com' });
    const updated = updateUser({ id: user!.id, tier: 'pro' });
    expect(updated?.tier).toBe('pro');
  });

  it('should deduct credits', () => {
    const user = getUser({ email: 'test@example.com' });
    const success = deductCredits(user!.id, 10);
    expect(success).toBe(true);
    
    const updated = getUser({ id: user!.id });
    expect(updated?.credits).toBe(90);
  });

  it('should not deduct more than available', () => {
    const user = getUser({ email: 'test@example.com' });
    const success = deductCredits(user!.id, 200);
    expect(success).toBe(false);
    
    const updated = getUser({ id: user!.id });
    expect(updated?.credits).toBe(90);
  });

  it('should add credits', () => {
    const user = getUser({ email: 'test@example.com' });
    const success = addCredits(user!.id, 50);
    expect(success).toBe(true);
    
    const updated = getUser({ id: user!.id });
    expect(updated?.credits).toBe(140);
  });
});

describe('Key Management', () => {
  let testUserId: string;

  beforeAll(async () => {
    initDatabase();
    db.exec("DELETE FROM shared_keys WHERE key_preview LIKE 'sk-test%'");
    
    // 创建测试用户
    const context = {
      requestId: 'test-key-setup',
      timestamp: Date.now(),
      startTime: Date.now(),
    };
    
    const user = await UserTool.call({
      email: 'keytest@example.com',
      password: 'password123',
    }, context);
    
    testUserId = user.data.id;
  });

  it('should submit a key', async () => {
    const context = {
      requestId: 'test-key-1',
      timestamp: Date.now(),
      startTime: Date.now(),
    };

    const result = await KeyTool.call({
      userId: testUserId,
      provider: 'openai',
      apiKey: 'sk-test123456789abcdefghijklmnop',
      tier: 'paid',
    }, context);

    expect(result.data.userId).toBe(testUserId);
    expect(result.data.provider).toBe('openai');
    expect(result.data.tier).toBe('paid');
    expect(result.data.isActive).toBe(true);
    expect(result.data.keyPreview).toContain('sk-tes');
  });

  it('should get user keys', () => {
    const keys = getKeys({ userId: testUserId });
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0].provider).toBe('openai');
  });

  it('should get available key', () => {
    const keyInfo = getAvailableKey('openai', 'paid');
    expect(keyInfo).toBeDefined();
    expect(keyInfo?.key).toBe('sk-test123456789abcdefghijklmnop');
  });

  it('should update key status', () => {
    const keys = getKeys({ userId: testUserId });
    const updated = updateKey({ id: keys[0].id, isActive: false });
    expect(updated?.isActive).toBe(false);
    
    // 恢复
    updateKey({ id: keys[0].id, isActive: true });
  });

  it('should delete key', () => {
    const keys = getKeys({ userId: testUserId });
    const deleted = deleteKey(keys[0].id);
    expect(deleted).toBe(true);
    
    const remaining = getKeys({ userId: testUserId });
    expect(remaining.length).toBe(0);
  });
});

describe('Billing', () => {
  let testUserId: string;
  let testKeyId: string | undefined;

  beforeAll(async () => {
    initDatabase();
    db.exec("DELETE FROM usage_logs WHERE request_id LIKE 'test-bill%'");
    db.exec("DELETE FROM earnings WHERE period = '2026-04'");
    
    // 创建测试用户
    const context = {
      requestId: 'test-bill-setup',
      timestamp: Date.now(),
      startTime: Date.now(),
    };
    
    const user = await UserTool.call({
      email: 'billtest@example.com',
      password: 'password123',
    }, context);
    
    testUserId = user.data.id;
    
    // 创建测试 Key
    const key = await KeyTool.call({
      userId: testUserId,
      provider: 'openai',
      apiKey: 'sk-billtest123456789abcdefghijklmnop',
      tier: 'paid',
    }, context);
    
    testKeyId = key.data.id;
  });

  it('should calculate cost correctly', () => {
    // GPT-4: $30/M input, $60/M output
    const cost = calculateCost('gpt-4', 1000, 500);
    // (1000/1000000 * 30 + 500/1000000 * 60) * 100 = 3 + 3 = 6 cents
    expect(cost).toBe(6);
  });

  it('should calculate savings correctly', () => {
    // DeepSeek: $0.14/M input, $0.28/M output
    const savings = calculateSavings('deepseek-chat', 1000, 500, 'paid');
    // Baseline GPT-4: 6 cents, DeepSeek: ~0.0027 cents
    // Savings: ~6 cents
    expect(savings).toBeGreaterThan(0);
    expect(savings).toBeLessThan(10);
  });

  it('should calculate commission correctly', () => {
    const commission = calculateCommission(100, 'paid');
    expect(commission).toBe(50); // 50% of 100 cents
  });

  it('should log usage', async () => {
    const context = {
      requestId: 'test-bill-1',
      timestamp: Date.now(),
      startTime: Date.now(),
    };

    const result = await BillingTool.call({
      userId: testUserId,
      keyId: testKeyId,
      requestId: 'test-bill-1',
      provider: 'openai',
      model: 'gpt-4',
      inputTokens: 1000,
      outputTokens: 500,
      latencyMs: 500,
      creditsUsed: 1,
    }, context);

    expect(result.data.userId).toBe(testUserId);
    expect(result.data.inputTokens).toBe(1000);
    expect(result.data.outputTokens).toBe(500);
    expect(result.data.costCents).toBe(6);
  });

  it('should get user earnings', () => {
    const earnings = getUserEarnings(testUserId);
    expect(earnings.total).toBeGreaterThanOrEqual(0);
  });

  it('should get user usage stats', () => {
    const stats = getUserUsageStats(testUserId, 30);
    expect(stats.totalRequests).toBeGreaterThanOrEqual(1);
    expect(stats.totalTokens).toBeGreaterThanOrEqual(1500);
  });
});

describe('Cost Comparison', () => {
  it('should show GPT-4 is expensive', () => {
    const gpt4 = calculateCost('gpt-4', 1000000, 500000);
    expect(gpt4).toBe(6000); // $60
  });

  it('should show Claude is cheaper', () => {
    const claude = calculateCost('claude-3-haiku', 1000000, 500000);
    // (1M * 0.25 + 0.5M * 1.25) / 1M * 100 = 25 + 62.5 = 87.5 cents
    // 实际四舍五入到 88
    expect(claude).toBe(88);
  });

  it('should show DeepSeek is cheapest', () => {
    const deepseek = calculateCost('deepseek-chat', 1000000, 500000);
    // (1M * 0.14 + 0.5M * 0.28) / 1M * 100 = 14 + 14 = 28 cents
    expect(deepseek).toBe(28);
  });

  it('should show free tier costs nothing', () => {
    const free = calculateCost('free-tier', 1000000, 500000);
    expect(free).toBe(0);
  });
});
