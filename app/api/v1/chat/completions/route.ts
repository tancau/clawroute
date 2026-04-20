/**
 * POST /v1/chat/completions
 * 
 * 智能路由 API - Phase 1 实现
 * 
 * 功能：
 * 1. 验证 API Key（查询数据库）
 * 2. 智能路由选择模型
 * 3. 转发请求到提供商
 * 4. 返回响应（支持流式和非流式）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProvider, getModelCapability, getModelsForIntent, modelCapabilities, getProviderWithUserKeys, createProviderFromUserConfig } from '@/lib/routing/providers';
import { keyManager } from '@/lib/routing/key-manager';
import { findUserByApiKey, getUserProviderKeys, deductCredits } from '@/lib/auth';
import { logRequest } from '@/lib/db';

// ==================== 类型定义 ====================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string[];
  presence_penalty?: number;
  frequency_penalty?: number;
}

interface IntentClassification {
  intent: string;
  confidence: number;
  source: 'rule' | 'cached';
}

// ==================== 意图分类（简化版） ====================

const INTENT_RULES: Array<{ patterns: RegExp[]; intent: string }> = [
  { patterns: [/写代码|code|编程|function|class|bug|fix|debug|实现|开发/i], intent: 'coding' },
  { patterns: [/分析|analyze|数据|report|统计|比较|对比/i], intent: 'analysis' },
  { patterns: [/推理|reasoning|证明|推导|逻辑|数学|math|计算/i], intent: 'reasoning' },
  { patterns: [/翻译|translate|translate|语言|language/i], intent: 'translation' },
  { patterns: [/创意|creative|故事|story|写作|write|文章/i], intent: 'creative' },
  { patterns: [/聊天|chat|问候|hi|hello|你好|帮忙/i], intent: 'casual_chat' },
  { patterns: [/长文本|long|文档|document|总结|summary/i], intent: 'long_context' },
];

function classifyIntent(message: string): IntentClassification {
  const lowerMessage = message.toLowerCase();
  
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lowerMessage)) {
        return {
          intent: rule.intent,
          confidence: 0.9,
          source: 'rule',
        };
      }
    }
  }
  
  // 默认意图
  return {
    intent: 'casual_chat',
    confidence: 0.5,
    source: 'rule',
  };
}

// ==================== 模型路由 ====================

interface RouteResult {
  selectedModel: string;
  provider: string;
  baseUrl: string;
  reason: string;
  alternatives: Array<{ model: string; provider: string }>;
}

function routeModel(intent: string, requestedModel?: string, userProviderKeys?: Record<string, unknown>): RouteResult {
  // 如果用户指定了模型，直接使用
  if (requestedModel && requestedModel !== 'auto') {
    const capability = getModelCapability(requestedModel);
    if (capability) {
      const provider = getProviderWithUserKeys(capability.provider, userProviderKeys);
      if (provider) {
        return {
          selectedModel: requestedModel,
          provider: capability.provider,
          baseUrl: provider.baseUrl,
          reason: 'User specified model',
          alternatives: [],
        };
      }
    }
    
    // 检查是否为自定义 Provider 的模型
    if (userProviderKeys) {
      for (const [providerId, value] of Object.entries(userProviderKeys)) {
        if (typeof value === 'object' && value !== null && 'custom' in value) {
          const customConfig = value as { name: string; baseUrl: string; apiKey: string; models?: string[]; custom: boolean };
          if (customConfig.models && customConfig.models.includes(requestedModel)) {
            const customProvider = createProviderFromUserConfig(providerId, customConfig);
            return {
              selectedModel: requestedModel,
              provider: providerId,
              baseUrl: customProvider.baseUrl,
              reason: 'User model from custom provider',
              alternatives: [],
            };
          }
        }
      }
    }
    
    // 尝试从模型名推断 provider
    if (requestedModel.includes('/')) {
      // OpenRouter 格式: provider/model
      return {
        selectedModel: requestedModel,
        provider: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        reason: 'OpenRouter model format detected',
        alternatives: [],
      };
    }
  }
  
  // === 优先检查用户自定义 Provider ===
  if (userProviderKeys) {
    for (const [providerId, value] of Object.entries(userProviderKeys)) {
      if (typeof value === 'object' && value !== null && 'custom' in value) {
        const customConfig = value as { name: string; baseUrl: string; apiKey: string; models?: string[]; custom: boolean };
        // 检查自定义 Provider 的模型是否匹配意图
        if (customConfig.models && customConfig.models.length > 0) {
          // 选择第一个可用的模型
          const selectedModel = customConfig.models[0]!;
          return {
            selectedModel,
            provider: providerId,
            baseUrl: customConfig.baseUrl,
            reason: `Using user custom provider: ${customConfig.name}`,
            alternatives: customConfig.models.slice(1, 3).map(m => ({ model: m, provider: providerId })),
          };
        }
      }
    }
  }

  // 获取意图对应的候选模型
  const candidates = getModelsForIntent(intent);
  
  if (candidates.length === 0) {
    // 检查是否有用户配置的预定义 Provider
    if (userProviderKeys) {
      for (const [providerId, value] of Object.entries(userProviderKeys)) {
        // 跳过自定义 Provider（已处理）
        if (typeof value === 'object' && value !== null && 'custom' in value) continue;
        
        const apiKey = typeof value === 'string' ? value : null;
        if (apiKey) {
          const provider = getProvider(providerId);
          if (provider && provider.models.length > 0) {
            return {
              selectedModel: provider.models[0]!,
              provider: providerId,
              baseUrl: provider.baseUrl,
              reason: `Using user configured provider: ${provider.name}`,
              alternatives: provider.models.slice(1, 3).map(m => ({ model: m, provider: providerId })),
            };
          }
        }
      }
    }
    
    // 默认使用 DeepSeek（性价比高）
    return {
      selectedModel: 'deepseek-chat',
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      reason: 'Default fallback: DeepSeek chat',
      alternatives: [],
    };
  }
  
  // 过滤有可用 Key 的模型（优先检查用户配置）
  const availableCandidates = candidates.filter(m => {
    // 先检查用户配置
    if (userProviderKeys && userProviderKeys[m.provider]) {
      const value = userProviderKeys[m.provider];
      if (typeof value === 'string') return true; // 用户配置的预定义 Provider
      if (typeof value === 'object' && value !== null && 'apiKey' in value) return true; // 自定义 Provider
    }
    // 再检查系统配置
    const key = keyManager.getNextKey(m.provider);
    return !!key;
  });
  
  // 如果没有可用的，回退到第一个候选
  const effectiveCandidates = availableCandidates.length > 0 ? availableCandidates : candidates;
  
  // 选择最佳模型（按质量分数排序）
  const selected = effectiveCandidates[0]!;
  const provider = getProvider(selected.provider);
  
  if (!provider) {
    // 回退到 OpenRouter
    const freeModels = modelCapabilities.filter(m => m.features?.includes('free'));
    const freeModel = freeModels[0];
    if (freeModel) {
      return {
        selectedModel: freeModel.model,
        provider: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        reason: 'Fallback to free model via OpenRouter',
        alternatives: freeModels.slice(1, 3).map(m => ({ model: m.model, provider: 'openrouter' })),
      };
    }
  }
  
  return {
    selectedModel: selected.model,
    provider: selected.provider,
    baseUrl: provider?.baseUrl || 'https://api.deepseek.com/v1',
    reason: `Best match for ${intent}: quality ${(selected.qualityScore || 0.8) * 100}%`,
    alternatives: effectiveCandidates.slice(1, 3).map(m => ({ model: m.model, provider: m.provider })),
  };
}

// ==================== 代理请求 ====================

const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function proxyRequest(
  url: string,
  requestBody: Record<string, unknown>,
  apiKey: string,
  requestId: string,
  timeout: number,
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Request-ID': requestId,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeout),
  });
}

async function executeWithRetry(
  route: RouteResult,
  request: ChatCompletionRequest,
  requestId: string,
  userProviderKeys?: Record<string, unknown>,
): Promise<{ response: Response; usedModel: string; usedProvider: string }> {
  // 优先使用 getProviderWithUserKeys（支持自定义 Provider）
  let provider = getProviderWithUserKeys(route.provider, userProviderKeys);
  
  // 如果没有找到，回退到系统 Provider
  if (!provider) {
    provider = getProvider(route.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${route.provider}`);
    }
  }

  const url = `${provider.baseUrl}/chat/completions`;
  const requestBody = {
    model: route.selectedModel,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    top_p: request.top_p,
    stream: request.stream,
    stop: request.stop,
    presence_penalty: request.presence_penalty,
    frequency_penalty: request.frequency_penalty,
  };

  // 构建尝试列表：主模型 + 备选模型
  const attempts: Array<{ model: string; provider: string; url: string; timeout: number }> = [
    { model: route.selectedModel, provider: route.provider, url, timeout: provider.timeout },
  ];

  // 添加备选模型
  for (const alt of route.alternatives) {
    const altProvider = getProvider(alt.provider);
    if (altProvider) {
      attempts.push({
        model: alt.model,
        provider: alt.provider,
        url: `${altProvider.baseUrl}/chat/completions`,
        timeout: altProvider.timeout,
      });
    }
  }

  let lastError: Error | null = null;

  for (let i = 0; i < Math.min(attempts.length, MAX_RETRIES); i++) {
    const attempt = attempts[i]!;
    const attemptRequestBody = { ...requestBody, model: attempt.model };

    // 获取 API Key：优先使用用户配置的 Key
    let apiKey: string | null = null;
    
    if (userProviderKeys && userProviderKeys[attempt.provider]) {
      const value = userProviderKeys[attempt.provider];
      // 处理自定义 Provider（对象）和预定义 Provider（字符串）
      if (typeof value === 'object' && value !== null && 'apiKey' in value) {
        apiKey = (value as { apiKey: string }).apiKey;
      } else if (typeof value === 'string') {
        apiKey = value;
      }
    }
    
    // 如果没有用户的 Key，使用系统配置的 API Key
    if (!apiKey) {
      apiKey = keyManager.getNextKey(attempt.provider);
    }
    
    if (!apiKey) {
      lastError = new Error(`No API key for ${attempt.provider}`);
      continue;
    }

    // Exponential backoff
    if (i > 0) {
      const delay = Math.min(500 * Math.pow(2, i - 1), 10000);
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      const response = await proxyRequest(
        attempt.url,
        attemptRequestBody,
        apiKey,
        requestId,
        attempt.timeout,
      );

      if (!response.ok) {
        const errorText = await response.text();

        // Auth errors: 标记 key 失效
        if (response.status === 401 || response.status === 403) {
          keyManager.markKeyInvalid(attempt.provider, apiKey, `Auth error: ${response.status}`);
        }

        // Retryable status
        if (RETRYABLE_STATUS.has(response.status)) {
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const waitMs = parseInt(retryAfter, 10) * 1000;
            if (waitMs > 0 && waitMs < 60000) {
              await new Promise(r => setTimeout(r, waitMs));
            }
          }
          lastError = new Error(`Provider error (retryable): ${response.status}`);
          continue;
        }

        // Non-retryable
        throw new Error(`Provider error: ${response.status} - ${errorText.slice(0, 200)}`);
      }

      return { response, usedModel: attempt.model, usedProvider: attempt.provider };
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          continue;
        }
        if (error.message.startsWith('Provider error (retryable)')) {
          continue;
        }
        throw error;
      }
      throw error;
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

// ==================== SSE 流处理 ====================

function createSSEStream(
  url: string,
  requestBody: Record<string, unknown>,
  apiKey: string,
  requestId: string,
  timeout: number,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Request-ID': requestId,
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(timeout),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const errorChunk = `data: ${JSON.stringify({ error: { message: `Provider error: ${response.status} - ${errorText.slice(0, 200)}` } })}\n\n`;
          controller.enqueue(encoder.encode(errorChunk));
          controller.close();
          return;
        }

        if (!response.body) {
          controller.close();
          return;
        }

        // 直接转发流
        const reader = response.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }

        controller.close();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const errorChunk = `data: ${JSON.stringify({ error: { message: errorMsg } })}\n\n`;
        controller.enqueue(encoder.encode(errorChunk));
        controller.close();
      }
    },
  });
}

// ==================== API Key 验证 ====================

interface UserValidation {
  userId: string;
  tier: string;
  credits: number;
  providerKeys?: Record<string, unknown>; // 用户配置的 Provider API Keys（支持自定义）
}

async function validateApiKey(apiKey: string | null): Promise<UserValidation | null> {
  if (!apiKey) {
    return null;
  }

  // 开发模式：允许任何以 'sk-' 或 'cr-' 开头的 key
  if (process.env.NODE_ENV === 'development') {
    if (apiKey.startsWith('sk-') || apiKey.startsWith('cr-') || apiKey.startsWith('sk-or-')) {
      return {
        userId: 'dev-user',
        tier: 'free',
        credits: 1000,
      };
    }
  }

  // 使用 auth 模块的 findUserByApiKey
  try {
    const user = await findUserByApiKey(apiKey);
    if (user) {
      // 获取用户的 Provider Keys
      const providerKeys = await getUserProviderKeys(user.id);
      return {
        userId: user.id,
        tier: user.tier,
        credits: user.credits,
        providerKeys: Object.keys(providerKeys).length > 0 ? providerKeys : undefined,
      };
    }
  } catch {
    // 数据库不可用，使用开发模式验证
    if (apiKey.startsWith('sk-') || apiKey.startsWith('cr-') || apiKey.startsWith('sk-or-')) {
      return {
        userId: 'fallback-user',
        tier: 'free',
        credits: 100,
      };
    }
  }

  return null;
}

// ==================== Rate Limiting ====================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Tier-based rate limits (requests per minute)
const TIER_LIMITS: Record<string, number> = {
  free: 20,
  pro: 100,
  team: 1000,
};

function checkRateLimit(clientId: string, tier: string = 'free'): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = TIER_LIMITS[tier] ?? TIER_LIMITS.free ?? 20;

  let entry = rateLimitMap.get(clientId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitMap.set(clientId, entry);
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  return { 
    allowed: true,
    remaining: maxRequests - entry.count,
  };
}

// ==================== 主 Handler ====================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // 声明变量以便在 catch 块中访问
  let route: RouteResult | undefined;
  let classification: IntentClassification | undefined;
  let user: UserValidation | null | undefined;

  try {
    // 1. 验证 API Key（先验证用户）
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || authHeader;

    user = await validateApiKey(apiKey);
    if (!user) {
      // 开发模式：允许无 API Key 访问（使用环境变量中的 key）
      if (process.env.NODE_ENV === 'development' || process.env.ALLOW_NO_AUTH === 'true') {
        // 继续处理，使用系统配置的 API Keys
      } else {
        return NextResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid or missing API key',
            },
          },
          { status: 401 }
        );
      }
    }

    // 2. Rate Limiting (Tier-based)
    const clientId = user?.userId || request.headers.get('X-Forwarded-For') || 'anonymous';
    const rateCheck = checkRateLimit(clientId, user?.tier || 'free');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            retry_after: rateCheck.retryAfter,
          },
        },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    // 3. Credits 检查（仅对 free tier 用户）
    // Pro/Team 用户享受无限 credits
    if (user && user.tier === 'free' && user.credits <= 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'You have run out of credits. Please upgrade to Pro or purchase more credits.',
            hint: 'Visit /dashboard to upgrade',
          },
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // 4. 解析请求
    const body: ChatCompletionRequest = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'messages field is required and must be a non-empty array',
          },
        },
        { status: 400 }
      );
    }

    // 5. 分类意图
    const lastMessage = body.messages[body.messages.length - 1];
    const userMessage = lastMessage?.content || '';
    classification = classifyIntent(userMessage);

    // 6. 选择模型
    route = routeModel(classification.intent, body.model, user?.providerKeys);

    // 7. 执行请求
    // 优先使用 getProviderWithUserKeys（支持自定义 Provider）
    let provider = getProviderWithUserKeys(route.provider, user?.providerKeys);
    
    // 如果没有找到，回退到系统 Provider
    if (!provider) {
      provider = getProvider(route.provider);
    }
    
    if (!provider) {
      return NextResponse.json(
        {
          error: {
            code: 'PROVIDER_UNAVAILABLE',
            message: `Provider ${route.provider} is not available`,
          },
        },
        { status: 503 }
      );
    }

    // 流式响应处理
    if (body.stream) {
      // 扣减 Credits（仅对 free tier 用户）
      // Pro/Team 用户享受无限 credits
      if (user && user.tier === 'free') {
        await deductCredits(user.userId, 1);
      }
      
      // 优先使用用户的 API Key
      let apiKeyForStream: string | null = null;
      if (user?.providerKeys && user.providerKeys[route.provider]) {
        const value = user.providerKeys[route.provider];
        // 处理自定义 Provider（对象）和预定义 Provider（字符串）
        if (typeof value === 'object' && value !== null && 'apiKey' in value) {
          apiKeyForStream = (value as { apiKey: string }).apiKey;
        } else if (typeof value === 'string') {
          apiKeyForStream = value;
        }
      }
      
      // 如果没有用户的 Key，使用系统配置的 API Key
      if (!apiKeyForStream) {
        apiKeyForStream = keyManager.getNextKey(route.provider);
      }
      
      if (!apiKeyForStream) {
        return NextResponse.json(
          {
            error: {
              code: 'NO_API_KEY',
              message: `No API key available for provider: ${route.provider}`,
            },
          },
          { status: 503 }
        );
      }

      const requestBody = {
        model: route.selectedModel,
        messages: body.messages,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        top_p: body.top_p,
        stream: true,
        stop: body.stop,
        presence_penalty: body.presence_penalty,
        frequency_penalty: body.frequency_penalty,
      };

      const url = `${provider.baseUrl}/chat/completions`;
      const sseStream = createSSEStream(url, requestBody, apiKeyForStream, requestId, provider.timeout);

      return new Response(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // 非流式响应处理
    const { response, usedModel, usedProvider } = await executeWithRetry(route, body, requestId, user?.providerKeys);
    const data = await response.json();

    // 扣减 Credits（仅对 free tier 用户）
    // Pro/Team 用户享受无限 credits
    if (user && user.tier === 'free') {
      await deductCredits(user.userId, 1);
    }

    const latencyMs = Date.now() - startTime;

    // 记录请求日志
    if (user) {
      try {
        // 从响应中提取 token 使用量
        const usage = data.usage || {};
        const inputTokens = usage.prompt_tokens || 0;
        const outputTokens = usage.completion_tokens || 0;
        // 简单的成本计算（实际应该根据模型定价）
        const costUsd = (inputTokens + outputTokens) * 0.00001;

        await logRequest({
          id: requestId,
          userId: user.userId,
          model: usedModel,
          provider: usedProvider,
          inputTokens,
          outputTokens,
          costUsd,
          intent: classification.intent,
          latencyMs,
          success: true,
        });
      } catch (logError) {
        console.error('[ChatCompletions] Failed to log request:', logError);
      }
    }

    // 添加路由信息
    const result = {
      ...data,
      _routing: {
        intent: classification.intent,
        confidence: classification.confidence,
        model: usedModel,
        provider: usedProvider,
        reason: route.reason,
        alternatives: route.alternatives,
        latency_ms: latencyMs,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ChatCompletions] Error:', error);
    const latencyMs = Date.now() - startTime;

    // 记录失败的请求日志
    if (user) {
      try {
        await logRequest({
          id: requestId,
          userId: user?.userId || 'unknown',
          model: route?.selectedModel || 'unknown',
          provider: route?.provider || 'unknown',
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          intent: classification?.intent || 'unknown',
          latencyMs,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (logError) {
        console.error('[ChatCompletions] Failed to log error:', logError);
      }
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Chat completion failed',
          latency_ms: latencyMs,
        },
      },
      { status: 500 }
    );
  }
}

// ==================== OPTIONS Handler (CORS) ====================

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}