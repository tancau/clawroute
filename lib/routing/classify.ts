/**
 * AI 意图分类器（Ollama 本地小模型）
 *
 * 从 backend/src/tools/classify 移植到 lib/，接入 live 路由（双实现归一）。
 * 规则引擎置信度不足时调用；Ollama 不可用时优雅降级（返回 null，调用方回退规则结果）。
 *
 * 环境变量：
 * - OLLAMA_URL：Ollama 服务地址（默认 http://localhost:11434）
 * - OLLAMA_CLASSIFY_MODEL：分类用模型（默认 qwen2.5:0.5b）
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_CLASSIFY_MODEL || 'qwen2.5:0.5b';
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

// 与 app/api/v1/chat/completions 的 INTENT_RULES 保持一致
const INTENT_LIST = [
  'coding',
  'reasoning',
  'analysis',
  'creative',
  'translation',
  'long_context',
  'casual_chat',
] as const;

export interface IntentClassification {
  intent: string;
  confidence: number;
  source: 'rule' | 'cached' | 'ai';
}

const cache = new Map<string, { result: IntentClassification; expiresAt: number }>();

/**
 * 用 Ollama 本地小模型做意图分类。
 * 不可用/超时/解析失败时返回 null，调用方降级到规则结果。
 */
export async function classifyWithAI(message: string): Promise<IntentClassification | null> {
  // 短消息不调用 AI（规则足够且省资源）
  if (message.trim().length < 8) return null;

  const cacheKey = message.slice(0, 200);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return { ...cached.result, source: 'cached' };
  }

  try {
    const prompt = `You are an intent classifier. Classify the following message into exactly one of these intents: ${INTENT_LIST.join(', ')}.

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
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { response?: string };
    const intentText = data.response?.trim().toLowerCase();
    if (!intentText) return null;

    const matched = INTENT_LIST.find((i) => intentText.includes(i));
    if (!matched) return null;

    const result: IntentClassification = {
      intent: matched,
      confidence: 0.85,
      source: 'ai',
    };

    cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL });
    return result;
  } catch {
    // Ollama 不可用 / 超时 — 优雅降级
    return null;
  }
}
