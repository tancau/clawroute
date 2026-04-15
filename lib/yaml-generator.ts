import yaml from 'js-yaml';
import type { RoutingRule, YamlModelEntry, RuleCondition } from './types';
import { getModelById, getAllModelsFlat } from './models-db';

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

/** Get full model ID with provider prefix */
function getFullModelId(modelId: string, provider: string): string {
  // If model ID already contains a slash (like OpenRouter models), return as-is
  if (modelId.includes('/')) {
    return modelId;
  }
  // Otherwise prefix with provider
  return `${provider}/${modelId}`;
}

/** Convert a single rule to OpenClaw models.providers format entry */
function ruleToProviderEntry(rule: RoutingRule): { provider: string; model: string } {
  const allModels = getAllModelsFlat();
  const targetModel = allModels.find((m) => m.id === rule.targetModelId) 
    ?? getModelById(rule.targetModelId);
  const provider = targetModel?.provider ?? 'unknown';
  const modelId = targetModel?.id ?? rule.targetModelId;

  return {
    provider,
    model: getFullModelId(modelId, provider),
  };
}

/** Generate OpenClaw config structure */
export function generateOpenClawConfig(rules: RoutingRule[]): string {
  const providers: Record<string, Set<string>> = {};
  const modelRouting: Array<{when?: Record<string, unknown>; use: string}> = [];

  for (const rule of rules) {
    const { provider, model } = ruleToProviderEntry(rule);
    
    // Track unique providers
    if (!providers[provider]) {
      providers[provider] = new Set();
    }
    providers[provider].add(model);

    // Build routing rule
    if (rule.condition) {
      modelRouting.push({
        when: conditionToWhen(rule.condition),
        use: model,
      });
    } else {
      // Default rule
      modelRouting.push({
        use: model,
      });
    }
  }

  // Build OpenClaw config structure
  const config = {
    models: {
      mode: 'merge',
      providers: {} as Record<string, unknown>,
    },
    agents: {
      defaults: {
        model: {
          primary: modelRouting[modelRouting.length - 1]?.use ?? 'unknown/unknown',
          fallbacks: [] as string[],
        },
      },
    },
  };

  // Add provider model lists
  for (const [provider, models] of Object.entries(providers)) {
    (config.models.providers as Record<string, unknown>)[provider] = {
      models: Array.from(models).map(modelId => {
        const allModels = getAllModelsFlat();
        const model = allModels.find(m => getFullModelId(m.id, m.provider ?? '') === modelId);
        if (model) {
          return {
            id: model.id,
            name: model.name,
          };
        }
        // For OpenRouter style models
        return {
          id: modelId,
          name: modelId.split('/').pop() ?? modelId,
        };
      }),
    };
  }

  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
  });
}

/** Generate simplified routing YAML (for reference) */
export function generateYaml(rules: RoutingRule[]): string {
  const entries: YamlModelEntry[] = rules.map((rule) => {
    const { provider, model } = ruleToProviderEntry(rule);
    
    const entry: YamlModelEntry = {
      name: model,
      provider,
      model,
      routing: {
        use: model,
      },
    };

    if (rule.condition) {
      entry.routing.when = [conditionToWhen(rule.condition)];
    }

    return entry;
  });

  const output = { models: entries };
  return yaml.dump(output, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
  });
}

/** Legacy format - kept for backward compatibility */
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
