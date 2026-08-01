import { test, expect } from '@playwright/test';

/**
 * API 关键端点 —— 健康检查、就绪探针、指标、鉴权边界。
 * 不依赖外部 Provider（chat/completions 在鉴权阶段即被拦截）。
 */
test.describe('API 端点', () => {
  test('GET /api/health 返回 200 + service/version', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('service');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('uptime');
  });

  test('GET /api/ready 返回 200 或 503（DB 不可用时 503 属正常）', async ({ request }) => {
    const resp = await request.get('/api/ready');
    expect([200, 503]).toContain(resp.status());
  });

  test('GET /api/metrics 返回 200 + Prometheus 格式', async ({ request }) => {
    const resp = await request.get('/api/metrics');
    expect(resp.status()).toBe(200);
    const text = await resp.text();
    expect(text).toMatch(/# (HELP|TYPE)\s/); // Prometheus exposition format
  });

  test('POST /api/v1/chat/completions 未带 API Key 返回 401 + invalid_request_error', async ({ request }) => {
    const resp = await request.post('/api/v1/chat/completions', {
      data: {
        model: 'auto',
        messages: [{ role: 'user', content: 'hi' }],
      },
    });
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body.error?.type).toBe('invalid_request_error');
  });

  test('GET /api/v1/chat/completions 方法不允许返回 4xx', async ({ request }) => {
    const resp = await request.get('/api/v1/chat/completions');
    expect(resp.status()).toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });
});
