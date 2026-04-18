import { z } from 'zod';
import type { Tool } from '../types';
import { getProvider, type ProviderConfig } from '../../config/providers';
import { getAvailableKey, recordKeyUsage } from '../../keys';
import { BillingTool, calculateCost, calculateSavings } from '../../billing';
import { deductCredits } from '../../users';
import { logger } from '../../monitoring/logger';
import { db } from '../../db';

/**
 * 代理请求输入 Schema
 */
export const ProxyInputSchema = z.object({
  provider: z.string().describe('Provider 名称'),
  model: z.string().describe('模型名称'),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
    name: z.string().optional(),
  })).describe('消息列表'),
  options: z.object({
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().min(1).optional(),
    top_p: z.number().min(0).max(1).optional(),
    stream: z.boolean().optional().default(false),
    stop: z.array(z.string()).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
  }).optional().default({}),
  metadata: z.object({
    requestId: z.string(),
    userId: z.string().optional(),
    useSharedKey: z.boolean().optional().default(true),
    tier: z.enum(['free', 'paid', 'enterprise']).optional(),
  }).describe('请求元数据'),
});

/**
 * 代理请求输出 Schema
 */
export const ProxyOutputSchema = z.object({
  id: z.string(),
  object: z.string(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: z.object({
      role: z.string(),
      content: z.string(),
    }),
    finish_reason: z.string(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
  provider: z.string(),
  latencyMs: z.number(),
});

export type ProxyInput = z.infer<typeof ProxyInputSchema>;
export type ProxyOutput = z.infer<typeof ProxyOutputSchema>;

/**
 * API Key 管理器
 */
class KeyManager {
  private keys: Map<string, string[]> = new Map();
  private keyIndex: Map<string, number> = new Map();

  loadKeys(providerName: string): string[] {
    const provider = getProvider(providerName);
    if (!provider) return [];

    const envKey = process.env[provider.apiKeyEnv];
    if (!envKey) return [];

    const keys = envKey.split(',').map(k => k.trim()).filter(Boolean);
    this.keys.set(providerName, keys);
    this.keyIndex.set(providerName, 0);
    return keys;
  }

  getNextKey(providerName: string): string | null {
    if (!this.keys.has(providerName)) this.loadKeys(providerName);

    const keys = this.keys.get(providerName);
    if (!keys || keys.length === 0) return null;

    const index = this.keyIndex.get(providerName) || 0;
    const key = keys[index] ?? null;
    this.keyIndex.set(providerName, (index + 1) % keys.length);
    return key;
  }

  markKeyInvalid(providerName: string, key: string): void {
    const keys = this.keys.get(providerName) || [];
    const filtered = keys.filter(k => k !== key);
    this.keys.set(providerName, filtered);
    if (filtered.length === 0) this.loadKeys(providerName);
  }

  getKeyCount(providerName: string): number {
    if (!this.keys.has(providerName)) this.loadKeys(providerName);
    return this.keys.get(providerName)?.length || 0;
  }
}

export const keyManager = new KeyManager();

/** Max retry attempts for failover */
const MAX_RETRIES = 3;

/** Retryable HTTP status codes */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY = 500;

/** Max retry delay (ms) */
const MAX_RETRY_DELAY = 10_000;

/**
 * Resolve API key for a provider (shared pool first, then env var)
 */
function resolveApiKey(provider: string, metadata: ProxyInput['metadata']): {
  apiKey: string; keyId: string | null; tier: string;
} | null {
  let apiKey: string | null = null;
  let keyId: string | null = null;
  const tier = metadata.tier || 'free';

  if (metadata.useSharedKey !== false) {
    const sharedKey = getAvailableKey(provider, tier);
    if (sharedKey) {
      apiKey = sharedKey.key;
      keyId = sharedKey.keyId;
    }
  }

  if (!apiKey) {
    apiKey = keyManager.getNextKey(provider);
  }

  if (!apiKey) return null;
  return { apiKey, keyId, tier };
}

/**
 * Build the request body for OpenAI-compatible chat completions
 */
function buildRequestBody(input: ProxyInput) {
  return {
    model: input.model,
    messages: input.messages,
    ...input.options,
  };
}

/**
 * Record usage and billing after a successful request
 */
async function recordUsage(
  input: ProxyInput,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
  latencyMs: number,
  keyId: string | null,
  tier: string,
  context: any,
) {
  if (keyId) recordKeyUsage(keyId);

  if (!input.metadata.userId) return;

  // Precise billing: calculate cost from token usage × model price
  const costCents = calculateCost(input.model, usage.prompt_tokens, usage.completion_tokens);
  // Convert cost in cents to credit units (1 credit = $0.01 = 1 cent)
  const creditsToDeduct = Math.max(1, costCents);

  try {
    await BillingTool.call({
      userId: input.metadata.userId,
      keyId: keyId || undefined,
      requestId: input.metadata.requestId,
      provider: input.provider,
      model: input.model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      latencyMs,
      creditsUsed: creditsToDeduct,
    }, context);

    deductCredits(input.metadata.userId, creditsToDeduct);
  } catch (err) {
    logger.error('Failed to log usage:', err);
  }
}

/**
 * Execute a single proxy request (non-streaming)
 */
async function executeSingleRequest(
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

/**
 * Execute a proxy request with retry + failover
 * On failure, tries next available key, then fails over to alternative providers
 */
async function executeWithRetry(
  input: ProxyInput,
  context: any,
  alternatives?: Array<{ provider: string; model: string }>,
): Promise<{ data: Record<string, unknown>; provider: string; model: string; keyId: string | null; tier: string }> {
  const provider = getProvider(input.provider);
  if (!provider) throw new Error(`Provider not found: ${input.provider}`);

  const url = `${provider.baseUrl}/chat/completions`;
  const requestBody = buildRequestBody(input);

  // Build list of (provider, model, apiKey) tuples to try
  const attempts: Array<{ provider: string; model: string; apiKey: string; keyId: string | null; tier: string; url: string; timeout: number }> = [];

  // Primary provider
  const primaryKey = resolveApiKey(input.provider, input.metadata);
  if (primaryKey) {
    attempts.push({
      provider: input.provider,
      model: input.model,
      apiKey: primaryKey.apiKey,
      keyId: primaryKey.keyId,
      tier: primaryKey.tier,
      url,
      timeout: provider.timeout,
    });
  }

  // Alternative providers for failover
  if (alternatives) {
    for (const alt of alternatives) {
      const altProvider = getProvider(alt.provider);
      if (!altProvider) continue;
      const altKey = resolveApiKey(alt.provider, { ...input.metadata, tier: input.metadata.tier });
      if (altKey) {
        attempts.push({
          provider: alt.provider,
          model: alt.model,
          apiKey: altKey.apiKey,
          keyId: altKey.keyId,
          tier: altKey.tier,
          url: `${altProvider.baseUrl}/chat/completions`,
          timeout: altProvider.timeout,
        });
      }
    }
  }

  if (attempts.length === 0) {
    throw new Error(`No API key available for provider: ${input.provider}`);
  }

  let lastError: Error | null = null;

  for (let i = 0; i < Math.min(attempts.length, MAX_RETRIES); i++) {
    const attempt = attempts[i]!;
    const attemptRequestBody = { ...requestBody, model: attempt.model };

    // Exponential backoff before retry (skip on first attempt)
    if (i > 0) {
      const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, i - 1), MAX_RETRY_DELAY);
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      const response = await executeSingleRequest(
        attempt.url,
        attemptRequestBody,
        attempt.apiKey,
        input.metadata.requestId,
        attempt.timeout,
      );

      if (!response.ok) {
        const errorText = await response.text();

        // Mark key invalid on auth errors
        if (response.status === 401 || response.status === 403) {
          keyManager.markKeyInvalid(attempt.provider, attempt.apiKey);
        }

        // Retryable status: respect Retry-After, then continue
        if (RETRYABLE_STATUS.has(response.status)) {
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const waitMs = parseInt(retryAfter, 10) * 1000;
            if (waitMs > 0 && waitMs < 60_000) {
              await new Promise(r => setTimeout(r, waitMs));
            }
          }
          lastError = new Error(`Provider error (retryable): ${response.status} - ${errorText}`);
          continue;
        }

        // Non-retryable error: throw immediately
        throw new Error(`Provider error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as Record<string, unknown>;
      return { data, provider: attempt.provider, model: attempt.model, keyId: attempt.keyId, tier: attempt.tier };
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          continue; // Try next attempt on timeout
        }
        if (error.message.startsWith('Provider error (retryable)')) {
          continue;
        }
        // Non-retryable error
        throw error;
      }
      throw error;
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Stream SSE response from provider to client
 * Supports billing (parses usage from final chunk) and failover
 */
export function createSSEStream(
  url: string,
  requestBody: Record<string, unknown>,
  apiKey: string,
  requestId: string,
  timeout: number,
  billingCallback?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => Promise<void>,
  failoverAttempts?: Array<{ url: string; apiKey: string; model: string; timeout: number }>,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const allAttempts: Array<{ url: string; apiKey: string; model: string; timeout: number }> = [
        { url, apiKey, model: (requestBody.model as string) || '', timeout },
        ...(failoverAttempts || []),
      ];

      for (let attemptIdx = 0; attemptIdx < Math.min(allAttempts.length, 2); attemptIdx++) {
        const attempt = allAttempts[attemptIdx]!;
        const attemptBody = { ...requestBody, model: attempt.model || requestBody.model };

        try {
          const response = await fetch(attempt.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${attempt.apiKey}`,
              'X-Request-ID': requestId,
            },
            body: JSON.stringify(attemptBody),
            signal: AbortSignal.timeout(attempt.timeout),
          });

          if (!response.ok) {
            const errorText = await response.text();

            // If retryable and we have more attempts, try next
            if (RETRYABLE_STATUS.has(response.status) && attemptIdx < allAttempts.length - 1) {
              const failoverChunk = `data: ${JSON.stringify({
                type: 'provider_failover',
                provider_error: response.status,
                next_attempt: attemptIdx + 1,
              })}\n\n`;
              controller.enqueue(encoder.encode(failoverChunk));
              continue;
            }

            const errorChunk = `data: ${JSON.stringify({ error: { message: `Provider error: ${response.status} - ${errorText}`, type: 'provider_error' } })}\n\n`;
            controller.enqueue(encoder.encode(errorChunk));
            controller.close();
            return;
          }

          if (!response.body) {
            controller.close();
            return;
          }

          // Stream passthrough with usage tracking
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let lastUsageData: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              controller.enqueue(value);

              // Parse SSE chunks to find usage data
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(data);
                    // OpenAI streaming format: usage in final chunk
                    if (parsed.usage) {
                      lastUsageData = parsed.usage;
                    }
                  } catch {}
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // Record billing after stream completes
          if (billingCallback && lastUsageData) {
            try {
              await billingCallback(lastUsageData);
            } catch (err) {
              logger.error('Failed to record streaming usage:', err);
            }
          } else if (billingCallback && !lastUsageData) {
            // Provider didn't return usage — estimate from chunks
            // This is a rough estimate; actual usage may differ
            try {
              await billingCallback({
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
              });
            } catch {}
          }

          controller.close();
          return; // Success, don't try more attempts
        } catch (error) {
          // If we have more attempts, try next
          if (attemptIdx < allAttempts.length - 1) {
            const failoverChunk = `data: ${JSON.stringify({
              type: 'provider_failover',
              error: error instanceof Error ? error.message : 'Unknown',
              next_attempt: attemptIdx + 1,
            })}\n\n`;
            controller.enqueue(encoder.encode(failoverChunk));
            continue;
          }

          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const errorChunk = `data: ${JSON.stringify({ error: { message: errorMsg, type: 'stream_error' } })}\n\n`;
          controller.enqueue(encoder.encode(errorChunk));
          controller.close();
          return;
        }
      }

      controller.close();
    },
  });
}

