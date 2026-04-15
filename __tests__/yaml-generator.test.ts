import { describe, it, expect } from 'vitest';
import { generateYaml, validateYaml } from '@/lib/yaml-generator';
import type { RoutingRule, Model } from '@/lib/types';

const mockModels: Model[] = [
  {
    id: 'qwen3-coder',
    name: 'Qwen3 Coder',
    provider: 'qwen',
    costPer1KToken: 0.0001,
    speedRating: 3,
    qualityRating: 2,
    capabilityTags: ['coding'],
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    costPer1KToken: 0.001,
    speedRating: 1,
    qualityRating: 3,
    capabilityTags: ['reasoning'],
  },
];

const makeRule = (
  id: string,
  targetModelId: string,
  isDefault = false,
  condition: RoutingRule['condition'] = null
): RoutingRule => ({
  id,
  condition: isDefault ? null : condition,
  targetModelId,
  isDefault,
});

describe('yaml-generator', () => {
  it('generates valid YAML', () => {
    const rules = [
      makeRule('r1', 'qwen3-coder', false, { attribute: 'complexity', matchValue: 'simple' }),
      makeRule('r2', 'deepseek-r1', true),
    ];
    const yaml = generateYaml(rules, mockModels);
    expect(yaml).toContain('models');
    expect(yaml).toContain('qwen3-coder');
    expect(validateYaml(yaml)).toBe(true);
  });

  it('default rule has no when field', () => {
    const rules = [makeRule('r1', 'deepseek-r1', true)];
    const yaml = generateYaml(rules, mockModels);
    expect(yaml).not.toContain('when');
  });

  it('condition rule generates when field', () => {
    const rules = [
      makeRule('r1', 'qwen3-coder', false, { attribute: 'complexity', matchValue: 'simple' }),
    ];
    const yaml = generateYaml(rules, mockModels);
    expect(yaml).toContain('when');
    expect(yaml).toContain('complexity');
  });

  it('hasCode condition maps to has_code', () => {
    const rules = [
      makeRule('r1', 'qwen3-coder', false, { attribute: 'hasCode', matchValue: 'true' }),
    ];
    const yaml = generateYaml(rules, mockModels);
    expect(yaml).toContain('has_code');
  });

  it('validateYaml returns false for invalid YAML', () => {
    expect(validateYaml('not yaml {{{')).toBe(false);
    expect(validateYaml('')).toBe(false);
  });
});
