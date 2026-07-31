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
 * 根据模型名称计算请求成本
 * @param model 模型名称
 * @param inputTokens 输入 token 数
 * @param outputTokens 输出 token 数
 * @returns 成本（美元）
 */
export function calculateRequestCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const capability = getModelCapability(model);
  if (!capability) {
    // 未知模型使用默认费率 $0.01/1K tokens
    return ((inputTokens + outputTokens) / 1000) * 0.01;
  }

  // inputCost 和 outputCost 是每 1M tokens 的美元价格
  const inputCostUsd = (inputTokens / 1_000_000) * capability.inputCost;
  const outputCostUsd = (outputTokens / 1_000_000) * capability.outputCost;

  return inputCostUsd + outputCostUsd;
}

/**
 * Provider 配置列表
 */
export const providers: ProviderConfig[] = [
  {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-5.5', 'gpt-6'],
    rateLimit: { rpm: 500, tpm: 30000 },
    timeout: 30000,
    priority: 95,
    enabled: true,
  },
  {
    name: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    models: ['claude-opus-4-8', 'claude-fable-5', 'claude-3-5-haiku'],
    rateLimit: { rpm: 100, tpm: 40000 },
    timeout: 60000,
    priority: 98,
    enabled: true,
  },
  {
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-v4-1'],
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
    name: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    models: ['qwen3-coder-free', 'qwen3-coder', 'qwen3.5-coder-plus'],
    rateLimit: { rpm: 60 },
    timeout: 60000,
    priority: 88,
    enabled: true,
  },
  {
    name: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GOOGLE_API_KEY',
    models: ['gemini-3-5-flash', 'gemini-3-5-pro'],
    rateLimit: { rpm: 60 },
    timeout: 60000,
    priority: 80,
    enabled: true,
  },
  {
    name: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    models: ['mistral-small', 'mistral-medium', 'mistral-large'],
    rateLimit: { rpm: 60 },
    timeout: 30000,
    priority: 75,
    enabled: true,
  },
  {
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    rateLimit: { rpm: 30 },
    timeout: 15000,
    priority: 70,
    enabled: true,
  },
  {
    name: 'cohere',
    baseUrl: 'https://api.cohere.ai/v1',
    apiKeyEnv: 'COHERE_API_KEY',
    models: ['command-r-plus', 'command-r'],
    rateLimit: { rpm: 60 },
    timeout: 30000,
    priority: 65,
    enabled: true,
  },
  {
    // Meta Llama 通过 OpenRouter 访问（与 data/providers.json 保持一致）
    name: 'meta',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    models: ['meta-llama/llama-3.1-8b-instruct', 'meta-llama/llama-3.1-70b-instruct', 'llama-3.1-70b'],
    rateLimit: { rpm: 100 },
    timeout: 45000,
    priority: 55,
    enabled: true,
  },
];

/**
 * 模型能力映射 - 与 models.json 同步
 */