/**
 * Request proxy tool with streaming, retry + failover, and precise billing
 */
export const ProxyTool: Tool<typeof ProxyInputSchema, ProxyOutput> = {
  name: 'proxy',
  description: 'Forward request to target provider with streaming, retry, and failover',
  inputSchema: ProxyInputSchema,
  outputSchema: ProxyOutputSchema,

  async call(input: ProxyInput, context) {
    const startTime = Date.now();

    // Streaming mode: return a special marker, the server.ts handles SSE passthrough
    if (input.options?.stream) {
      const provider = getProvider(input.provider);
      if (!provider) throw new Error(`Provider not found: ${input.provider}`);

      const keyInfo = resolveApiKey(input.provider, input.metadata);
      if (!keyInfo) throw new Error(`No API key available for provider: ${input.provider}`);

      const url = `${provider.baseUrl}/chat/completions`;
      const requestBody = buildRequestBody(input);

      // Return stream info for server.ts to handle
      return {
        data: {
          id: `chatcmpl-${crypto.randomUUID()}`,
          object: 'chat.completion',
          model: input.model,
          choices: [],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          provider: input.provider,
          latencyMs: 0,
          _stream: true,
          _streamUrl: url,
          _streamBody: requestBody,
          _streamApiKey: keyInfo.apiKey,
          _streamTimeout: provider.timeout,
          _meta: {
            keyId: keyInfo.keyId,
            tier: keyInfo.tier,
            usedSharedKey: !!keyInfo.keyId,
          },
        } as any,
        metadata: {
          requestId: input.metadata.requestId,
          provider: input.provider,
          model: input.model,
          latencyMs: 0,
        },
      };
    }

    // Non-streaming mode: execute with retry + failover
    const { data, provider: usedProvider, model: usedModel, keyId, tier } =
      await executeWithRetry(input, context);

    const usage = (data.usage as {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    }) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    const latencyMs = Date.now() - startTime;

    // Record usage with precise billing
    await recordUsage(input, usage, latencyMs, keyId, tier, context);

    const result = {
      id: (data.id as string) || `chatcmpl-${crypto.randomUUID()}`,
      object: (data.object as string) || 'chat.completion',
      model: usedModel,
      choices: (data.choices as Array<{
        index: number;
        message: { role: string; content: string };
        finish_reason: string;
      }>) || [],
      usage,
      provider: usedProvider,
      latencyMs,
      _meta: {
        keyId,
        tier,
        usedSharedKey: !!keyId,
      },
    };

    return {
      data: result,
      metadata: {
        requestId: input.metadata.requestId,
        provider: usedProvider,
        model: usedModel,
        latencyMs,
      },
    };
  },

  isEnabled: () => true,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
};

export default ProxyTool;
