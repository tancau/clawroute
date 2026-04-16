import yaml from 'js-yaml';
import type { RoutingRule, RuleCondition } from './types';
import { getAllProviders, getModelsByProvider } from './models-db';

/** Round a number to avoid floating point artifacts like 0.0045000000000000005 */
function roundCost(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

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

// findModelProvider removed - lookup is done inline in generateOpenClawConfig

/**
 * Generate OpenClaw-compatible config YAML.
 *
 * Only includes providers/models that are actually referenced in the rules.
 * Output format matches the real openclaw.json structure.
 */
export function generateOpenClawConfig(rules: RoutingRule[]): string {
  const providers = getAllProviders();

  // 1. Collect which model IDs are used in rules
  const usedModelIds = new Set<string>();
  for (const rule of rules) {
    usedModelIds.add(rule.targetModelId);
  }

  // 2. Map model IDs to their providers
  const providerUsedModels: Map<string, Set<string>> = new Map();
  const usedModelIdList = Array.from(usedModelIds);
  for (const modelId of usedModelIdList) {
    for (const provider of providers) {
      const models = getModelsByProvider(provider.id);
      if (models.some(m => m.id === modelId)) {
        if (!providerUsedModels.has(provider.id)) {
          providerUsedModels.set(provider.id, new Set());
        }
        providerUsedModels.get(provider.id)!.add(modelId);
        break;
      }
    }
  }

  // 3. Build routing rules
  const modelRouting: Array<{ when?: Record<string, unknown>; use: string }> = [];
  for (const rule of rules) {
    if (rule.condition) {
      modelRouting.push({
        when: conditionToWhen(rule.condition),
        use: rule.targetModelId,
      });
    } else {
      modelRouting.push({
        use: rule.targetModelId,
      });
    }
  }

  // 4. Build provider configs — only used providers and their used models
  const providersConfig: Record<string, unknown> = {};

  for (const [providerId, usedModelIdSet] of Array.from(providerUsedModels.entries())) {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) continue;

    const allModels = getModelsByProvider(providerId);
    const modelsForConfig = allModels
      .filter(m => usedModelIdSet.has(m.id))
      .map(m => {
        const modelEntry: Record<string, unknown> = {
          id: m.id,
          name: m.name,
          input: (m as unknown as Record<string, unknown>).input || ['text'],
        };

        // Add cost if non-zero (skip for free models to keep config clean)
        const costPer1K = (m as unknown as Record<string, unknown>).costPer1KToken as number;
        if (costPer1K && costPer1K > 0) {
          modelEntry.cost = {
            input: roundCost(costPer1K),
            output: roundCost(costPer1K * 1.5),
            cacheRead: 0,
            cacheWrite: 0,
          };
        }

        // Add contextWindow and maxTokens from provider data
        const cw = (m as unknown as Record<string, unknown>).contextWindow;
        const mt = (m as unknown as Record<string, unknown>).maxTokens;
        if (cw) modelEntry.contextWindow = cw;
        if (mt) modelEntry.maxTokens = mt;

        return modelEntry;
      });

    providersConfig[providerId] = {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKeyEnvVar,
      api: (provider as unknown as Record<string, unknown>).api || 'openai-completions',
      models: modelsForConfig,
    };
  }

  // 5. Assemble full config
  const config = {
    models: {
      mode: 'merge',
      providers: providersConfig,
      // Add routing if we have conditional rules
      ...(modelRouting.length > 0 && modelRouting.some(r => r.when)
        ? { routing: modelRouting }
        : {}),
    },
  };

  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
    sortKeys: false,
  });
}

/** Legacy format - simplified view (for reference only) */
export function generateYaml(rules: RoutingRule[]): string {
  return generateOpenClawConfig(rules);
}

/** Validate YAML format */
export function validateYaml(yamlString: string): boolean {
  try {
    const parsed = yaml.load(yamlString);
    if (typeof parsed !== 'object' || parsed === null) return false;
    const obj = parsed as Record<string, unknown>;
    return 'models' in obj;
  } catch {
    return false;
  }
}
