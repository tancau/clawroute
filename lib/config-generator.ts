import type { ModelSelection, HopLLMConfig, HopLLMProviderEntry, HopLLMModelEntry } from './types';
import { getModelById } from './models-db';

/**
 * Provider metadata for config generation.
 * Maps provider IDs to their config details.
 */
const PROVIDER_META: Record<string, {
  baseUrl: string;
  api: string;
}> = {
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', api: 'openai-completions' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', api: 'openai-completions' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', api: 'openai-completions' },
  openai: { baseUrl: 'https://api.openai.com/v1', api: 'openai-completions' },
  google: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', api: 'openai-completions' },
  mistral: { baseUrl: 'https://api.mistral.ai/v1', api: 'openai-completions' },
  meta: { baseUrl: 'https://openrouter.ai/api/v1', api: 'openai-completions' },
  cohere: { baseUrl: 'https://api.cohere.ai/v2', api: 'openai-completions' },
};

/** Round cost to avoid floating point artifacts */
function roundCost(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

/** Extract the short model ID from a provider/model ref */
function shortModelId(fullId: string): string {
  const idx = fullId.indexOf('/');
  return idx >= 0 ? fullId.slice(idx + 1) : fullId;
}

/** Extract provider from a provider/model ref */
function providerFromId(fullId: string): string {
  const idx = fullId.indexOf('/');
  return idx >= 0 ? fullId.slice(0, idx) : 'unknown';
}

/**
 * Build a HopLLM-compatible JSON config from a ModelSelection.
 *
 * Output matches the real hopllm.json structure:
 * - models.providers (only used providers with their models)
 * - agents.defaults.model.primary + fallbacks
 * - agents.defaults.models (allowlist with aliases)
 */
export function generateHopLLMConfig(selection: ModelSelection): string {
  const allModelIds = [selection.primaryModelId, ...selection.fallbackModelIds];

  // 1. Collect which model IDs are used and map to providers
  const providerUsedModels: Map<string, Set<string>> = new Map();
  for (const modelId of allModelIds) {
    const provider = providerFromId(modelId);
    if (!providerUsedModels.has(provider)) {
      providerUsedModels.set(provider, new Set());
    }
    providerUsedModels.get(provider)!.add(modelId);
  }

  // 2. Build provider configs
  const providersConfig: Record<string, HopLLMProviderEntry> = {};

  for (const [providerId, usedModelIdSet] of Array.from(providerUsedModels.entries())) {
    const meta = PROVIDER_META[providerId];
    if (!meta) continue;

    const modelsForConfig: HopLLMModelEntry[] = [];
    for (const modelId of Array.from(usedModelIdSet)) {
      const model = getModelById(modelId);
      const entry: HopLLMModelEntry = {
        id: shortModelId(modelId),
        name: model?.name ?? shortModelId(modelId),
        input: model?.input ?? ['text'],
      };

      // Add context window and max tokens
      if (model?.contextWindow) entry.contextWindow = model.contextWindow;
      if (model?.maxTokens) entry.maxTokens = model.maxTokens;

      // Add cost if non-zero
      const costPer1K = model?.costPer1KToken ?? 0;
      if (costPer1K > 0) {
        entry.cost = {
          input: roundCost(costPer1K),
          output: roundCost(costPer1K * 1.5),
          cacheRead: 0,
          cacheWrite: 0,
        };
      } else if (costPer1K === 0) {
        entry.cost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
      }

      modelsForConfig.push(entry);
    }

    providersConfig[providerId] = {
      baseUrl: meta.baseUrl,
      apiKey: '',
      api: meta.api,
      models: modelsForConfig,
    };
  }

  // 3. Build agents.defaults.models allowlist with aliases
  const modelsAllowlist: Record<string, { alias: string }> = {};
  for (const modelId of allModelIds) {
    const model = getModelById(modelId);
    modelsAllowlist[modelId] = {
      alias: model?.name ?? shortModelId(modelId),
    };
  }

  // 4. Assemble full config
  const config: HopLLMConfig = {
    models: {
      mode: 'merge',
      providers: providersConfig,
    },
    agents: {
      defaults: {
        model: {
          primary: selection.primaryModelId,
          fallbacks: selection.fallbackModelIds,
        },
        models: modelsAllowlist,
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

/** Validate HopLLM JSON config */
export function validateConfig(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) return false;
    const obj = parsed as Record<string, unknown>;
    if (!('models' in obj) || !('agents' in obj)) return false;
    const agents = obj.agents as Record<string, unknown>;
    const defaults = agents?.defaults as Record<string, unknown>;
    const model = defaults?.model as Record<string, unknown>;
    return typeof model?.primary === 'string';
  } catch {
    return false;
  }
}
