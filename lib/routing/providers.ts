/**
 * Provider 配置 - 用于 Next.js API Routes
 * 从 backend/src/config/providers.ts 迁移
 */

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKeyEnv?: string;  // 可选，用于系统配置的 API Key
  apiKey?: string;      // 可选，用户提供的 API Key
  models: string[];
  custom?: boolean;     // 标记为自定义 Provider
  rateLimit?: {
    rpm?: number;
    tpm?: number;
  };
  timeout: number;
  priority: number;
  enabled: boolean;
}

export interface ModelCapability {
  model: string;
  provider: string;
  intents: string[];
  contextWindow: number;
  inputCost: number; // per 1M tokens
  outputCost: number; // per 1M tokens
  avgLatency?: number; // ms
  qualityScore?: number;
  features?: string[];
}

/**
 * Provider 配置列表
 */
export const providers: ProviderConfig[] = [
  {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'],
    rateLimit: { rpm: 500, tpm: 30000 },
    timeout: 30000,
    priority: 95,
    enabled: true,
  },
  {
    name: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    models: ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-3-5-sonnet'],
    rateLimit: { rpm: 100, tpm: 40000 },
    timeout: 60000,
    priority: 98,
    enabled: true,
  },
  {
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    rateLimit: { rpm: 60 },
    timeout: 60000,
    priority: 85,
    enabled: true,
  },
  {
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    models: [
      'google/gemma-3-27b-it:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen3.5-plus:free',
      'deepseek/deepseek-reasoner:free',
    ],
    rateLimit: { rpm: 100 },
    timeout: 45000,
    priority: 60,
    enabled: true,
  },
  {
    name: 'litellm',
    baseUrl: process.env.LITELLM_URL || 'http://23.94.236.146:3000/v1',
    apiKeyEnv: 'LITELLM_API_KEY',
    models: ['qwen/qwen3.6-plus', 'qwen/qwen3-coder'],
    rateLimit: { rpm: 100 },
    timeout: 30000,
    priority: 50,
    enabled: true,
  },
  {
    name: 'infini-ai',
    baseUrl: 'https://cloud.infini-ai.com/maas/coding/v1',
    apiKeyEnv: 'INFINI_AI_API_KEY',
    models: ['glm-5', 'deepseek-v3.2'],
    rateLimit: { rpm: 60 },
    timeout: 60000,
    priority: 88,
    enabled: true,
  },
];

/**
 * 模型能力映射
 */
export const modelCapabilities: ModelCapability[] = [
  // OpenAI
  {
    model: 'gpt-4o',
    provider: 'openai',
    intents: ['coding', 'analysis', 'reasoning', 'knowledge', 'creative'],
    contextWindow: 128000,
    inputCost: 5.0,
    outputCost: 15.0,
    avgLatency: 800,
    qualityScore: 0.95,
    features: ['vision', 'function_calling', 'json_mode'],
  },
  {
    model: 'gpt-4o-mini',
    provider: 'openai',
    intents: ['coding', 'casual_chat', 'translation', 'knowledge'],
    contextWindow: 128000,
    inputCost: 0.15,
    outputCost: 0.6,
    avgLatency: 300,
    qualityScore: 0.85,
    features: ['vision', 'function_calling'],
  },
  // Anthropic
  {
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'knowledge'],
    contextWindow: 1000000,
    inputCost: 3.0,
    outputCost: 15.0,
    avgLatency: 1200,
    qualityScore: 0.97,
    features: ['vision', 'tool_use', 'extended_thinking'],
  },
  {
    model: 'claude-haiku-4-5',
    provider: 'anthropic',
    intents: ['casual_chat', 'translation', 'coding', 'fast_response'],
    contextWindow: 200000,
    inputCost: 1.0,
    outputCost: 5.0,
    avgLatency: 300,
    qualityScore: 0.90,
    features: ['vision', 'tool_use'],
  },
  // DeepSeek
  {
    model: 'deepseek-chat',
    provider: 'deepseek',
    intents: ['coding', 'analysis', 'casual_chat', 'translation', 'knowledge'],
    contextWindow: 128000,
    inputCost: 0.28,
    outputCost: 0.42,
    avgLatency: 600,
    qualityScore: 0.90,
    features: ['function_calling', 'json_mode'],
  },
  {
    model: 'deepseek-reasoner',
    provider: 'deepseek',
    intents: ['reasoning', 'analysis', 'math', 'coding', 'scientific'],
    contextWindow: 128000,
    inputCost: 0.28,
    outputCost: 0.42,
    avgLatency: 2000,
    qualityScore: 0.95,
    features: ['chain_of_thought', 'extended_thinking'],
  },
  // OpenRouter Free Models
  {
    model: 'google/gemma-3-27b-it:free',
    provider: 'openrouter',
    intents: ['coding', 'casual_chat', 'translation'],
    contextWindow: 64000,
    inputCost: 0.0,
    outputCost: 0.0,
    avgLatency: 500,
    qualityScore: 0.82,
    features: ['free'],
  },
  {
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    provider: 'openrouter',
    intents: ['coding', 'analysis', 'reasoning'],
    contextWindow: 128000,
    inputCost: 0.0,
    outputCost: 0.0,
    avgLatency: 600,
    qualityScore: 0.85,
    features: ['free'],
  },
  {
    model: 'qwen/qwen3.5-plus:free',
    provider: 'openrouter',
    intents: ['coding', 'analysis', 'casual_chat'],
    contextWindow: 1000000,
    inputCost: 0.0,
    outputCost: 0.0,
    avgLatency: 500,
    qualityScore: 0.88,
    features: ['free'],
  },
  {
    model: 'deepseek/deepseek-reasoner:free',
    provider: 'openrouter',
    intents: ['reasoning', 'analysis', 'math', 'coding'],
    contextWindow: 128000,
    inputCost: 0.0,
    outputCost: 0.0,
    avgLatency: 2000,
    qualityScore: 0.93,
    features: ['free', 'chain_of_thought'],
  },
  // LiteLLM
  {
    model: 'qwen/qwen3.6-plus',
    provider: 'litellm',
    intents: ['coding', 'analysis', 'reasoning', 'creative'],
    contextWindow: 32000,
    inputCost: 0.0,
    outputCost: 0.0,
    avgLatency: 500,
    qualityScore: 0.85,
  },
  {
    model: 'qwen/qwen3-coder',
    provider: 'litellm',
    intents: ['coding', 'analysis'],
    contextWindow: 32000,
    inputCost: 0.0,
    outputCost: 0.0,
    avgLatency: 400,
    qualityScore: 0.88,
    features: ['code_specialized'],
  },
  // Infini-AI
  {
    model: 'glm-5',
    provider: 'infini-ai',
    intents: ['coding', 'analysis', 'reasoning'],
    contextWindow: 128000,
    inputCost: 0.4,
    outputCost: 1.6,
    avgLatency: 700,
    qualityScore: 0.85,
  },
  {
    model: 'deepseek-v3.2',
    provider: 'infini-ai',
    intents: ['coding', 'analysis', 'reasoning', 'translation', 'casual_chat'],
    contextWindow: 128000,
    inputCost: 0.28,
    outputCost: 0.42,
    avgLatency: 600,
    qualityScore: 0.88,
  },
];

