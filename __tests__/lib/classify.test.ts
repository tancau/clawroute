import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { classifyWithAI } from '@/lib/routing/classify';

describe('classify / classifyWithAI', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns null for short messages without calling AI', async () => {
    const fetchMock = fetch as unknown as vi.Mock;
    const result = await classifyWithAI('hi');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns AI classification (source=ai) on valid response', async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'coding' }),
    });

    const result = await classifyWithAI('please write a python function to sort a list of numbers');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('coding');
    expect(result!.source).toBe('ai');
    expect(result!.confidence).toBe(0.85);
  });

  it('returns cached result (source=cached) on second identical call, fetch once', async () => {
    const fetchMock = fetch as unknown as vi.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'analysis' }),
    });

    const msg = 'analyze this dataset and tell me the standard deviation of the values';
    const first = await classifyWithAI(msg);
    expect(first!.source).toBe('ai');

    const second = await classifyWithAI(msg);
    expect(second!.source).toBe('cached');
    expect(second!.intent).toBe('analysis');
    // 缓存命中：fetch 仅被调用一次
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when AI responds with unrecognized intent', async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'something_unknown' }),
    });
    const result = await classifyWithAI('perform a totally unrecognized kind of task here please');
    expect(result).toBeNull();
  });

  it('returns null when AI response has empty body', async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ response: '' }),
    });
    const result = await classifyWithAI('do some meaningful work with enough characters');
    expect(result).toBeNull();
  });

  it('returns null on non-ok HTTP status (graceful degrade)', async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({ ok: false, status: 500 });
    const result = await classifyWithAI('handle this request gracefully when the service is down');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws (Ollama unavailable / timeout)', async () => {
    (fetch as unknown as vi.Mock).mockRejectedValue(new Error('timeout'));
    const result = await classifyWithAI('classify this even though the ai service is unreachable');
    expect(result).toBeNull();
  });

  it('calls Ollama /api/generate endpoint', async () => {
    const fetchMock = fetch as unknown as vi.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'translation' }),
    });
    await classifyWithAI('translate the following english sentence into french for me please');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('/api/generate');
  });
});
