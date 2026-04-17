/**
 * 分析模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateCost, compareCost, getModelPricing, MODEL_PRICING } from '../analytics/cost';

describe('Analytics - Cost', () => {
  describe('getModelPricing', () => {
    it('should return correct pricing for known models', () => {
      const gpt4 = getModelPricing('gpt-4');
      expect(gpt4.input).toBe(3.0);
      expect(gpt4.output).toBe(6.0);
    });

    it('should return default pricing for unknown models', () => {
      const unknown = getModelPricing('unknown-model');
      expect(unknown.input).toBeGreaterThan(0);
      expect(unknown.output).toBeGreaterThan(0);
    });

    it('should return correct pricing for gpt-4o-mini', () => {
      const pricing = getModelPricing('gpt-4o-mini');
      expect(pricing.input).toBe(0.015);
      expect(pricing.output).toBe(0.06);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly', () => {
      // GPT-4: input $3/1K, output $6/1K
      const cost = calculateCost(1000, 500, 'gpt-4');
      // input: 1 * 3 = 3 cents
      // output: 0.5 * 6 = 3 cents
      // total: 6 cents
      expect(cost).toBe(600); // in cents
    });

    it('should handle zero tokens', () => {
      const cost = calculateCost(0, 0, 'gpt-4');
      expect(cost).toBe(0);
    });

    it('should round to nearest cent', () => {
      const cost = calculateCost(100, 100, 'gpt-4o');
      // input: 0.1 * 0.25 = 0.025 cents
      // output: 0.1 * 1 = 0.1 cents
      // total: 0.125 cents -> rounds
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('compareCost', () => {
    it('should compare against GPT-4 baseline', () => {
      const comparison = compareCost(1000, 500, 'gpt-4o-mini');
      
      expect(comparison.originalModel).toBe('gpt-4');
      expect(comparison.actualModel).toBe('gpt-4o-mini');
      // GPT-4o-mini 应该比 GPT-4 便宜
      expect(comparison.actualCostCents).toBeLessThan(comparison.originalCostCents);
    });

    it('should show savings when using cheaper models', () => {
      // Use a much cheaper model with more tokens
      const comparison = compareCost(100000, 100000, 'deepseek-chat');
      
      expect(comparison.actualCostCents).toBeLessThan(comparison.originalCostCents);
      expect(comparison.savedPercent).toBeGreaterThan(50);
    });

    it('should handle zero tokens', () => {
      const comparison = compareCost(0, 0, 'gpt-4o');
      
      expect(comparison.originalCostCents).toBe(0);
      expect(comparison.actualCostCents).toBe(0);
      expect(comparison.savedCents).toBe(0);
    });
  });
});
