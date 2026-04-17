import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../api/server';
import { db } from '../db';

describe('User API', () => {
  beforeAll(() => {
    db.exec("DELETE FROM users WHERE email LIKE 'apitest%'");
  });

  it('should register a new user', async () => {
    const res = await app.request('/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'apitest@example.com',
        password: 'password123',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json() as { user: { email: string; credits: number } };
    expect(data.user.email).toBe('apitest@example.com');
    expect(data.user.credits).toBe(100);
  });

  it('should reject duplicate email', async () => {
    const res = await app.request('/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'apitest@example.com',
        password: 'password456',
      }),
    });

    expect(res.status).toBe(409);
  });

  it('should login with correct credentials', async () => {
    const res = await app.request('/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'apitest@example.com',
        password: 'password123',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as { user: { email: string }; token: string };
    expect(data.user.email).toBe('apitest@example.com');
    expect(data.token).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const res = await app.request('/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'apitest@example.com',
        password: 'wrongpassword',
      }),
    });

    expect(res.status).toBe(401);
  });
});

describe('Key API', () => {
  let testUserId: string;

  beforeAll(async () => {
    // 创建测试用户（使用唯一邮箱）
    const uniqueEmail = `keyapitest-${Date.now()}@example.com`;
    const res = await app.request('/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'password123',
      }),
    });
    const data = await res.json() as { user: { id: string } };
    testUserId = data.user.id;
  });

  it('should submit a key', async () => {
    const res = await app.request('/v1/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        provider: 'openai',
        apiKey: 'sk-apitest123456789abcdefghijklmnop',
        tier: 'paid',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json() as { key: { provider: string; tier: string; isActive: boolean } };
    expect(data.key.provider).toBe('openai');
    expect(data.key.tier).toBe('paid');
    expect(data.key.isActive).toBe(true);
  });

  it('should list user keys', async () => {
    const res = await app.request(`/v1/keys?userId=${testUserId}`);

    expect(res.status).toBe(200);
    const data = await res.json() as { keys: Array<{ provider: string }> };
    expect(data.keys.length).toBeGreaterThan(0);
    expect(data.keys[0].provider).toBe('openai');
  });

  it('should require userId', async () => {
    const res = await app.request('/v1/keys');
    expect(res.status).toBe(400);
  });
});

describe('Billing API', () => {
  let testUserId: string;

  beforeAll(async () => {
    const uniqueEmail = `billapitest-${Date.now()}@example.com`;
    const res = await app.request('/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'password123',
      }),
    });
    const data = await res.json() as { user: { id: string } };
    testUserId = data.user.id;
  });

  it('should get user earnings', async () => {
    const res = await app.request(`/v1/billing/earnings/${testUserId}`);

    expect(res.status).toBe(200);
    const data = await res.json() as { earnings: { totalCents: number } };
    expect(data.earnings.totalCents).toBeGreaterThanOrEqual(0);
  });

  it('should get user usage stats', async () => {
    const res = await app.request(`/v1/billing/usage/${testUserId}?days=7`);

    expect(res.status).toBe(200);
    const data = await res.json() as { stats: { totalRequests: number } };
    expect(data.stats.totalRequests).toBeGreaterThanOrEqual(0);
  });

  it('should get user dashboard', async () => {
    const res = await app.request(`/v1/users/${testUserId}/dashboard`);

    expect(res.status).toBe(200);
    const data = await res.json() as { user: { email: string }; keys: number };
    expect(data.user.email).toMatch(/billapitest-/);
    expect(typeof data.keys).toBe('number');
  });
});
