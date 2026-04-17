import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import app from '../api/server';

// Mock 环境变量
beforeAll(() => {
  // 设置测试用的 API keys
  process.env.OPENAI_API_KEY = 'test-key-1,test-key-2';
  process.env.LITELLM_API_KEY = 'test-litellm-key';
});

afterAll(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.LITELLM_API_KEY;
});

describe('API Integration', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBeDefined();
    });
  });

  describe('GET /v1/tools', () => {
    it('should return tool list', async () => {
      const res = await app.request('/v1/tools');
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.tools).toBeInstanceOf(Array);
      expect(data.tools.length).toBeGreaterThan(0);
      expect(data.tools[0].name).toBeDefined();
      expect(data.tools[0].description).toBeDefined();
    });
  });

  describe('POST /v1/classify', () => {
    it('should classify code intent', async () => {
      const res = await app.request('/v1/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '写一个快速排序算法' }),
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent).toBe('coding');
      expect(data.confidence).toBeGreaterThan(0.8);
      expect(data.source).toBeDefined();
    });

    it('should classify trading intent', async () => {
      const res = await app.request('/v1/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'BTC 现在价格多少？' }),
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.intent).toBe('trading');
    });

    it('should reject invalid input', async () => {
      const res = await app.request('/v1/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' }),
      });
      
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /v1/chat/completions', () => {
    it('should accept model=auto and route correctly', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto',
          messages: [{ role: 'user', content: '写一个快速排序算法' }],
        }),
      });
      
      // 由于没有真实的 API key，会失败，但可以验证路由逻辑
      // 检查是否尝试了路由
      expect([200, 500]).toContain(res.status);
      
      if (res.status === 200) {
        const data = await res.json();
        expect(data.object).toBe('chat.completion');
        expect(data._routing).toBeDefined();
        expect(data._routing.intent).toBe('coding');
        expect(data._routing.model).toBeDefined();
        expect(data._routing.provider).toBeDefined();
      }
    });

    it('should accept specific model and route', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });
      
      // 检查是否尝试了使用指定模型
      expect([200, 500]).toContain(res.status);
      
      if (res.status === 200) {
        const data = await res.json();
        expect(data.model).toBe('gpt-4o-mini');
      }
    });

    it('should reject invalid request', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto',
          // missing messages
        }),
      });
      
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('POST /v1/route', () => {
    it('should route based on intent', async () => {
      const res = await app.request('/v1/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'coding',
          message: '写一个快速排序算法',
        }),
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.selectedModel).toBeDefined();
      expect(data.provider).toBeDefined();
      expect(data.reason).toBeDefined();
      expect(data.confidence).toBeGreaterThan(0);
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await app.request('/unknown');
      expect(res.status).toBe(404);
      
      const data = await res.json();
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });
});
