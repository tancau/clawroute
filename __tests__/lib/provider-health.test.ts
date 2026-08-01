import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordProviderHealth,
  getProviderHealth,
  getProviderHealthSummary,
  filterProvidersByHealth,
  isProviderAvailable,
  unblockProvider,
} from '@/lib/provider-health';

describe('provider-health / status computation', () => {
  it('healthy when a fast success recorded', () => {
    const p = 'ph-healthy';
    recordProviderHealth(p, true, 100);
    const rec = getProviderHealth(p);
    expect(rec.status).toBe('healthy');
    expect(rec.successCount).toBe(1);
    expect(rec.errorCount).toBe(0);
  });

  it('degraded when latency exceeds 10s', () => {
    const p = 'ph-degraded-latency';
    recordProviderHealth(p, true, 10_001);
    const rec = getProviderHealth(p);
    expect(rec.status).toBe('degraded');
  });

  it('down when latency exceeds 30s', () => {
    const p = 'ph-down-latency';
    recordProviderHealth(p, true, 30_000);
    const rec = getProviderHealth(p);
    expect(rec.status).toBe('down');
  });

  it('degraded when errorRate between 10% and 50% (no consecutive block)', () => {
    const p = 'ph-degraded-errrate';
    // 9 成功 + 1 失败 → errorRate 0.1（降级阈值），且仅 1 次连续错误不触发屏蔽
    for (let i = 0; i < 9; i++) recordProviderHealth(p, true, 100);
    recordProviderHealth(p, false, 100, 'boom');
    const rec = getProviderHealth(p);
    expect(rec.errorRate).toBe(0.1);
    expect(rec.status).toBe('degraded');
  });
});

describe('provider-health / consecutive-error auto-block', () => {
  it('blocks provider after 5 consecutive errors and filters it out', () => {
    const p = 'ph-block';
    for (let i = 0; i < 5; i++) recordProviderHealth(p, false, 500, `err${i}`);

    expect(isProviderAvailable(p)).toBe(false);

    const candidates = [
      { provider: p, model: 'm' },
      { provider: 'ph-other-ok', model: 'm' },
    ];
    const filtered = filterProvidersByHealth(candidates);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.provider).toBe('ph-other-ok');

    // getProviderHealth 应反映 down（被屏蔽）
    expect(getProviderHealth(p).status).toBe('down');
  });

  it('a success unblocks the provider automatically', () => {
    const p = 'ph-unblock';
    for (let i = 0; i < 5; i++) recordProviderHealth(p, false, 500);
    expect(isProviderAvailable(p)).toBe(false);

    recordProviderHealth(p, true, 100);
    expect(isProviderAvailable(p)).toBe(true);
  });

  it('unblockProvider manually clears the block', () => {
    const p = 'ph-manual-unblock';
    for (let i = 0; i < 5; i++) recordProviderHealth(p, false, 500);
    expect(isProviderAvailable(p)).toBe(false);

    unblockProvider(p);
    expect(isProviderAvailable(p)).toBe(true);
  });
});

describe('provider-health / getProviderHealthSummary', () => {
  beforeEach(() => {
    // 制造一个 down 的 provider 影响 overallStatus
    const p = 'ph-summary-down';
    for (let i = 0; i < 5; i++) recordProviderHealth(p, false, 500);
  });

  it('overallStatus reflects worst provider (down)', () => {
    const summary = getProviderHealthSummary();
    expect(summary.overallStatus).toBe('down');
    expect(summary.providers.length).toBeGreaterThan(0);
    expect(summary.timestamp).toBeGreaterThan(0);
  });
});
