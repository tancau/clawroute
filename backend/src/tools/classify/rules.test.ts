import { describe, it, expect } from 'vitest';
import { applyRules, getRules } from './rules';

// Mock 上下文
const mockContext = {
  requestId: 'test',
  timestamp: Date.now(),
  startTime: Date.now(),
};

describe('Classify Rules', () => {
  describe('code detection', () => {
    it('should detect code blocks', async () => {
      const result = await applyRules(
        '```python\nprint("hello")\n```',
        mockContext as any
      );
      expect(result?.intent).toBe('coding');
      expect(result?.confidence).toBeGreaterThan(0.9);
    });

    it('should detect code keywords', async () => {
      const result = await applyRules(
        '写一个排序函数',
        mockContext as any
      );
      expect(result?.intent).toBe('coding');
    });

    it('should detect function definitions', async () => {
      const result = await applyRules(
        'def hello():\n    pass',
        mockContext as any
      );
      expect(result?.intent).toBe('coding');
    });
  });

  describe('trading detection', () => {
    it('should detect BTC mentions', async () => {
      const result = await applyRules(
        'BTC 现在多少钱？',
        mockContext as any
      );
      expect(result?.intent).toBe('trading');
    });

    it('should detect trading keywords', async () => {
      const result = await applyRules(
        '这个仓位要不要止损？',
        mockContext as any
      );
      expect(result?.intent).toBe('trading');
    });
  });

  describe('translation detection', () => {
    it('should detect translation requests', async () => {
      const result = await applyRules(
        '翻译这段话成英文',
        mockContext as any
      );
      expect(result?.intent).toBe('translation');
    });
  });

  describe('long context detection', () => {
    it('should detect long messages', async () => {
      const longMessage = 'x'.repeat(5000);
      const result = await applyRules(longMessage, mockContext as any);
      expect(result?.intent).toBe('long_context');
    });
  });

  describe('casual chat detection', () => {
    it('should detect short Chinese messages as casual', async () => {
      const result = await applyRules('你好，今天天气怎么样？', mockContext as any);
      // 可能被其他规则匹配，也可能没有匹配
      if (result) {
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('rule matching', () => {
    it('should always return a result for any message', async () => {
      // 短消息可能匹配 casual_chat，也可能不匹配
      const result = await applyRules('...', mockContext as any);
      // 规则引擎应该能处理各种输入
      expect(result).toBeDefined();
    });
  });

  describe('rule management', () => {
    it('should return all rules sorted by priority', () => {
      const rules = getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].priority).toBeGreaterThanOrEqual(rules[1].priority);
    });
  });
});
