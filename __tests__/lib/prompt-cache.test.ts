import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordPromptCache,
  findCacheHit,
  calculateCacheAwareCost,
  getCacheStats,
} from '@/lib/prompt-cache';

/** 构造足够长的消息以越过 deepseek 的 minPrefixTokens(64) 门槛（需 join 长度 ≥ 192） */
function longMessage(prefix: string): Array<{ role: string; content: string }> {
  return [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: `${prefix}-${'x'.repeat(220)}` },
  ];
}

describe('prompt-cache / recordPromptCache', () => {
  it('skips non-cacheable providers (no record)', () => {
    const msgs = longMessage('noncache');
    recordPromptCache(msgs, 'groq', 'groq-model');
    expect(findCacheHit(msgs, ['groq'])).toBeNull();
  });

  it('skips prompts shorter than minPrefixTokens', () => {
    const shortMsgs = [{ role: 'user', content: 'hi' }];
    recordPromptCache(shortMsgs, 'deepseek', 'deepseek-chat');
    expect(findCacheHit(shortMsgs, ['deepseek'])).toBeNull();
  });

  it('records cacheable provider and is found via findCacheHit', () => {
    const msgs = longMessage('hit-ok');
    recordPromptCache(msgs, 'deepseek', 'deepseek-chat');
    const hit = findCacheHit(msgs, ['deepseek']);
    expect(hit).not.toBeNull();
    expect(hit!.provider).toBe('deepseek');
    expect(hit!.model).toBe('deepseek-chat');
    expect(hit!.cacheDiscount).toBe(0.1);
  });

  it('increments hitCount on repeated record for same provider+model', () => {
    const msgs = longMessage('repeat');
    recordPromptCache(msgs, 'deepseek', 'deepseek-chat');
    recordPromptCache(msgs, 'deepseek', 'deepseek-chat');
    const hit = findCacheHit(msgs, ['deepseek']);
    expect(hit!.hitCount).toBeGreaterThanOrEqual(2);
  });
});

describe('prompt-cache / findCacheHit', () => {
  it('returns null when no entry for the prefix', () => {
    expect(findCacheHit(longMessage('miss'), ['deepseek'])).toBeNull();
  });

  it('returns null when cached provider not in candidate list', () => {
    const msgs = longMessage('notcandidate');
    recordPromptCache(msgs, 'anthropic', 'claude-3');
    expect(findCacheHit(msgs, ['deepseek'])).toBeNull();
  });

  it('prefers earlier candidate among multiple cached providers', () => {
    const msgs = longMessage('multi');
    recordPromptCache(msgs, 'deepseek', 'deepseek-chat');
    recordPromptCache(msgs, 'anthropic', 'claude-3');
    // deepseek 在候选列表中更靠前 → 应优先返回
    const hit = findCacheHit(msgs, ['deepseek', 'anthropic']);
    expect(hit!.provider).toBe('deepseek');
  });
});

describe('prompt-cache / calculateCacheAwareCost', () => {
  it('applies cache discount when hit provided', () => {
    // 1000 tokens * $1/1M = $0.001；命中 0.1 折扣 → $0.0001
    const cost = calculateCacheAwareCost(1, 1000, { cacheDiscount: 0.1 });
    expect(cost).toBeCloseTo(0.0001, 10);
  });

  it('returns full cost when no cache hit', () => {
    const cost = calculateCacheAwareCost(1, 1000, null);
    expect(cost).toBeCloseTo(0.001, 10);
  });
});

describe('prompt-cache / getCacheStats', () => {
  beforeEach(() => {
    // 通过记录新条目累积统计
    recordPromptCache(longMessage('stats-1'), 'deepseek', 'deepseek-chat');
    recordPromptCache(longMessage('stats-2'), 'anthropic', 'claude-3');
  });

  it('aggregates totalEntries and totalHits', () => {
    const stats = getCacheStats();
    expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
    expect(stats.totalHits).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(stats.topCachedPrefixes)).toBe(true);
  });
});
