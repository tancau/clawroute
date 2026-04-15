import type { RoutingRule } from './types';
import templatesData from '@/data/templates.json';

let ruleCounter = 0;

/** Generate a unique rule ID */
export function generateRuleId(): string {
  ruleCounter += 1;
  return `rule-${Date.now()}-${ruleCounter}`;
}

/** Create default rules list from a scene template */
export function createDefaultRules(sceneId: string, templateId: string): RoutingRule[] {
  const template = templatesData.templates.find(
    (t) => t.id === templateId && t.sceneId === sceneId
  );
  if (!template) {
    // Return a single default rule if no template found
    return [
      {
        id: generateRuleId(),
        condition: null,
        targetModelId: '',
        isDefault: true,
      },
    ];
  }
  return template.rules.map((rule) => ({
    ...rule,
    id: generateRuleId(),
  })) as RoutingRule[];
}

/** Add a rule (inserted before the default rule) */
export function addRule(rules: RoutingRule[], newRule: RoutingRule): RoutingRule[] {
  const defaultIndex = rules.findIndex((r) => r.isDefault);
  if (defaultIndex === -1) return [...rules, newRule];
  return [
    ...rules.slice(0, defaultIndex),
    newRule,
    ...rules.slice(defaultIndex),
  ];
}

/** Remove a rule (cannot remove default rule) */
export function removeRule(rules: RoutingRule[], ruleId: string): RoutingRule[] {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule || rule.isDefault) return rules;
  return rules.filter((r) => r.id !== ruleId);
}

/** Reorder rules (default rule always stays at the end) */
export function reorderRules(rules: RoutingRule[], orderedIds: string[]): RoutingRule[] {
  const defaultRule = rules.find((r) => r.isDefault);
  const nonDefaultRules = rules.filter((r) => !r.isDefault);

  const reordered = orderedIds
    .map((id) => nonDefaultRules.find((r) => r.id === id))
    .filter((r): r is RoutingRule => r !== undefined);

  // Add any rules not in orderedIds at the end (before default)
  const missingRules = nonDefaultRules.filter(
    (r) => !orderedIds.includes(r.id)
  );

  return [...reordered, ...missingRules, ...(defaultRule ? [defaultRule] : [])];
}

/** Update a rule's properties */
export function updateRule(
  rules: RoutingRule[],
  ruleId: string,
  partial: Partial<RoutingRule>
): RoutingRule[] {
  return rules.map((rule) => {
    if (rule.id !== ruleId) return rule;
    return { ...rule, ...partial, id: rule.id }; // Preserve ID
  });
}

/** Create a new empty rule (non-default) */
export function createEmptyRule(): RoutingRule {
  return {
    id: generateRuleId(),
    condition: { attribute: 'complexity', matchValue: 'simple' },
    targetModelId: '',
    isDefault: false,
  };
}
