import { z } from 'zod';

/**
 * Provider 配置 Schema
 */
export const ProviderConfigSchema = z.object({
  name: z.string(),
  baseUrl: z.string().url(),
  apiKeyEnv: z.string(),
  models: z.array(z.string()),
  rateLimit: z.object({
    rpm: z.number().optional(),
    tpm: z.number().optional(),
  }).optional(),
  timeout: z.number().default(30000),
  priority: z.number().default(50),
  enabled: z.boolean().default(true),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * 模型能力定义
 */
export const ModelCapabilitySchema = z.object({
  model: z.string(),
  provider: z.string(),
  intents: z.array(z.string()),
  contextWindow: z.number(),
  inputCost: z.number(), // per 1M tokens
  outputCost: z.number(), // per 1M tokens
  avgLatency: z.number().optional(), // ms
  qualityScore: z.number().min(0).max(1).optional(),
  features: z.array(z.string()).optional(),
});

export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

/**
 * Provider 配置列表
 * 更新日期：2026-04-17
 * 数据来源：各厂商官方 API 文档
 */
export const providers: ProviderConfig[] = [
  // ==================== OpenAI ====================
  // 官方文档：https://platform.openai.com/docs/models
  {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: [
      // GPT-5.x 系列 (2026 最新旗舰)
      'gpt-5.4',           // 旗舰模型
      'gpt-5.4-mini',      // 轻量版
      'gpt-5.4-nano',      // 最轻量
      // GPT-4o 系列
      'gpt-4o',            // 多模态
      'gpt-4o-mini',       // 轻量多模态
      'gpt-4.1',           // 编码专用 (1M context)
      // GPT-4 系列
      'gpt-4-turbo',       // 经典
      'gpt-4',             // 基础版
      // 开源推理模型
      'gpt-oss-120b',      // 开源推理 120B
      'gpt-oss-20b',       // 开源推理 20B
    ],
    rateLimit: { rpm: 500, tpm: 30000 },
    timeout: 30000,
    priority: 95,
    enabled: true,
  },

  // ==================== Anthropic ====================
  // 官方文档：https://platform.claude.com/docs/en/about-claude/models/overview
  {
    name: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    models: [
      // Claude 4.x 系列 (2026 最新)
      'claude-opus-4-7',   // 最新旗舰 (最强 agentic coding)
      'claude-sonnet-4-6', // 最佳性价比
      'claude-haiku-4-5',  // 最快速度
      // Claude 4.x 旧版 (即将废弃)
      'claude-opus-4-6',
      'claude-sonnet-4-5',
      'claude-opus-4-5',
      'claude-opus-4-1',
      // Claude 3.x (经典)
      'claude-3-5-sonnet', // 经典版本
      'claude-3-haiku',    // 已废弃 (2026-04-19)
    ],
    rateLimit: { rpm: 100, tpm: 40000 },
    timeout: 60000,
    priority: 98,
    enabled: true,
  },

  // ==================== Google ====================
  // 官方文档：https://ai.google.dev/models
  {
    name: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GOOGLE_API_KEY',
    models: [
      // Gemini 2.x 系列
      'gemini-2.5-pro',    // 专业版
      'gemini-2.5-flash',  // 快速版
      'gemini-2.0-flash',  // 经典
      'gemini-1.5-pro',    // 旧版
      'gemini-1.5-flash',  // 旧版
    ],
    rateLimit: { rpm: 60, tpm: 40000 },
    timeout: 45000,
    priority: 90,
    enabled: true,
  },

  // ==================== DeepSeek ====================
  // 官方文档：https://api-docs.deepseek.com/quick_start/pricing/
  {
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    models: [
      'deepseek-chat',      // DeepSeek-V3.2 (Non-thinking)
      'deepseek-reasoner',  // DeepSeek-V3.2 Thinking (R1)
    ],
    rateLimit: { rpm: 60 },
    timeout: 60000,
    priority: 85,
    enabled: true,
  },

  // ==================== Qwen (Alibaba) ====================
  // 官方文档：https://www.alibabacloud.com/help/en/model-studio/models
  {
    name: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'QWEN_API_KEY',
    models: [
      // Qwen3 系列 (最新)
      'qwen3-max',           // 最强能力
      'qwen3-max-preview',   // 预览版
      // Qwen3.5 系列 (推荐)
      'qwen3.5-plus',        // 最佳性价比
      'qwen3.5-flash',       // 最快速度
      // Qwen 经典系列
      'qwen-max',            // 经典旗舰
      'qwen-max-latest',     // 最新版
      'qwen-plus',           // 平衡版
      'qwen-flash',          // 快速版
    ],
    rateLimit: { rpm: 60 },
    timeout: 30000,
    priority: 80,
    enabled: true,
  },

  // ==================== Grok (xAI) ====================
  // 官方文档：https://x.ai/api
  {
    name: 'grok',
    baseUrl: 'https://api.x.ai/v1',
    apiKeyEnv: 'XAI_API_KEY',
    models: [
      'grok-2',           // 当前可用
      'grok-2-vision',    // 多模态版
      'grok-2-mini',      // 轻量版
    ],
    rateLimit: { rpm: 60 },
    timeout: 45000,
    priority: 75,
    enabled: true,
  },

  // ==================== Mistral ====================
  // 官方文档：https://docs.mistral.ai/getting-started/models/
  {
    name: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    models: [
      'mistral-large-2411',  // 最新旗舰
      'mistral-small-latest', // 轻量版
      'codestral-latest',     // 代码专用
      'ministral-8b-latest',  // 最小版
    ],
    rateLimit: { rpm: 60 },
    timeout: 30000,
    priority: 70,
    enabled: true,
  },

  // ==================== Meta Llama ====================
  // 官方文档：https://llama.meta.com/
  {
    name: 'llama',
    baseUrl: 'https://api.llama-api.com/v1',
    apiKeyEnv: 'LLAMA_API_KEY',
    models: [
      'llama-3.3-70b',       // 最新 70B
      'llama-3.2-90b-vision', // 多模态 90B
      'llama-3.2-11b-vision', // 多模态 11B
      'llama-3.1-405b',      // 最大参数
      'llama-3.1-70b',       // 平衡版
      'llama-3.1-8b',        // 轻量版
    ],
    rateLimit: { rpm: 60 },
    timeout: 45000,
    priority: 65,
    enabled: true,
  },

  // ==================== OpenRouter (免费模型) ====================
  // 官方文档：https://openrouter.ai/models
  {
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    models: [
      // 免费模型
      'google/gemma-3-27b-it:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen3.5-plus:free',
      'deepseek/deepseek-reasoner:free',
      'mistral/ministral-8b:free',
      // 热门付费模型
      'anthropic/claude-opus-4-7',
      'openai/gpt-5.4',
    ],
    rateLimit: { rpm: 100 },
    timeout: 45000,
    priority: 60,
    enabled: true,
  },

  // ==================== LiteLLM Proxy (本地) ====================
  // 自建服务
  {
    name: 'litellm',
    baseUrl: 'http://23.94.236.146:3000/v1',
    apiKeyEnv: 'LITELLM_API_KEY',
    models: [
      'qwen/qwen3.6-plus',
      'qwen/qwen3-coder',
      'gpt-4o-mini',
    ],
    rateLimit: { rpm: 100 },
    timeout: 30000,
    priority: 50,
    enabled: true,
  },

  // ==================== Infini-AI ====================
  // 官方文档：https://cloud.infini-ai.com
  {
    name: 'infini-ai',
    baseUrl: 'https://cloud.infini-ai.com/maas/coding/v1',
    apiKeyEnv: 'INFINI_AI_API_KEY',
    models: [
      'kimi-k2.5',
      'deepseek-v3.2',
      'deepseek-v3.2-thinking',
      'minimax-m2.1',
      'minimax-m2.5',
      'minimax-m2.7',
      'glm-4.7',
      'glm-5',
      'glm-5.1',
    ],
    rateLimit: { rpm: 60 },
    timeout: 60000,
    priority: 88,
    enabled: true,
  },
];

/**
 * 模型能力映射
 * 更新日期：2026-04-17
 * 数据来源：各厂商官方定价页面
 */
export const modelCapabilities: ModelCapability[] = [
  // ==================== OpenAI Models ====================
  // 定价：https://platform.openai.com/docs/pricing
  {
    model: 'gpt-5.4',
    provider: 'openai',
    intents: ['coding', 'analysis', 'reasoning', 'knowledge', 'creative'],
    contextWindow: 256000,
    inputCost: 10.0,
    outputCost: 30.0,
    avgLatency: 1200,
    qualityScore: 0.97,
    features: ['vision', 'function_calling', 'json_mode', 'extended_context'],
  },
  {
    model: 'gpt-5.4-mini',
    provider: 'openai',
    intents: ['coding', 'analysis', 'casual_chat', 'translation'],
    contextWindow: 128000,
    inputCost: 0.5,
    outputCost: 1.5,
    avgLatency: 400,
    qualityScore: 0.90,
    features: ['vision', 'function_calling', 'json_mode'],
  },
  {
    model: 'gpt-5.4-nano',
    provider: 'openai',
    intents: ['casual_chat', 'translation', 'fast_response'],
    contextWindow: 64000,
    inputCost: 0.1,
    outputCost: 0.3,
    avgLatency: 200,
    qualityScore: 0.80,
    features: ['function_calling'],
  },
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
  {
    model: 'gpt-4.1',
    provider: 'openai',
    intents: ['coding', 'analysis', 'reasoning'],
    contextWindow: 1000000,
    inputCost: 2.0,
    outputCost: 8.0,
    avgLatency: 1000,
    qualityScore: 0.94,
    features: ['vision', 'function_calling', 'code_specialized'],
  },
  {
    model: 'gpt-4-turbo',
    provider: 'openai',
    intents: ['coding', 'analysis', 'reasoning'],
    contextWindow: 128000,
    inputCost: 10.0,
    outputCost: 30.0,
    avgLatency: 1000,
    qualityScore: 0.92,
    features: ['vision', 'function_calling'],
  },
  {
    model: 'gpt-oss-120b',
    provider: 'openai',
    intents: ['reasoning', 'analysis', 'coding'],
    contextWindow: 128000,
    inputCost: 0.0,
    outputCost: 0.0,
    avgLatency: 1500,
    qualityScore: 0.88,
    features: ['open_source', 'reasoning'],
  },
  {
    model: 'gpt-oss-20b',
    provider: 'openai',
    intents: ['coding', 'casual_chat', 'translation'],
    contextWindow: 64000,
    inputCost: 0.0,
    outputCost: 0.0,
    avgLatency: 500,
    qualityScore: 0.80,
    features: ['open_source'],
  },

  // ==================== Anthropic Models ====================
  // 定价：https://platform.claude.com/docs/en/about-claude/pricing
  {
    model: 'claude-opus-4-7',
    provider: 'anthropic',
    intents: ['reasoning', 'analysis', 'creative', 'long_context', 'coding'],
    contextWindow: 1000000,
    inputCost: 5.0,
    outputCost: 25.0,
    avgLatency: 3000,
    qualityScore: 0.99,
    features: ['vision', 'tool_use', 'adaptive_thinking', 'artifacts'],
  },
  {
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'knowledge'],
    contextWindow: 1000000,
    inputCost: 3.0,
    outputCost: 15.0,
    avgLatency: 1200,
    qualityScore: 0.97,
    features: ['vision', 'tool_use', 'extended_thinking', 'artifacts'],
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
    features: ['vision', 'tool_use', 'extended_thinking'],
  },
  {
    model: 'claude-opus-4-6',
    provider: 'anthropic',
    intents: ['reasoning', 'analysis', 'creative', 'coding'],
    contextWindow: 1000000,
    inputCost: 5.0,
    outputCost: 25.0,
    avgLatency: 2500,
    qualityScore: 0.97,
    features: ['vision', 'tool_use', 'extended_thinking'],
  },
  {
    model: 'claude-sonnet-4-5',
    provider: 'anthropic',
    intents: ['coding', 'analysis', 'reasoning', 'creative'],
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    avgLatency: 1000,
    qualityScore: 0.96,
    features: ['vision', 'tool_use', 'extended_thinking'],
  },
  {
    model: 'claude-3-5-sonnet',
    provider: 'anthropic',
    intents: ['coding', 'analysis', 'reasoning', 'creative', 'knowledge'],
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    avgLatency: 1000,
    qualityScore: 0.95,
    features: ['vision', 'tool_use'],
  },
  {
    model: 'claude-3-haiku',
    provider: 'anthropic',
    intents: ['casual_chat', 'translation', 'fast_response'],
    contextWindow: 200000,
    inputCost: 0.25,
    outputCost: 1.25,
    avgLatency: 250,
    qualityScore: 0.80,
    features: ['vision'],
  },

  // ==================== Google Models ====================
  // 定价：https://ai.google.dev/pricing
  {
    model: 'gemini-2.5-pro',
    provider: 'google',
    intents: ['reasoning', 'analysis', 'creative', 'multimodal', 'long_context'],
    contextWindow: 1000000,
    inputCost: 1.25,
    outputCost: 5.0,
    avgLatency: 1500,
    qualityScore: 0.94,
    features: ['vision', 'audio', 'video', 'code_execution'],
  },
  {
    model: 'gemini-2.5-flash',
    provider: 'google',
    intents: ['coding', 'casual_chat', 'translation', 'fast_response'],
    contextWindow: 1000000,
    inputCost: 0.075,
    outputCost: 0.3,
    avgLatency: 300,
    qualityScore: 0.88,
    features: ['vision', 'audio'],
  },
  {
    model: 'gemini-2.0-flash',
    provider: 'google',
    intents: ['coding', 'casual_chat', 'translation'],
    contextWindow: 1000000,
    inputCost: 0.1,
    outputCost: 0.4,
    avgLatency: 350,
    qualityScore: 0.86,
    features: ['vision'],
  },
  {
    model: 'gemini-1.5-pro',
    provider: 'google',
    intents: ['reasoning', 'analysis', 'long_context'],
    contextWindow: 2000000,
    inputCost: 1.25,
    outputCost: 5.0,
    avgLatency: 2000,
    qualityScore: 0.90,
    features: ['vision', 'audio', 'video'],
  },

  // ==================== DeepSeek Models ====================
  // 定价：https://api-docs.deepseek.com/quick_start/pricing/
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
    features: ['chain_of_thought', 'extended_thinking', 'function_calling'],
  },

  // ==================== Qwen Models ====================
  // 定价：https://www.alibabacloud.com/help/en/model-studio/models
  {
    model: 'qwen3-max',
    provider: 'qwen',
    intents: ['coding', 'reasoning', 'analysis', 'creative', 'long_context'],
    contextWindow: 262144,
    inputCost: 0.36,
    outputCost: 1.43,
    avgLatency: 800,
    qualityScore: 0.94,
    features: ['vision', 'function_calling', 'tool_use'],
  },
  {
    model: 'qwen3-max-preview',
    provider: 'qwen',
    intents: ['coding', 'reasoning', 'analysis'],
    contextWindow: 262144,
    inputCost: 0.36,
    outputCost: 1.43,
    avgLatency: 850,
    qualityScore: 0.93,
    features: ['vision', 'function_calling', 'tool_use'],
  },
  {
    model: 'qwen3.5-plus',
    provider: 'qwen',
    intents: ['coding', 'analysis', 'reasoning', 'creative'],
    contextWindow: 1000000,
    inputCost: 0.115,
    outputCost: 0.688,
    avgLatency: 600,
    qualityScore: 0.92,
    features: ['vision', 'video', 'function_calling'],
  },
  {
    model: 'qwen3.5-flash',
    provider: 'qwen',
    intents: ['coding', 'casual_chat', 'translation', 'fast_response'],
    contextWindow: 1000000,
    inputCost: 0.029,
    outputCost: 0.287,
    avgLatency: 300,
    qualityScore: 0.85,
    features: ['vision', 'video'],
  },
  {
    model: 'qwen-max',
    provider: 'qwen',
    intents: ['coding', 'reasoning', 'analysis', 'long_context'],
    contextWindow: 32768,
    inputCost: 0.4,
    outputCost: 1.2,
    avgLatency: 600,
    qualityScore: 0.88,
  },
  {
    model: 'qwen-max-latest',
    provider: 'qwen',
    intents: ['coding', 'reasoning', 'analysis'],
    contextWindow: 131072,
    inputCost: 0.4,
    outputCost: 1.2,
    avgLatency: 650,
    qualityScore: 0.89,
  },
  {
    model: 'qwen-plus',
    provider: 'qwen',
    intents: ['coding', 'analysis', 'casual_chat'],
    contextWindow: 1000000,
    inputCost: 0.115,
    outputCost: 0.688,
    avgLatency: 400,
    qualityScore: 0.85,
    features: ['vision', 'video'],
  },
  {
    model: 'qwen-flash',
    provider: 'qwen',
    intents: ['casual_chat', 'translation', 'fast_response'],
    contextWindow: 1000000,
    inputCost: 0.029,
    outputCost: 0.287,
    avgLatency: 200,
    qualityScore: 0.78,
  },

  // ==================== Grok Models ====================
  // 定价：https://x.ai/api
  {
    model: 'grok-2',
    provider: 'grok',
    intents: ['reasoning', 'analysis', 'creative', 'knowledge'],
    contextWindow: 128000,
    inputCost: 2.0,
    outputCost: 6.0,
    avgLatency: 800,
    qualityScore: 0.92,
    features: ['real_time_data', 'function_calling'],
  },
  {
    model: 'grok-2-vision',
    provider: 'grok',
    intents: ['analysis', 'creative', 'multimodal'],
    contextWindow: 128000,
    inputCost: 2.0,
    outputCost: 6.0,
    avgLatency: 900,
    qualityScore: 0.90,
    features: ['real_time_data', 'vision'],
  },
  {
    model: 'grok-2-mini',
    provider: 'grok',
    intents: ['casual_chat', 'translation'],
    contextWindow: 64000,
    inputCost: 0.2,
    outputCost: 0.6,
    avgLatency: 400,
    qualityScore: 0.80,
    features: ['real_time_data'],
  },

  // ==================== Mistral Models ====================
  // 定价：https://docs.mistral.ai/getting-started/models/
  {
    model: 'mistral-large-2411',
    provider: 'mistral',
    intents: ['reasoning', 'analysis', 'creative', 'coding'],
    contextWindow: 128000,
    inputCost: 2.0,
    outputCost: 6.0,
    avgLatency: 1000,
    qualityScore: 0.92,
    features: ['function_calling', 'json_mode'],
  },
  {
    model: 'mistral-small-latest',
    provider: 'mistral',
    intents: ['coding', 'analysis', 'casual_chat'],
    contextWindow: 128000,
    inputCost: 0.2,
    outputCost: 0.6,
    avgLatency: 500,
    qualityScore: 0.85,
    features: ['function_calling'],
  },
  {
    model: 'codestral-latest',
    provider: 'mistral',
    intents: ['coding', 'analysis', 'code_review'],
    contextWindow: 64000,
    inputCost: 0.3,
    outputCost: 0.9,
    avgLatency: 400,
    qualityScore: 0.90,
    features: ['code_specialized', 'fill_in_middle'],
  },
  {
    model: 'ministral-8b-latest',
    provider: 'mistral',
    intents: ['casual_chat', 'translation', 'fast_response'],
    contextWindow: 64000,
    inputCost: 0.1,
    outputCost: 0.3,
    avgLatency: 300,
    qualityScore: 0.75,
  },

  // ==================== Meta Llama Models ====================
  {
    model: 'llama-3.3-70b',
    provider: 'llama',
    intents: ['coding', 'analysis', 'reasoning'],
    contextWindow: 128000,
    inputCost: 0.6,
    outputCost: 1.8,
    avgLatency: 800,
    qualityScore: 0.88,
  },
  {
    model: 'llama-3.2-90b-vision',
    provider: 'llama',
    intents: ['analysis', 'creative', 'multimodal'],
    contextWindow: 128000,
    inputCost: 0.9,
    outputCost: 2.7,
    avgLatency: 1000,
    qualityScore: 0.87,
    features: ['vision'],
  },
  {
    model: 'llama-3.2-11b-vision',
    provider: 'llama',
    intents: ['casual_chat', 'translation'],
    contextWindow: 64000,
    inputCost: 0.055,
    outputCost: 0.165,
    avgLatency: 400,
    qualityScore: 0.78,
    features: ['vision'],
  },
  {
    model: 'llama-3.1-405b',
    provider: 'llama',
    intents: ['reasoning', 'analysis', 'creative', 'knowledge'],
    contextWindow: 128000,
    inputCost: 2.7,
    outputCost: 8.1,
    avgLatency: 2000,
    qualityScore: 0.91,
  },
  {
    model: 'llama-3.1-70b',
    provider: 'llama',
    intents: ['coding', 'analysis', 'reasoning'],
    contextWindow: 128000,
    inputCost: 0.6,
    outputCost: 1.8,
    avgLatency: 700,
    qualityScore: 0.86,
  },
  {
    model: 'llama-3.1-8b',
    provider: 'llama',
    intents: ['casual_chat', 'translation', 'fast_response'],
    contextWindow: 64000,
    inputCost: 0.055,
    outputCost: 0.165,
    avgLatency: 300,
    qualityScore: 0.75,
  },

  // ==================== OpenRouter Free Models ====================
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
  {
    model: 'mistral/ministral-8b:free',
    provider: 'openrouter',
    intents: ['casual_chat', 'translation', 'coding'],
    contextWindow: 64000,
    inputCost: 0.0,
    outputCost: 0.0,
    avgLatency: 400,
    qualityScore: 0.78,
    features: ['free'],
  },
  {
    model: 'anthropic/claude-opus-4-7',
    provider: 'openrouter',
    intents: ['reasoning', 'analysis', 'creative', 'long_context'],
    contextWindow: 1000000,
    inputCost: 5.0,
    outputCost: 25.0,
    avgLatency: 3000,
    qualityScore: 0.99,
    features: ['vision', 'tool_use', 'adaptive_thinking'],
  },
  {
    model: 'openai/gpt-5.4',
    provider: 'openrouter',
    intents: ['coding', 'analysis', 'reasoning', 'knowledge', 'creative'],
    contextWindow: 256000,
    inputCost: 10.0,
    outputCost: 30.0,
    avgLatency: 1200,
    qualityScore: 0.97,
    features: ['vision', 'function_calling'],
  },

  // ==================== LiteLLM Proxy Models ====================
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

  // ==================== Infini-AI Models ====================
  // 质量分来源: DataLearner benchmark (GPQA Diamond 归一化: (score-50)/50)
  // 价格来源: DataLearner API Prices + Infini-AI 官方
  {
    model: 'kimi-k2.5',
    provider: 'infini-ai',
    intents: ['coding', 'analysis', 'reasoning', 'long_context', 'creative', 'trading'],
    contextWindow: 128000,
    inputCost: 0.5,
    outputCost: 2.0,
    avgLatency: 800,
    qualityScore: 0.75,  // GPQA=87.6, LiveCodeBench=85
    features: ['long_context', 'tool_use'],
  },
  {
    model: 'deepseek-v3.2',
    provider: 'infini-ai',
    intents: ['coding', 'analysis', 'reasoning', 'translation', 'casual_chat', 'trading'],
    contextWindow: 128000,
    inputCost: 0.28,   // DeepSeek-AI 官方: $0.28/1M input
    outputCost: 0.42,  // DeepSeek-AI 官方: $0.42/1M output
    avgLatency: 600,
    qualityScore: 0.65,  // GPQA=82.4, LiveCodeBench=83.3, AIME=93.1
    features: ['function_calling'],
  },
  {
    model: 'deepseek-v3.2-thinking',
    provider: 'infini-ai',
    intents: ['reasoning', 'analysis', 'coding', 'long_context'],
    contextWindow: 128000,
    inputCost: 0.28,
    outputCost: 0.88,
    avgLatency: 2000,
    qualityScore: 0.75,  // 估算: V3.2基础 + thinking提升约5分GPQA
    features: ['chain_of_thought', 'extended_thinking'],
  },
  {
    model: 'minimax-m2.7',
    provider: 'infini-ai',
    intents: ['creative', 'casual_chat', 'translation', 'knowledge'],
    contextWindow: 1000000,
    inputCost: 0.4,
    outputCost: 1.6,
    avgLatency: 700,
    qualityScore: 0.74,  // GPQA=87, IF_Bench=76, Claw_Bench=91.7
    features: ['long_context'],
  },
  {
    model: 'minimax-m2.5',
    provider: 'infini-ai',
    intents: ['creative', 'casual_chat', 'translation'],
    contextWindow: 256000,
    inputCost: 0.3,
    outputCost: 1.2,
    avgLatency: 600,
    qualityScore: 0.66,  // SWE-bench=80.2, Claw_Bench=92.1, 估算GPQA~83
  },
  {
    model: 'minimax-m2.1',
    provider: 'infini-ai',
    intents: ['casual_chat', 'translation', 'knowledge'],
    contextWindow: 128000,
    inputCost: 0.2,
    outputCost: 0.8,
    avgLatency: 500,
    qualityScore: 0.50,  // 无评分数据，保守估计
  },
  {
    model: 'glm-5.1',
    provider: 'infini-ai',
    intents: ['coding', 'analysis', 'reasoning', 'creative'],
    contextWindow: 128000,
    inputCost: 0.5,
    outputCost: 2.0,
    avgLatency: 800,
    qualityScore: 0.68,  // AIME2026=95.3, HLE=52.3, 估算GPQA~84
    features: ['function_calling'],
  },
  {
    model: 'glm-5',
    provider: 'infini-ai',
    intents: ['coding', 'analysis', 'reasoning'],
    contextWindow: 128000,
    inputCost: 0.4,
    outputCost: 1.6,
    avgLatency: 700,
    qualityScore: 0.64,  // SWE-bench=77.8, tau2=89.7, 估算GPQA~82
  },
  {
    model: 'glm-4.7',
    provider: 'infini-ai',
    intents: ['casual_chat', 'translation', 'knowledge'],
    contextWindow: 128000,
    inputCost: 0.1,
    outputCost: 0.4,
    avgLatency: 400,
    qualityScore: 0.71,  // GPQA=85.7, LiveCodeBench=84.9, tau2=87.4
  },
];

/**
 * 获取 Provider 配置
 */
export function getProvider(name: string): ProviderConfig | undefined {
  return providers.find(p => p.name === name && p.enabled);
}

/**
 * 获取所有启用的 Providers
 */
export function getEnabledProviders(): ProviderConfig[] {
  return providers.filter(p => p.enabled);
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
 * 根据预算获取推荐模型
 * @param maxCostPer1M 最大每百万 token 成本
 */
export function getModelsByBudget(maxCostPer1M: number): ModelCapability[] {
  return modelCapabilities
    .filter(m => m.inputCost <= maxCostPer1M)
    .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
}
