import { describe, it, expect } from 'vitest';
import { ClassifyTool } from './index';

// Mock 上下文
const mockContext = {
  requestId: 'test',
  timestamp: Date.now(),
  startTime: Date.now(),
  cache: new Map(),
};

describe('ClassifyTool', () => {
  describe('input validation', () => {
    it('should accept valid input', () => {
      const result = ClassifyTool.inputSchema.safeParse({
        message: 'Hello',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty message', () => {
      const result = ClassifyTool.inputSchema.safeParse({
        message: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject too long message', () => {
      const result = ClassifyTool.inputSchema.safeParse({
        message: 'x'.repeat(60000),
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional history', () => {
      const result = ClassifyTool.inputSchema.safeParse({
        message: 'Hello',
        history: ['Hi', 'How are you?'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('tool properties', () => {
    it('should be enabled', () => {
      expect(ClassifyTool.isEnabled()).toBe(true);
    });

    it('should be concurrency safe', () => {
      expect(ClassifyTool.isConcurrencySafe({} as any)).toBe(true);
    });

    it('should be read only', () => {
      expect(ClassifyTool.isReadOnly({} as any)).toBe(true);
    });

    it('should not be destructive', () => {
      expect(ClassifyTool.isDestructive?.({} as any)).toBe(false);
    });
  });

  describe('classification', () => {
    it('should classify code request', async () => {
      const result = await ClassifyTool.call(
        { message: '写一个快速排序' },
        mockContext as any
      );
      expect(result.data.intent).toBe('coding');
      expect(result.data.confidence).toBeGreaterThan(0.8);
    });

    it('should classify trading request', async () => {
      const result = await ClassifyTool.call(
        { message: 'BTC 现在多少钱？' },
        mockContext as any
      );
      expect(result.data.intent).toBe('trading');
    });

    it('should return metadata with latency', async () => {
      const result = await ClassifyTool.call(
        { message: 'Hello' },
        mockContext as any
      );
      expect(result.metadata?.latencyMs).toBeDefined();
      expect(result.metadata?.latencyMs).toBeLessThan(100);
    });
  });
});
