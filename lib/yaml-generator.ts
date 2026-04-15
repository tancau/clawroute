import yaml from 'js-yaml';
import type { RoutingRule, RuleCondition } from './types';
import { getAllProviders, getModelsByProvider } from './models-db';

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

/** Generate OpenClaw config structure - MUST match official OpenClaw format */
export function generateOpenClawConfig(rules: RoutingRule[]): string {
  // Get all providers with their models
  const providers = getAllProviders();
  
  // Build the config matching OpenClaw's expected format
  const modelsConfig: Record<string, unknown> = {
    mode: 'merge',
    providers: {} as Record<string, unknown>,
  };

  // Track which models are actually used in rules
  const usedModelIds = new Set<string>();
  const modelRouting: Array<{when?: Record<string, unknown>; use: string}> = [];

  for (const rule of rules) {
    usedModelIds.add(rule.targetModelId);

    // Build routing rule
    const modelRef = `${rule.targetModelId}`;
    if (rule.condition) {
      modelRouting.push({
        when: conditionToWhen(rule.condition),
        use: modelRef,
      });
    } else {
      // Default rule
      modelRouting.push({
        use: modelRef,
      });
    }
  }

  // Add providers with their full model configs
  for (const provider of providers) {
    const providerModels = getModelsByProvider(provider.id);
    if (providerModels.length === 0) continue;

    (modelsConfig.providers as Record<string, unknown>)[provider.id] = {
      // Provider endpoint
      baseUrl: provider.baseUrl,
      // Environment variable name for API key (user fills this in their env)
      apiKey: provider.apiKeyEnvVar,
      // Model list matching OpenClaw format
      models: providerModels.map(model => ({
        id: model.id,
        name: model.name,
        // OpenClaw cost format: { input, output, cacheRead, cacheWrite }
        cost: {
          input: model.costPer1KToken,
          output: model.costPer1KToken * 1.5, // Estimate output as 1.5x input
          cacheRead: 0,
          cacheWrite: 0,
        },
        // Optional metadata
        contextWindow: 128000, // Default context window
      })),
    };
  }

  const config = { models: modelsConfig };

  // Format as YAML with proper quoting
  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}

/** Legacy format - simplified view (for reference only) */
export function generateYaml(rules: RoutingRule[]): string {
  const entries: Array<Record<string, unknown>> = [];

  for (const rule of rules) {
    const entry: Record<string, unknown> = {
      name: rule.targetModelId,
    };

    if (rule.condition) {
      entry.routing = {
        when: [conditionToWhen(rule.condition)],
        use: rule.targetModelId,
      };
    } else {
      entry.routing = {
        use: rule.targetModelId,
      };
    }

    entries.push(entry);
  }

  const output = { models: entries };
  return yaml.dump(output, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
  });
}

/** Validate YAML format */
export function validateYaml(yamlString: string): boolean {
  try {
    const parsed = yaml.load(yamlString);
    if (typeof parsed !== 'object' || parsed === null) return false;
    const obj = parsed as Record<string, unknown>;
    // Basic validation - has models section
    return 'models' in obj;
  } catch {
    return false;
  }
}
