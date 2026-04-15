import { describe, it, expect } from 'vitest';
import {
  createDefaultRules,
  addRule,
  removeRule,
  reorderRules,
  updateRule,
  createEmptyRule,
} from '@/lib/router-engine';
import type { RoutingRule } from '@/lib/types';

const makeRule = (id: string, isDefault = false): RoutingRule => ({
  id,
  condition: isDefault ? null : { attribute: 'complexity', matchValue: 'simple' },
  targetModelId: 'qwen3-coder',
  isDefault,
});

describe('router-engine', () => {
  it('createDefaultRules returns rules with default at end', () => {
    const rules = createDefaultRules('trading-bot', 'tpl-trading-bot');
    expect(rules.length).toBeGreaterThan(0);
    const lastRule = rules[rules.length - 1];
    expect(lastRule?.isDefault).toBe(true);
  });

  it('addRule inserts before default rule', () => {
    const rules = [makeRule('r1'), makeRule('r2', true)];
    const newRule = makeRule('r3');
    const result = addRule(rules, newRule);
    expect(result.length).toBe(3);
    expect(result[1]?.id).toBe('r3');
    expect(result[2]?.id).toBe('r2');
  });

  it('removeRule cannot remove default rule', () => {
    const rules = [makeRule('r1'), makeRule('r2', true)];
    const result = removeRule(rules, 'r2');
    expect(result.length).toBe(2);
  });

  it('removeRule removes non-default rule', () => {
    const rules = [makeRule('r1'), makeRule('r2', true)];
    const result = removeRule(rules, 'r1');
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe('r2');
  });

  it('reorderRules keeps default at end', () => {
    const rules = [makeRule('r1'), makeRule('r2'), makeRule('r3', true)];
    const result = reorderRules(rules, ['r2', 'r1']);
    expect(result[result.length - 1]?.id).toBe('r3');
    expect(result[0]?.id).toBe('r2');
    expect(result[1]?.id).toBe('r1');
  });

  it('updateRule updates specified rule', () => {
    const rules = [makeRule('r1'), makeRule('r2', true)];
    const result = updateRule(rules, 'r1', { targetModelId: 'deepseek-r1' });
    expect(result[0]?.targetModelId).toBe('deepseek-r1');
    expect(result[1]?.targetModelId).toBe('qwen3-coder');
  });

  it('createEmptyRule creates non-default rule', () => {
    const rule = createEmptyRule();
    expect(rule.isDefault).toBe(false);
    expect(rule.condition).not.toBeNull();
  });
});
