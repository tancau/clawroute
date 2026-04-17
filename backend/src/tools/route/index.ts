import { z } from 'zod';
import type { Tool } from '../types';
import type { IntentType } from '../types';
import { 
  providers, 
  modelCapabilities, 
  getModelsForIntent,
  getProvider,
  type ModelCapability,
  type ProviderConfig,
} from '../../config/providers';

/**
 * 路由输入 Schema
 */
export const RouteInputSchema = z.object({
  intent: z.string().describe('分类后的意图'),
  message: z.string().describe('用户消息'),
  history: z.array(z.string()).optional().describe('历史消息'),
  constraints: z.object({
    maxLatency: z.number().optional().describe('最大延迟要求 (ms)'),
    maxCost: z.number().optional().describe('最大成本要求 ($/1M tokens)'),
    preferredProvider: z.string().optional().describe('偏好 Provider'),
    excludeModels: z.array(z.string()).optional().describe('排除的模型'),
    requireFeatures: z.array(z.string()).optional().describe('必需的功能'),
  }).optional().default({}),
  contextLength: z.number().optional().describe('上下文长度'),
});

/**
 * 路由输出 Schema
 */
export const RouteOutputSchema = z.object({
  selectedModel: z.string(),
  provider: z.string(),
  baseUrl: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.object({
    model: z.string(),
    provider: z.string(),
    reason: z.string(),
  })),
  estimatedLatency: z.number().optional(),
  estimatedCost: z.number().optional(),
});

export type RouteInput = z.infer<typeof RouteInputSchema>;
export type RouteOutput = z.infer<typeof RouteOutputSchema>;

/**
 * 模型路由器
 * 根据意图和约束选择最佳模型
 */
export const RouteTool: Tool<typeof RouteInputSchema, RouteOutput> = {
  name: 'route',
  description: 'Select the best model based on intent and constraints',
  inputSchema: RouteInputSchema,
  outputSchema: RouteOutputSchema,

  async call(input: RouteInput, context) {
    const startTime = Date.now();
    
    // 1. 获取意图对应的候选模型
    const candidates = getModelsForIntent(input.intent);
    
    if (candidates.length === 0) {
      throw new Error(`No models found for intent: ${input.intent}`);
    }

    // 2. 应用约束过滤
    let filtered = applyConstraints(candidates, input.constraints, input.contextLength);

    // 3. 如果全部被过滤，使用默认模型
    if (filtered.length === 0) {
      filtered = candidates[0] ? [candidates[0]] : [];
    }
    
    if (filtered.length === 0) {
      throw new Error('No models available for routing');
    }

    // 4. 排序并选择最佳
    const scored = filtered.map(m => ({
      model: m,
      score: calculateScore(m, input.constraints),
    }));
    
    scored.sort((a, b) => b.score - a.score);

    // 5. 构建结果
    const selected = scored[0]?.model;
    if (!selected) {
      throw new Error('No model selected after scoring');
    }
    const provider = getProvider(selected.provider);
    
    if (!provider) {
      throw new Error(`Provider not found: ${selected.provider}`);
    }

    const result: RouteOutput = {
      selectedModel: selected.model,
      provider: selected.provider,
      baseUrl: provider.baseUrl,
      reason: buildReason(selected, input.intent, scored[0]?.score ?? 0),
      confidence: Math.min((scored[0]?.score ?? 0) / 100, 1),
      alternatives: scored.slice(1, 4).map(s => ({
        model: s.model.model,
        provider: s.model.provider,
        reason: buildReason(s.model, input.intent, s.score),
      })),
      estimatedLatency: selected.avgLatency,
      estimatedCost: selected.inputCost + selected.outputCost,
    };

    return {
      data: result,
      metadata: {
        latencyMs: Date.now() - startTime,
        candidatesConsidered: candidates.length,
        candidatesFiltered: candidates.length - filtered.length,
      },
    };
  },

  isEnabled: () => true,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
};

/**
 * 应用约束过滤
 */
function applyConstraints(
  models: ModelCapability[],
  constraints: RouteInput['constraints'],
  contextLength?: number
): ModelCapability[] {
  let result = [...models];

  // 排除特定模型
  if (constraints.excludeModels?.length) {
    result = result.filter(m => !constraints.excludeModels!.includes(m.model));
  }

  // 排除特定 Provider
  if (constraints.preferredProvider) {
    const preferred = result.filter(m => m.provider === constraints.preferredProvider);
    if (preferred.length > 0) {
      result = preferred;
    }
  }

  // 延迟要求
  if (constraints.maxLatency) {
    const filtered = result.filter(m => 
      !m.avgLatency || m.avgLatency <= constraints.maxLatency!
    );
    if (filtered.length > 0) {
      result = filtered;
    }
  }

  // 成本要求
  if (constraints.maxCost) {
    const filtered = result.filter(m => 
      m.inputCost + m.outputCost <= constraints.maxCost!
    );
    if (filtered.length > 0) {
      result = filtered;
    }
  }

  // 功能要求
  if (constraints.requireFeatures?.length) {
    const filtered = result.filter(m => 
      constraints.requireFeatures!.every(f => m.features?.includes(f))
    );
    if (filtered.length > 0) {
      result = filtered;
    }
  }

  // 上下文长度
  if (contextLength) {
    const filtered = result.filter(m => m.contextWindow >= contextLength);
    if (filtered.length > 0) {
      result = filtered;
    }
  }

  return result;
}

/**
 * 计算模型得分
 */
function calculateScore(
  model: ModelCapability,
  constraints?: RouteInput['constraints']
): number {
  let score = 0;

  // 质量分数 (权重: 40)
  score += (model.qualityScore || 0.8) * 40;

  // 延迟分数 (权重: 20) - 越低越好
  if (model.avgLatency) {
    const latencyScore = Math.max(0, 20 - (model.avgLatency / 200));
    score += latencyScore;
  } else {
    score += 10; // 无延迟数据给中等分
  }

  // 成本分数 (权重: 20) - 越低越好
  const totalCost = model.inputCost + model.outputCost;
  if (totalCost > 0) {
    const costScore = Math.max(0, 20 - totalCost);
    score += costScore;
  } else {
    score += 20; // 免费/代理模型给满分
  }

  // 功能分数 (权重: 10)
  if (model.features?.length) {
    score += Math.min(model.features.length * 2, 10);
  }

  // Provider 优先级调整
  const provider = getProvider(model.provider);
  if (provider) {
    score += (provider.priority - 50) / 10;
  }

  return score;
}

/**
 * 构建选择原因
 */
function buildReason(
  model: ModelCapability,
  intent: string,
  score: number
): string {
  const reasons: string[] = [];
  
  // 质量优势
  if ((model.qualityScore || 0) >= 0.9) {
    reasons.push('high quality');
  }
  
  // 成本优势
  const totalCost = model.inputCost + model.outputCost;
  if (totalCost === 0) {
    reasons.push('free');
  } else if (totalCost < 1) {
    reasons.push('low cost');
  }
  
  // 延迟优势
  if (model.avgLatency && model.avgLatency < 400) {
    reasons.push('fast');
  }
  
  // 功能优势
  if (model.features?.length) {
    reasons.push(`features: ${model.features.slice(0, 2).join(', ')}`);
  }
  
  // 意图匹配
  reasons.push(`intent: ${intent}`);
  
  return reasons.join(', ');
}

export default RouteTool;
