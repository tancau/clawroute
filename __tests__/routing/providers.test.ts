import { describe, it, expect } from 'vitest';
import {
  getProvider,
  getModelCapability,
  getModelsForIntent,
  getFreeModels,
  createProviderFromUserConfig,
  calculateRequestCost,
  providers,
  modelCapabilities,
} from '@/lib/routing/providers';

describe('routing/providers', () => {
  describe('getProvider', () => {
    it('returns provider by name', () => {
      const provider = getProvider('openai');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('openai');
      expect(provider?.baseUrl).toBe('https://api.openai.com/v1');
    });

    it('returns undefined for non-existent provider', () => {
      const provider = getProvider('non-existent');
      expect(provider).toBeUndefined();
    });

    it('returns undefined for disabled provider', () => {
      const provider = getProvider('disabled-provider');
      expect(provider).toBeUndefined();
    });
  });

  describe('getModelCapability', () => {
    it('returns capability for existing model', () => {
      const cap = getModelCapability('gpt-4o');
      expect(cap).toBeDefined();
      expect(cap?.provider).toBe('openai');
      expect(cap?.inputCost).toBeGreaterThan(0);
      expect(cap?.outputCost).toBeGreaterThan(0);
    });

    it('returns undefined for non-existent model', () => {
      const cap = getModelCapability('non-existent-model');
      expect(cap).toBeUndefined();
    });
  });

  describe('getModelsForIntent', () => {
    it('returns models sorted by quality for coding intent', () => {
      const models = getModelsForIntent('coding');
      expect(models.length).toBeGreaterThan(0);
      // Should be sorted by quality score descending
      for (let i = 1; i < models.length; i++) {
        expect(models[i - 1]!.qualityScore ?? 0).toBeGreaterThanOrEqual(models[i]!.qualityScore ?? 0);
      }
    });

    it('returns empty array for unknown intent', () => {
      const models = getModelsForIntent('unknown-intent-xyz');
      expect(models).toEqual([]);
    });

    it('all returned models support the requested intent', () => {
      const intent = 'reasoning';
      const models = getModelsForIntent(intent);
      for (const model of models) {
        expect(model.intents).toContain(intent);
      }
    });
  });

  describe('getFreeModels', () => {
    it('returns only free models', () => {
      const models = getFreeModels();
      expect(models.length).toBeGreaterThan(0);
      for (const model of models) {
        expect(model.features).toContain('free');
        expect(model.inputCost).toBe(0);
        expect(model.outputCost).toBe(0);
      }
    });
  });

  describe('createProviderFromUserConfig', () => {
    it('creates provider from user config', () => {
      const config = {
        name: 'My Custom Provider',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test123',
        models: ['model-a', 'model-b'],
        custom: true as const,
      };

      const provider = createProviderFromUserConfig('custom-1', config);

      expect(provider.name).toBe('custom-1');
      expect(provider.baseUrl).toBe('https://api.example.com/v1');
      expect(provider.apiKey).toBe('sk-test123');
      expect(provider.models).toEqual(['model-a', 'model-b']);
      expect(provider.custom).toBe(true);
      expect(provider.enabled).toBe(true);
      expect(provider.timeout).toBe(60000);
    });

    it('uses empty models array when not provided', () => {
      const config = {
        name: 'Minimal Provider',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test',
        custom: true as const,
      };

      const provider = createProviderFromUserConfig('minimal', config);
      expect(provider.models).toEqual([]);
    });
  });

  describe('calculateRequestCost', () => {
    it('calculates cost correctly for known model', () => {
      // gpt-4o: input $5/1M, output $15/1M
      const cost = calculateRequestCost('gpt-4o', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(20.0, 2); // $5 + $15 = $20
    });

    it('calculates cost for free model', () => {
      const cost = calculateRequestCost('google/gemma-3-27b-it:free', 1_000_000, 1_000_000);
      expect(cost).toBe(0);
    });

    it('uses default rate for unknown model', () => {
      const cost = calculateRequestCost('unknown-model', 1000, 1000);
      // Default: $0.01/1K tokens
      expect(cost).toBeCloseTo(0.02, 4);
    });

    it('handles zero tokens', () => {
      const cost = calculateRequestCost('gpt-4o', 0, 0);
      expect(cost).toBe(0);
    });

    it('calculates DeepSeek cost correctly', () => {
      // deepseek-chat: input $0.28/1M, output $0.42/1M
      const cost = calculateRequestCost('deepseek-chat', 2_000_000, 1_000_000);
      expect(cost).toBeCloseTo(0.56 + 0.42, 2); // $0.98
    });
  });

  describe('providers data integrity', () => {
    it('all providers have required fields', () => {
      for (const provider of providers) {
        expect(provider.name).toBeDefined();
        expect(provider.baseUrl).toBeDefined();
        expect(provider.models.length).toBeGreaterThan(0);
        expect(provider.timeout).toBeGreaterThan(0);
        expect(provider.priority).toBeGreaterThan(0);
      }
    });

    it('all model capabilities reference valid providers', () => {
      const providerNames = new Set(providers.map(p => p.name));
      for (const cap of modelCapabilities) {
        expect(providerNames.has(cap.provider)).toBe(true);
      }
    });

    it('all models have non-negative costs', () => {
      for (const cap of modelCapabilities) {
        expect(cap.inputCost).toBeGreaterThanOrEqual(0);
        expect(cap.outputCost).toBeGreaterThanOrEqual(0);
        expect(cap.contextWindow).toBeGreaterThan(0);
      }
    });
  });
});
