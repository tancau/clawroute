import { describe, it, expect, beforeEach, vi } from 'vitest';

// 统一 mock 数据访问层：budget-guard 仅依赖 getDb
vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn(),
}));

import { getDb } from '@/lib/db/client';
import {
  filterModelsByBudgetTier,
  createBudgetAlert,
  getBudgetConfig,
  setBudgetConfig,
  getBudgetStatus,
  checkBudgetAndGetModelTier,
} from '@/lib/budget-guard';

const getDbMock = getDb as unknown as vi.Mock;

/** 构造一个作为 tagged template 使用的 sql mock（被 `db\`...\`` 调用） */
function makeSqlMock() {
  return vi.fn().mockResolvedValue({ rows: [] });
}

const sampleModels = [
  { model: 'gpt-expensive', cost: 5, isFree: false },
  { model: 'cheap-small', cost: 0.2, isFree: false },
  { model: 'qwen-free', cost: 0, isFree: true },
];

describe('budget-guard / filterModelsByBudgetTier', () => {
  it('free tier only returns free models', () => {
    const result = filterModelsByBudgetTier(sampleModels, 'free');
    expect(result).toHaveLength(1);
    expect(result[0]!.model).toBe('qwen-free');
  });

  it('cheap tier returns free + low-cost (<0.5) models', () => {
    const result = filterModelsByBudgetTier(sampleModels, 'cheap');
    expect(result.map(m => m.model).sort()).toEqual(['cheap-small', 'qwen-free']);
  });

  it('full tier returns all models', () => {
    expect(filterModelsByBudgetTier(sampleModels, 'full')).toHaveLength(3);
  });
});

describe('budget-guard / createBudgetAlert', () => {
  it('returns null when status is normal', () => {
    expect(createBudgetAlert({
      status: 'normal', usagePercent: 10, monthlyLimitUsd: 100, currentSpendUsd: 10,
    } as never)).toBeNull();
  });

  // createBudgetAlert 内部用一个 Record 字面量一次性构造 warning/downgrade/block 三条
  // 告警消息，因此 status 需包含三则消息用到的全部字段（usagePercent / currentSpendUsd /
  // monthlyLimitUsd / nextThreshold / modelTier），否则会触发 undefined.toFixed。
  const fullStatus = (overrides: Record<string, unknown>) => ({
    userId: 'u', monthlyLimitUsd: 100, currentSpendUsd: 50, usagePercent: 50,
    projectedSpendUsd: 100, daysRemaining: 15, dailyAvgSpendUsd: 5,
    status: 'normal', nextThreshold: 80, modelTier: 'full',
    ...overrides,
  });

  it('returns warning alert for warning status', () => {
    const alert = createBudgetAlert(fullStatus({ status: 'warning', usagePercent: 82 }) as never);
    expect(alert).not.toBeNull();
    expect(alert!.type).toBe('warning');
    expect(alert!.usagePercent).toBe(82);
  });

  it('returns downgrade alert for downgraded status', () => {
    const alert = createBudgetAlert(fullStatus({ status: 'downgraded', usagePercent: 92, modelTier: 'free' }) as never);
    expect(alert!.type).toBe('downgrade');
  });

  it('returns block alert for blocked status', () => {
    const alert = createBudgetAlert(fullStatus({ status: 'blocked', usagePercent: 100 }) as never);
    expect(alert!.type).toBe('block');
  });
});