export const modelCapabilities: ModelCapability[] = [
  // Qwen
  {
    model: 'qwen3-coder-free',
    provider: 'qwen',
    intents: ['coding', 'casual_chat', 'translation'],
    contextWindow: 131072,
    inputCost: 0,
    outputCost: 0,
    avgLatency: 500,
    qualityScore: 0.85,
    features: ['free'],
  },
  {
    model: 'qwen3-coder',
    provider: 'qwen',
    intents: ['coding', 'analysis', 'casual_chat'],
    contextWindow: 131072,
    inputCost: 0.1,
    outputCost: 0.15,
    avgLatency: 500,
    qualityScore: 0.88,
    features: ['code_specialized'],
  },
  {
    model: 'qwen3.5-coder-plus',
    provider: 'qwen',
    intents: ['coding', 'analysis', 'reasoning', 'complex-tasks'],
    contextWindow: 131072,
    inputCost: 0.2,
    outputCost: 0.3,
    avgLatency: 600,
    qualityScore: 0.92,
    features: ['code_specialized'],
  },
  // OpenAI
  {
    model: 'gpt-4o',
    provider: 'openai',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'knowledge'],
    contextWindow: 128000,
    inputCost: 5.0,
    outputCost: 15.0,
    avgLatency: 400,
    qualityScore: 0.93,
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
  {
    model: 'gpt-5.5',
    provider: 'openai',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'knowledge', 'agentic'],
    contextWindow: 1048576,
    inputCost: 5.0,
    outputCost: 30.0,
    avgLatency: 1000,
    qualityScore: 0.97,
    features: ['vision', 'function_calling', 'json_mode', 'multimodal'],
  },
  {
    model: 'gpt-6',
    provider: 'openai',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'knowledge', 'agentic'],
    contextWindow: 2097152,
    inputCost: 10.0,
    outputCost: 60.0,
    avgLatency: 1500,
    qualityScore: 0.98,
    features: ['vision', 'function_calling', 'json_mode', 'multimodal', '3d'],
  },
  // Anthropic
  {
    model: 'claude-3-5-haiku',
    provider: 'anthropic',
    intents: ['casual_chat', 'translation', 'coding', 'fast_response'],
    contextWindow: 200000,
    inputCost: 0.25,
    outputCost: 1.25,
    avgLatency: 300,
    qualityScore: 0.90,
    features: ['vision', 'tool_use'],
  },
  {
    model: 'claude-opus-4-8',
    provider: 'anthropic',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'knowledge', 'complex-tasks'],
    contextWindow: 1048576,
    inputCost: 5.0,
    outputCost: 25.0,
    avgLatency: 1200,
    qualityScore: 0.97,
    features: ['vision', 'tool_use', 'extended_thinking'],
  },
  {
    model: 'claude-fable-5',
    provider: 'anthropic',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'agentic'],
    contextWindow: 1048576,
    inputCost: 10.0,
    outputCost: 50.0,
    avgLatency: 1500,
    qualityScore: 0.98,
    features: ['vision', 'tool_use', 'extended_thinking'],
  },
  // Google
  {
    model: 'gemini-3-5-flash',
    provider: 'google',
    intents: ['coding', 'casual_chat', 'translation', 'fast_response'],
    contextWindow: 1048576,
    inputCost: 1.5,
    outputCost: 9.0,
    avgLatency: 400,
    qualityScore: 0.90,
    features: ['vision', 'function_calling'],
  },
  {
    model: 'gemini-3-5-pro',
    provider: 'google',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'knowledge', 'long_context'],
    contextWindow: 2097152,
    inputCost: 15.0,
    outputCost: 60.0,
    avgLatency: 1500,
    qualityScore: 0.96,
    features: ['vision', 'function_calling', 'extended_thinking'],
  },
  // DeepSeek
  {
    model: 'deepseek-chat',
    provider: 'deepseek',
    intents: ['coding', 'analysis', 'casual_chat', 'translation'],
    contextWindow: 64000,
    inputCost: 0.28,
    outputCost: 0.42,
    avgLatency: 500,
    qualityScore: 0.85,
    features: ['function_calling'],
  },
  {
    model: 'deepseek-v4-pro',
    provider: 'deepseek',
    intents: ['coding', 'analysis', 'reasoning', 'creative'],
    contextWindow: 1048576,
    inputCost: 0.435,
    outputCost: 0.87,
    avgLatency: 800,
    qualityScore: 0.94,
    features: ['function_calling', 'extended_thinking'],
  },
  {
    model: 'deepseek-v4-flash',
    provider: 'deepseek',
    intents: ['coding', 'casual_chat', 'translation', 'fast_response'],
    contextWindow: 1048576,
    inputCost: 0.098,
    outputCost: 0.196,
    avgLatency: 400,
    qualityScore: 0.88,
    features: ['function_calling'],
  },
  {
    model: 'deepseek-v4-1',
    provider: 'deepseek',
    intents: ['coding', 'analysis', 'reasoning', 'creative'],
    contextWindow: 1048576,
    inputCost: 0.5,
    outputCost: 1.0,
    avgLatency: 600,
    qualityScore: 0.92,
    features: ['function_calling', 'extended_thinking'],
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
  // OpenRouter specific
  {
    model: 'openrouter/qwen3.6-plus',
    provider: 'openrouter',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'chinese'],
    contextWindow: 131072,
    inputCost: 0.325,
    outputCost: 1.95,
    avgLatency: 600,
    qualityScore: 0.90,
  },
  {
    model: 'openrouter/claude-opus-4.7',
    provider: 'openrouter',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'complex-tasks'],
    contextWindow: 200000,
    inputCost: 5.0,
    outputCost: 25.0,
    avgLatency: 1200,
    qualityScore: 0.96,
  },
  // Cohere
  {
    model: 'command-r-plus',
    provider: 'cohere',
    intents: ['coding', 'analysis', 'reasoning'],
    contextWindow: 128000,
    inputCost: 3.0,
    outputCost: 15.0,
    avgLatency: 1000,
    qualityScore: 0.93,
  },
  // Meta
  {
    model: 'llama-3.1-70b',
    provider: 'meta',
    intents: ['coding', 'analysis', 'reasoning', 'casual_chat'],
    contextWindow: 128000,
    inputCost: 0.5,
    outputCost: 0.8,
    avgLatency: 800,
    qualityScore: 0.90,
  },
  // Mistral
  {
    model: 'mistral-small',
    provider: 'mistral',
    intents: ['casual_chat', 'translation', 'fast_response'],
    contextWindow: 128000,
    inputCost: 1.0,
    outputCost: 3.0,
    avgLatency: 400,
    qualityScore: 0.88,
  },
  {
    model: 'mistral-large',
    provider: 'mistral',
    intents: ['coding', 'analysis', 'reasoning', 'creative'],
    contextWindow: 128000,
    inputCost: 4.0,
    outputCost: 12.0,
    avgLatency: 1000,
    qualityScore: 0.94,
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
 * 支持两种格式: "provider/model" 和 "model"
 */
export function getModelCapability(model: string): ModelCapability | undefined {
  // 1. 精确匹配
  const exact = modelCapabilities.find(m => m.model === model);
  if (exact) return exact;
  
  // 2. 如果是 "provider/model" 格式，尝试用短名匹配
  const slashIdx = model.indexOf('/');
  if (slashIdx >= 0) {
    const shortName = model.slice(slashIdx + 1);
    const provider = model.slice(0, slashIdx);
    // 先精确匹配短名
    const byShortName = modelCapabilities.find(m => m.model === shortName && m.provider === provider);
    if (byShortName) return byShortName;
  }
  
  // 3. 如果是短名格式，尝试用 "provider/model" 匹配
  if (slashIdx < 0) {
    const byFullName = modelCapabilities.find(m => m.model.endsWith('/' + model));
    if (byFullName) return byFullName;
  }
  
  return undefined;
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
