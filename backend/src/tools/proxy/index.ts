import { z } from 'zod';
import type { Tool } from '../types';
import { getProvider, type ProviderConfig } from '../../config/providers';
import { getAvailableKey, recordKeyUsage } from '../../keys';
import { BillingTool, calculateCost, calculateSavings } from '../../billing';
import { deductCredits } from '../../users';
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

  /**
   * 加载 Provider 的 API Keys
   */
  loadKeys(providerName: string): string[] {
    const provider = getProvider(providerName);
    if (!provider) {
      return [];
    }

    // 从环境变量获取 key
    const envKey = process.env[provider.apiKeyEnv];
    if (!envKey) {
      console.warn(`No API key found for provider: ${providerName} (${provider.apiKeyEnv})`);
      return [];
    }

    // 支持多个 key (用逗号分隔)
    const keys = envKey.split(',').map(k => k.trim()).filter(Boolean);
    this.keys.set(providerName, keys);
    this.keyIndex.set(providerName, 0);

    return keys;
  }

  /**
   * 获取下一个可用的 Key (轮询策略)
   */
  getNextKey(providerName: string): string | null {
    if (!this.keys.has(providerName)) {
      this.loadKeys(providerName);
    }

    const keys = this.keys.get(providerName);
    if (!keys || keys.length === 0) {
      return null;
    }

    const index = this.keyIndex.get(providerName) || 0;
    const key = keys[index] ?? null;
    
    // 更新索引
    this.keyIndex.set(providerName, (index + 1) % keys.length);
    
    return key;
  }

  /**
   * 标记 Key 失效
   */
  markKeyInvalid(providerName: string, key: string): void {
    const keys = this.keys.get(providerName) || [];
    const filtered = keys.filter(k => k !== key);
    this.keys.set(providerName, filtered);
    
    if (filtered.length === 0) {
      // 尝试重新加载
      this.loadKeys(providerName);
    }
  }

  /**
   * 获取可用 Key 数量
   */
  getKeyCount(providerName: string): number {
    if (!this.keys.has(providerName)) {
      this.loadKeys(providerName);
    }
    return this.keys.get(providerName)?.length || 0;
  }
}

export const keyManager = new KeyManager();

/**
 * 请求代理工具
 * 转发请求到目标 Provider
 */
export const ProxyTool: Tool<typeof ProxyInputSchema, ProxyOutput> = {
  name: 'proxy',
  description: 'Forward request to target provider',
  inputSchema: ProxyInputSchema,
  outputSchema: ProxyOutputSchema,

  async call(input: ProxyInput, context) {
    const startTime = Date.now();

    // 1. 获取 Provider 配置
    const provider = getProvider(input.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${input.provider}`);
    }

    // 2. 获取 API Key（优先共享池，再环境变量）
    let apiKey: string | null = null;
    let keyId: string | null = null;
    let tier = input.metadata.tier || 'free';
    
    if (input.metadata.useSharedKey !== false) {
      const sharedKey = getAvailableKey(input.provider, tier);
      if (sharedKey) {
        apiKey = sharedKey.key;
        keyId = sharedKey.keyId;
      }
    }
    
    if (!apiKey) {
      apiKey = keyManager.getNextKey(input.provider);
    }
    
    if (!apiKey) {
      throw new Error(`No API key available for provider: ${input.provider}`);
    }

    // 3. 构建请求
    const url = `${provider.baseUrl}/chat/completions`;
    const requestBody = {
      model: input.model,
      messages: input.messages,
      ...input.options,
    };

    // 4. 发送请求
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Request-ID': input.metadata.requestId,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(provider.timeout),
      });

      // 5. 处理响应
      if (!response.ok) {
        const errorText = await response.text();
        
        // Key 失效处理
        if (response.status === 401 || response.status === 403) {
          keyManager.markKeyInvalid(input.provider, apiKey);
        }
        
        throw new Error(`Provider error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as Record<string, unknown>;
      
      // 6. 记录使用
      const usage = (data.usage as {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      }) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      // 记录 Key 使用
      if (keyId) {
        recordKeyUsage(keyId);
      }
      
      // 记录使用日志（如果有用户）
      if (input.metadata.userId) {
        try {
          await BillingTool.call({
            userId: input.metadata.userId,
            keyId: keyId || undefined,
            requestId: input.metadata.requestId,
            provider: input.provider,
            model: input.model,
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            latencyMs: Date.now() - startTime,
            creditsUsed: 1,
          }, context);
          
          // 扣减积分
          deductCredits(input.metadata.userId, 1);
        } catch (err) {
          console.error('Failed to log usage:', err);
        }
      }
      
      // 7. 返回结果
      const result = {
        id: (data.id as string) || `chatcmpl-${crypto.randomUUID()}`,
        object: (data.object as string) || 'chat.completion',
        model: input.model,
        choices: (data.choices as Array<{
          index: number;
          message: { role: string; content: string };
          finish_reason: string;
        }>) || [],
        usage,
        provider: input.provider,
        latencyMs: Date.now() - startTime,
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
          provider: input.provider,
          model: input.model,
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      // 超时或网络错误
      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          throw new Error(`Request timeout after ${provider.timeout}ms`);
        }
      }
      throw error;
    }
  },

  isEnabled: () => true,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
};

export default ProxyTool;