describe('budget-guard / getBudgetConfig', () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it('returns default config when db unavailable (null)', async () => {
    getDbMock.mockResolvedValue(null);
    const config = await getBudgetConfig('no-db-user');
    expect(config.monthlyLimitUsd).toBe(0);
    expect(config.warningThreshold).toBe(0.8);
    expect(config.userId).toBe('no-db-user');
  });

  it('returns cached config without hitting db after setBudgetConfig', async () => {
    // setBudgetConfig 即使 db 不可用也会写入内存缓存
    getDbMock.mockResolvedValue(null);
    await setBudgetConfig({
      userId: 'cache-user-1',
      monthlyLimitUsd: 42,
      warningThreshold: 0.8,
      downgradeThreshold: 0.9,
      blockThreshold: 1.0,
      downgradeToFree: true,
      notifyOnWarning: true,
    });

    getDbMock.mockClear();
    const config = await getBudgetConfig('cache-user-1');
    expect(config.monthlyLimitUsd).toBe(42);
    // 缓存命中：不应再访问 db
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('cache expires after TTL and re-queries db', async () => {
    vi.useFakeTimers();
    try {
      getDbMock.mockResolvedValue(null);
      await setBudgetConfig({
        userId: 'cache-expire-user',
        monthlyLimitUsd: 99,
        warningThreshold: 0.8,
        downgradeThreshold: 0.9,
        blockThreshold: 1.0,
        downgradeToFree: true,
        notifyOnWarning: true,
      });

      // 推进 61s，超过 60s TTL
      vi.advanceTimersByTime(61_000);

      // db 返回空行 → 落到默认配置（monthlyLimitUsd 0）
      const sql = makeSqlMock();
      getDbMock.mockResolvedValue(sql);
      const config = await getBudgetConfig('cache-expire-user');
      expect(config.monthlyLimitUsd).toBe(0);
      expect(getDbMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('budget-guard / getBudgetStatus & checkBudgetAndGetModelTier', () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it('no monthly limit → status normal, modelTier full', async () => {
    const sql = makeSqlMock();
    // ensureBudgetTable(CREATE) → empty; SELECT budget → 月限额 0; SELECT SUM → 0
    sql.mockResolvedValueOnce({ rows: [] });
    sql.mockResolvedValueOnce({
      rows: [{
        monthly_limit_usd: '0', warning_threshold: '0.8', downgrade_threshold: '0.9',
        block_threshold: '1.0', downgrade_to_free: true, notify_on_warning: true, webhook_url: null,
      }],
    });
    sql.mockResolvedValueOnce({ rows: [{ total: '0' }] });
    getDbMock.mockResolvedValue(sql);

    const status = await getBudgetStatus('no-limit-user');
    expect(status.status).toBe('normal');
    expect(status.modelTier).toBe('full');
    expect(status.monthlyLimitUsd).toBe(0);
  });

  it('blocked budget → allowed true (downgrade strategy) + modelTier free', async () => {
    // 语义验证（DESIGN_EVALUATION P1-3）：blocked 仍 allowed:true，
    // 通过 modelTier='free' 控制可用模型，而非硬拦截。
    const sql = makeSqlMock();
    sql.mockResolvedValueOnce({ rows: [] }); // CREATE
    sql.mockResolvedValueOnce({
      rows: [{
        monthly_limit_usd: '10', warning_threshold: '0.8', downgrade_threshold: '0.9',
        block_threshold: '1.0', downgrade_to_free: true, notify_on_warning: true, webhook_url: null,
      }],
    }); // SELECT budget
    sql.mockResolvedValueOnce({ rows: [{ total: '10' }] }); // SELECT SUM → 100% → blocked
    getDbMock.mockResolvedValue(sql);

    const result = await checkBudgetAndGetModelTier('blocked-user');
    expect(result.allowed).toBe(true);
    expect(result.modelTier).toBe('free');
    expect(result.status.status).toBe('blocked');
  });

  it('warning threshold → modelTier cheap', async () => {
    const sql = makeSqlMock();
    sql.mockResolvedValueOnce({ rows: [] }); // CREATE
    sql.mockResolvedValueOnce({
      rows: [{
        monthly_limit_usd: '100', warning_threshold: '0.8', downgrade_threshold: '0.9',
        block_threshold: '1.0', downgrade_to_free: true, notify_on_warning: true, webhook_url: null,
      }],
    }); // SELECT budget
    sql.mockResolvedValueOnce({ rows: [{ total: '85' }] }); // 85% → warning
    getDbMock.mockResolvedValue(sql);

    const status = await getBudgetStatus('warning-user');
    expect(status.status).toBe('warning');
    expect(status.modelTier).toBe('cheap');
  });
});
