/**
 * Billing & Earnings Tests - Phase 2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  calculateCost, 
  calculateSavings, 
  calculateCommission, 
  COMMISSION_RATES 
} from '../billing';
import { 
  getEarningSharePercent,
  calculateEarning,
  getUserEarningsSummary,
  getEarningsByProvider,
  getEarningsTrend,
  requestWithdraw
} from '../billing/earnings';
import { db, initDatabase } from '../db';
import { createUser, getUser } from '../users';
import { getKeys, submitKey } from '../keys';

describe('Billing - Cost Calculation', () => {
  it('should calculate cost for GPT-4', () => {
    const cost = calculateCost('gpt-4', 1000, 1000);
    // $30/1M output + $30/1M input = 9 cents for 1K tokens
    expect(cost).toBe(9);
  });

  it('should calculate cost for Claude 3', () => {
    const cost = calculateCost('claude-3-sonnet', 1000, 1000);
    // $15/1M output + $3/1M input = $0.018/1K tokens = 2 cents (rounded)
    expect(cost).toBe(2);
  });

  it('should return 0 for free tier', () => {
    const cost = calculateCost('free-tier', 1000, 1000);
    expect(cost).toBe(0);
  });
});

describe('Billing - Savings Calculation', () => {
  it('should calculate savings for paid tier', () => {
    const savings = calculateSavings('gpt-3.5-turbo', 1000, 1000, 'paid');
    // Baseline: GPT-4 = 6 cents, Actual: gpt-3.5-turbo = 0.2 cents
    // Savings = 6 - 0.2 = 5.8 ≈ 6 cents
    expect(savings).toBeGreaterThan(0);
  });

  it('should return 0 for free tier', () => {
    const savings = calculateSavings('gpt-3.5-turbo', 1000, 1000, 'free');
    expect(savings).toBe(0);
  });
});

describe('Billing - Commission Calculation', () => {
  it('should calculate 5% for free tier', () => {
    const commission = calculateCommission(100, 'free');
    expect(commission).toBe(5);
  });

  it('should calculate 50% for paid tier', () => {
    const commission = calculateCommission(100, 'paid');
    expect(commission).toBe(50);
  });

  it('should use default rate for unknown tier', () => {
    const commission = calculateCommission(100, 'unknown');
    expect(commission).toBe(5); // default to free tier rate
  });
});

describe('Earnings - Share Percent', () => {
  it('should return 5% for free tier', () => {
    const percent = getEarningSharePercent('openai', 'free');
    expect(percent).toBe(5);
  });

  it('should return 50% for paid tier', () => {
    const percent = getEarningSharePercent('openai', 'paid');
    expect(percent).toBe(50);
  });

  it('should return 30% for enterprise tier', () => {
    const percent = getEarningSharePercent('google', 'enterprise');
    expect(percent).toBe(30);
  });
});

describe('Earnings - Calculate Earning', () => {
  it('should calculate earning for key contributor', () => {
    const result = calculateEarning(
      {
        model: 'gpt-4',
        inputTokens: 1000,
        outputTokens: 1000,
      },
      {
        keyId: 'key-123',
        userId: 'user-123',
        provider: 'openai',
        tier: 'paid',
      }
    );

    expect(result.costCents).toBeGreaterThan(0);
    expect(result.sharePercent).toBe(50);
    expect(result.earningCents).toBeGreaterThan(0);
  });

  it('should calculate earning for free tier', () => {
    const result = calculateEarning(
      {
        model: 'gpt-4',
        inputTokens: 1000,
        outputTokens: 1000,
      },
      {
        keyId: 'key-123',
        userId: 'user-123',
        provider: 'openai',
        tier: 'free',
      }
    );

    expect(result.earningCents).toBe(0); // 5% of 6 cents = 0.3 ≈ 0
  });
});

describe('Database - Earnings Tables', () => {
  beforeEach(() => {
    // Initialize fresh test database
    initDatabase();
  });

  it('should have earning_records table', () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `).all() as any[];
    
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('earning_records');
    expect(tableNames).toContain('earning_summary');
    expect(tableNames).toContain('withdraw_requests');
  });

  it('should have provider_metrics table', () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `).all() as any[];
    
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('provider_metrics');
  });
});

describe('Provider Status', () => {
  beforeEach(() => {
    initDatabase();
  });

  it('should initialize provider metrics table', () => {
    const row = db.prepare('SELECT * FROM provider_metrics').all();
    expect(Array.isArray(row)).toBe(true);
  });
});