/**
 * 获取 Provider 配置
 */
export function getProvider(name: string): ProviderConfig | undefined {
  return providers.find(p => p.name === name && p.enabled);
}

/**
 * 获取模型能力信息
 */
export function getModelCapability(model: string): ModelCapability | undefined {
  return modelCapabilities.find(m => m.model === model);
}

/**
 * 根据意图获取推荐模型
 */
export function getModelsForIntent(intent: string): ModelCapability[] {
  return modelCapabilities
    .filter(m => m.intents.includes(intent))
    .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
}

/**
 * 获取免费模型列表
 */
export function getFreeModels(): ModelCapability[] {
  return modelCapabilities.filter(m => m.features?.includes('free'));
}

/**
 * 从用户配置创建动态 Provider 配置
 * 用于支持自定义 Provider
 */
export function createProviderFromUserConfig(
  providerId: string,
  config: { name: string; baseUrl: string; apiKey: string; models?: string[]; custom?: boolean }
): ProviderConfig {
  return {
    name: providerId,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    models: config.models || [],
    custom: true,
    rateLimit: { rpm: 60 },
    timeout: 60000,
    priority: 70,
    enabled: true,
  };
}

/**
 * 合并系统 Provider 和用户自定义 Provider
 */
export function getAllProviders(userProviderKeys?: Record<string, unknown>): ProviderConfig[] {
  const allProviders = [...providers];
  
  if (userProviderKeys) {
    for (const [providerId, value] of Object.entries(userProviderKeys)) {
      // 检查是否为自定义 Provider
      if (typeof value === 'object' && value !== null && 'custom' in value) {
        const customConfig = value as { name: string; baseUrl: string; apiKey: string; models?: string[]; custom: boolean };
        allProviders.push(createProviderFromUserConfig(providerId, customConfig));
      }
    }
  }
  
  return allProviders;
}

/**
 * 获取 Provider（支持用户自定义）
 */
export function getProviderWithUserKeys(
  name: string,
  userProviderKeys?: Record<string, unknown>
): ProviderConfig | undefined {
  // 首先检查系统 Provider
  const systemProvider = providers.find(p => p.name === name && p.enabled);
  if (systemProvider) return systemProvider;
  
  // 检查用户自定义 Provider
  if (userProviderKeys && userProviderKeys[name]) {
    const value = userProviderKeys[name];
    if (typeof value === 'object' && value !== null && 'custom' in value) {
      const customConfig = value as { name: string; baseUrl: string; apiKey: string; models?: string[]; custom: boolean };
      return createProviderFromUserKeys(name, customConfig);
    }
  }
  
  return undefined;
}

/**
 * 从用户配置创建 Provider（内部函数）
 */
function createProviderFromUserKeys(
  providerId: string,
  config: { name: string; baseUrl: string; apiKey: string; models?: string[]; custom: boolean }
): ProviderConfig {
  return {
    name: providerId,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    models: config.models || [],
    custom: true,
    rateLimit: { rpm: 60 },
    timeout: 60000,
    priority: 70,
    enabled: true,
  };
}
