import { z } from 'zod';
import type { Tool, ToolResult, ToolContext, IntentType, ClassificationSource } from '../types';

// 输入 Schema
export const ClassifyInputSchema = z.object({
  message: z.string().min(1).max(50000),
  history: z.array(z.string()).max(20).optional(),
  fastMode: z.boolean().default(false),
});

// 输出 Schema
export const ClassifyOutputSchema = z.object({
  intent: z.enum([
    'coding',
    'analysis',
    'creative',
    'casual_chat',
    'trading',
    'translation',
    'long_context',
    'reasoning',
    'knowledge',
  ]),
  confidence: z.number().min(0).max(1),
  source: z.enum(['rule', 'ai', 'cached']),
  reasoning: z.string().optional(),
});

export type ClassifyInput = z.infer<typeof ClassifyInputSchema>;
export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

/**
 * 意图分类工具
 * 实现三层路由机制：规则引擎 → AI 分类器 → 缓存
 */
export const ClassifyTool: Tool<typeof ClassifyInputSchema, ClassifyOutput> = {
  name: 'classify',
  description: 'Classify user intent from message using rules or AI',

  inputSchema: ClassifyInputSchema,
  outputSchema: ClassifyOutputSchema,

  async call(
    input: ClassifyInput,
    context: ToolContext
  ): Promise<ToolResult<ClassifyOutput>> {
    const startTime = Date.now();

    // Layer 0: 缓存检查
    const cacheKey = `intent:${hashMessage(input.message)}`;
    const cached = context.cache?.get<ClassifyOutput>(cacheKey);
    if (cached) {
      return {
        data: { ...cached, source: 'cached' },
        metadata: { latencyMs: Date.now() - startTime },
      };
    }

    // Layer 1: 规则引擎（零成本）
    const ruleResult = await applyRules(input.message, context);
    if (ruleResult && ruleResult.confidence >= 0.9) {
      const result: ClassifyOutput = { ...ruleResult, source: 'rule' };
      context.cache?.set(cacheKey, result, 3600000); // 1 hour
      return {
        data: result,
        metadata: { latencyMs: Date.now() - startTime },
      };
    }

    // Layer 2: AI 分类器（如果规则不够确定）
    if (!input.fastMode) {
      const aiResult = await classifyWithAI(
        input.message,
        input.history,
        context
      );
      if (aiResult) {
        context.cache?.set(cacheKey, aiResult, 3600000);
        return {
          data: aiResult,
          metadata: { latencyMs: Date.now() - startTime },
        };
      }
    }

    // Fallback: 返回规则结果或默认值
    const fallback: ClassifyOutput = ruleResult
      ? { ...ruleResult, source: 'rule' }
      : {
          intent: 'casual_chat',
          confidence: 0.5,
          source: 'rule',
          reasoning: 'Default fallback',
        };

    return {
      data: fallback,
      metadata: { latencyMs: Date.now() - startTime },
    };
  },

  isEnabled(): boolean {
    return true;
  },

  isConcurrencySafe(): boolean {
    return true;
  },

  isReadOnly(): boolean {
    return true;
  },

  isDestructive(): boolean {
    return false;
  },
};

/**
 * 简单的消息哈希函数
 */
function hashMessage(message: string): string {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `msg:${hash.toString(16)}:${message.length}`;
}

/**
 * 规则引擎（从 rules.ts 导入，这里先占位）
 */
async function applyRules(
  message: string,
  context: ToolContext
): Promise<Omit<ClassifyOutput, 'source'> | null> {
  // 临时实现，后续从 rules.ts 导入
  const { applyRules: rules } = await import('./rules');
  return rules(message, context);
}

/**
 * AI 分类器 - 集成 Ollama 本地推理
 * 使用 Qwen2.5-0.5B 或其他小模型做意图分类
 * Ollama 不可用时优雅降级到规则引擎
 */
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_CLASSIFY_MODEL || 'qwen2.5:0.5b';
const CLASSIFY_CACHE = new Map<string, { result: ClassifyOutput; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const INTENT_LIST = [
  'coding', 'reasoning', 'analysis', 'creative', 'translation',
  'long_context', 'casual_chat', 'trading', 'knowledge',
];

async function classifyWithAI(
  message: string,
  history?: string[],
  context?: ToolContext
): Promise<ClassifyOutput | null> {
  // Check cache
  const cacheKey = message.slice(0, 200);
  const cached = CLASSIFY_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  try {
    const prompt = `You are an intent classifier. Classify the following message into exactly one of these intents: ${INTENT_LIST.join(', ')}

Message: ${message.slice(0, 500)}

Respond with ONLY the intent name, nothing else.`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 20 },
      }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) return null;

    const data = await response.json() as { response: string };
    const intentText = data.response?.trim().toLowerCase();

    // Validate the response is a known intent
    const matchedIntent = INTENT_LIST.find(i => intentText?.includes(i));
    if (!matchedIntent) return null;

    const result: ClassifyOutput = {
      intent: matchedIntent as any,
      confidence: 0.85, // AI classification confidence
      source: 'ai',
      reasoning: `AI classified as ${matchedIntent} using ${OLLAMA_MODEL}`,
    };

    // Cache the result
    CLASSIFY_CACHE.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL });

    return result;
  } catch {
    // Ollama not available — graceful degradation
    return null;
  }
}
