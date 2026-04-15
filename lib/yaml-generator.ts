import yaml from 'js-yaml';
import type { RoutingRule, Model, YamlModelEntry, RuleCondition } from './types';
import { getModelById } from './models-db';

/** Convert a rule condition to YAML routing when field */
function conditionToWhen(condition: RuleCondition): Record<string, string | boolean> {
  const entry: Record<string, string | boolean> = {};
  switch (condition.attribute) {
    case 'complexity':
      entry.complexity = condition.matchValue;
      break;
    case 'hasCode':
      entry.has_code = condition.matchValue === 'true';
      break;
    case 'needsReasoning':
      entry.needs_reasoning = condition.matchValue === 'true';
      break;
    case 'inputTokenRange':
      entry.input_token_range = condition.matchValue;
      break;
  }
  return entry;
}

/** Convert a single rule to a YAML model entry */
export function ruleToYamlNode(rule: RoutingRule, models: Model[]): YamlModelEntry {
  const targetModel = models.find((m) => m.id === rule.targetModelId) ?? getModelById(rule.targetModelId);
  const modelName = targetModel ? targetModel.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase() : rule.targetModelId;
  const provider = targetModel?.provider ?? 'unknown';
  const modelId = targetModel?.id ?? rule.targetModelId;

  const entry: YamlModelEntry = {
    name: modelName,
    provider,
    model: modelId,
    routing: {
      use: modelId,
    },
  };

  if (rule.condition) {
    entry.routing.when = [conditionToWhen(rule.condition)];
  }

  return entry;
}

/** Generate YAML string from rules and models */
export function generateYaml(rules: RoutingRule[], models: Model[]): string {
  const entries = rules.map((rule) => ruleToYamlNode(rule, models));
  const output = { models: entries };
  return yaml.dump(output, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
  });
}

/** Validate generated YAML format */
export function validateYaml(yamlString: string): boolean {
  try {
    const parsed = yaml.load(yamlString);
    if (typeof parsed !== 'object' || parsed === null) return false;
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.models)) return false;
    return obj.models.every((m: unknown) => {
      if (typeof m !== 'object' || m === null) return false;
      const model = m as Record<string, unknown>;
      return typeof model.name === 'string' && typeof model.provider === 'string';
    });
  } catch {
    return false;
  }
}
