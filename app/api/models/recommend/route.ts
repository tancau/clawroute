import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import {
  ModelCapability,
  CapabilityMatrixData,
  RecommendationRequest,
  RecommendedModel,
  RecommendationIntent,
  BudgetLevel,
  INTENT_CAPABILITY_MAP,
  getBudgetLimits,
  calculateOverallScore,
  calculateValueScore,
  ModelCapabilityScores,
} from '@/lib/models/capability-matrix';

// ===== Data Loading =====

let capabilityCache: CapabilityMatrixData | null = null;

function loadCapabilityData(): CapabilityMatrixData {
  if (capabilityCache) {
    return capabilityCache;
  }
  
  const dataPath = path.join(process.cwd(), 'data', 'model-capabilities.json');
  
  try {
    const content = fs.readFileSync(dataPath, 'utf-8');
    capabilityCache = JSON.parse(content);
    return capabilityCache!;
  } catch (error) {
    console.error('Failed to load capability data:', error);
    throw new Error('Model capability data not available');
  }
}

// ===== New Recommendation Types =====

/** Extended intent types for new API */
export type ExtendedIntent =
  | 'coding'
  | 'reasoning'
  | 'math'
  | 'translation'
  | 'creative'
  | 'analysis'
  | 'longContext'
  | 'chinese'
  | 'chat'
  | 'auto';

/** Budget mode for recommendations */
export type BudgetMode = 'economy' | 'medium' | 'premium' | 'unlimited';

/** Selection mode for recommendations */
export type SelectionMode = 'best' | 'value' | 'cheapest';

/** New recommendation request format */
export interface NewRecommendationRequest {
  availableModels: string[];
  intent?: ExtendedIntent;
  budget?: BudgetMode;
  mode?: SelectionMode;
}

/** Recommendation item with detailed info */
export interface RecommendationItem {
  model: string;
  score: number;
  costPerToken: { input: number; output: number }; 
  capabilityScore: number;
  valueScore: number;
  reason: string;
}

/** Preset recommendation */
export interface PresetRecommendation {
  model: string;
  reason: string;
}

/** New recommendation response */
export interface NewRecommendationResponse {
  recommendations: RecommendationItem[];
  presets: {
    optimal: PresetRecommendation;
    economy: PresetRecommendation;
    power: PresetRecommendation;
  };
  taskRecommendations?: Record<ExtendedIntent, RecommendationItem>;
}

// ===== Intent to Capability Mapping =====

const EXTENDED_INTENT_CAPABILITY_MAP: Record<ExtendedIntent, (keyof ModelCapabilityScores)[]> = {
  coding: ['coding', 'reasoning'],
  reasoning: ['reasoning', 'analysis'],
  math: ['math', 'reasoning'],
  translation: ['translation', 'chinese'],
  creative: ['creative'],
  analysis: ['analysis', 'reasoning'],
  longContext: ['longContext'],
  chinese: ['chinese', 'translation'],
  chat: ['reasoning', 'analysis', 'coding'], // Overall balanced
  auto: ['reasoning', 'analysis', 'coding'], // Overall best
};

// ===== Budget Mode Limits =====

const BUDGET_MODE_LIMITS: Record<BudgetMode, { maxTotalCost: number }> = {
  economy: { maxTotalCost: 1 }, // < $1 per 1M tokens
  medium: { maxTotalCost: 5 }, // < $5 per 1M tokens
  premium: { maxTotalCost: 20 }, // < $20 per 1M tokens
  unlimited: { maxTotalCost: Infinity },
};

// ===== Recommendation Engine =====

/**
 * Calculate recommendation score for a model based on request
 */
function calculateRecommendationScore(
  model: ModelCapability,
  request: RecommendationRequest
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  
  // 1. Intent-based capability scoring
  const intentCapabilities = INTENT_CAPABILITY_MAP[request.intent] || [];
  
  if (intentCapabilities.length > 0) {
    let capabilityScore = 0;
    for (const cap of intentCapabilities) {
      capabilityScore += model.capabilities[cap] || 0;
    }
    capabilityScore /= intentCapabilities.length;
    score += capabilityScore * 6; // Up to 60 points from capabilities
    
    if (capabilityScore >= 8) {
      reasons.push(`excellent ${request.intent} capabilities`);
    } else if (capabilityScore >= 7) {
      reasons.push(`good ${request.intent} performance`);
    }
  } else {
    // For 'fast' or 'cheap' intents, use overall score
    score += (model.overallScore || 5) * 6;
  }
  
  // 2. Budget-based scoring
  if (request.budget) {
    const limits = getBudgetLimits(request.budget);
    const totalCost = model.cost.input + model.cost.output;
    
    if (request.budget === 'free') {
      if (model.isFree || totalCost === 0) {
        score += 20;
        reasons.push('free to use');
      } else if (totalCost <= limits.maxInput + limits.maxOutput) {
        score += 10;
      }
    } else if (totalCost <= limits.maxInput + limits.maxOutput) {
      score += 15;
      // Bonus for being under budget
      const budgetRatio = 1 - (totalCost / (limits.maxInput + limits.maxOutput));
      score += budgetRatio * 5;
    }
  }
  
  // 3. Speed bonus for 'fast' intent
  if (request.intent === 'fast') {
    // Prefer smaller/faster models
    if (model.tags.includes('fast')) {
      score += 15;
      reasons.push('optimized for speed');
    }
    if (model.cost.input <= 0.5) {
      score += 5; // Usually faster models are cheaper
    }
  }
  
  // 4. Value bonus for 'cheap' intent
  if (request.intent === 'cheap') {
    if (model.valueScore && model.valueScore > 3) {
      score += 15;
      reasons.push('excellent value for money');
    }
  }
  
  // 5. Quality threshold check
  if (request.minQuality) {
    const overallQuality = model.overallScore || calculateOverallScore(model.capabilities);
    if (overallQuality < request.minQuality) {
      score *= 0.5; // Heavy penalty
    }
  }
  
  // 6. Context window requirement
  if (request.minContextWindow && model.contextWindow < request.minContextWindow) {
    score *= 0.3; // Heavy penalty
  }
  
  // 7. Required input types
  if (request.requiredInputs && request.requiredInputs.length > 0) {
    const hasAllInputs = request.requiredInputs.every(
      input => model.inputTypes.includes(input)
    );
    if (!hasAllInputs) {
      score = 0; // Disqualify
    } else {
      score += 5;
    }
  }
  
  // 8. Provider filter
  if (request.providers && request.providers.length > 0) {
    if (!request.providers.includes(model.provider)) {
      score = 0; // Disqualify
    }
  }
  
  // 9. Availability check
  if (model.isAvailable === false) {
    score = 0;
  }
  
  // 10. Arena Elo bonus
  if (model.arenaElo && model.arenaElo > 1200) {
    score += (model.arenaElo - 1200) / 10;
    if (model.arenaElo > 1250) {
      reasons.push('top-ranked on Chatbot Arena');
    }
  }
  
  // Generate reason string
  let reason = reasons.length > 0 
    ? reasons.join(', ')
    : `balanced performance for ${request.intent}`;
  
  if (model.isFree) {
    reason += ' (free)';
  }
  
  return { 
    score: Math.round(score * 10) / 10, 
    reason: reason.charAt(0).toUpperCase() + reason.slice(1)
  };
}

/**
 * Get model recommendations based on request parameters
 */
function getRecommendations(request: RecommendationRequest): RecommendedModel[] {
  const data = loadCapabilityData();
  
  const recommendations: RecommendedModel[] = [];
  
  for (const model of data.models) {
    const { score, reason } = calculateRecommendationScore(model, request);
    
    if (score > 0) {
      recommendations.push({
        ...model,
        recommendationScore: score,
        recommendationReason: reason,
      });
    }
  }
  
  // Sort by recommendation score (descending)
  recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
  
  // Apply limit
  const limit = request.limit || 5;
  return recommendations.slice(0, limit);
}

// ===== API Handler =====

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse request parameters
    const intent = (searchParams.get('intent') as RecommendationIntent) || 'general';
    const budget = searchParams.get('budget') as BudgetLevel | null;
    const minQuality = searchParams.get('minQuality') 
      ? parseFloat(searchParams.get('minQuality')!) 
      : undefined;
    const maxCost = searchParams.get('maxCost')
      ? parseFloat(searchParams.get('maxCost')!)
      : undefined;
    const minContextWindow = searchParams.get('minContextWindow')
      ? parseInt(searchParams.get('minContextWindow')!)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 5;
    const providers = searchParams.get('providers')
      ? searchParams.get('providers')!.split(',')
      : undefined;
    const requiredInputs = searchParams.get('requiredInputs')
      ? searchParams.get('requiredInputs')!.split(',') as ('text' | 'image' | 'audio' | 'video')[]
      : undefined;
    
    // Validate intent
    const validIntents: RecommendationIntent[] = [
      'coding', 'reasoning', 'math', 'translation', 'creative',
      'analysis', 'longContext', 'chinese', 'general', 'fast', 'cheap'
    ];
    
    if (!validIntents.includes(intent)) {
      return NextResponse.json(
        { error: `Invalid intent. Valid options: ${validIntents.join(', ')}` },
        { status: 400 }
      );
    }
    
    const recommendationRequest: RecommendationRequest = {
      intent,
      budget: budget || undefined,
      minQuality,
      maxCost,
      minContextWindow,
      requiredInputs,
      limit,
      providers,
    };
    
    const recommendations = getRecommendations(recommendationRequest);
    
    return NextResponse.json({
      success: true,
      request: recommendationRequest,
      recommendations,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Recommendation API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle new request format with availableModels
    if (body.availableModels && Array.isArray(body.availableModels)) {
      const newRequest: NewRecommendationRequest = {
        availableModels: body.availableModels,
        intent: body.intent as ExtendedIntent || 'auto',
        budget: body.budget as BudgetMode || 'medium',
        mode: body.mode as SelectionMode || 'best',
      };
      
      const response = getNewRecommendations(newRequest);
      return NextResponse.json({
        success: true,
        ...response,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Legacy request format
    const recommendationRequest: RecommendationRequest = {
      intent: body.intent || 'general',
      budget: body.budget,
      minQuality: body.minQuality,
      maxCost: body.maxCost,
      minContextWindow: body.minContextWindow,
      requiredInputs: body.requiredInputs,
      limit: body.limit || 5,
      providers: body.providers,
    };
    
    const recommendations = getRecommendations(recommendationRequest);
    
    return NextResponse.json({
      success: true,
      request: recommendationRequest,
      recommendations,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Recommendation API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

// ===== New Recommendation Functions =====

/** Calculate capability score for a specific intent */
function getIntentCapabilityScore(
  model: ModelCapability,
  intent: ExtendedIntent
): number {
  const capabilities = EXTENDED_INTENT_CAPABILITY_MAP[intent];
  if (!capabilities || capabilities.length === 0) {
    return model.overallScore || calculateOverallScore(model.capabilities);
  }
  
  let totalScore = 0;
  for (const cap of capabilities) {
    totalScore += model.capabilities[cap] || 0;
  }
  return Math.round((totalScore / capabilities.length) * 10) / 10;
}

/** Generate recommendation reason */
function generateReason(model: ModelCapability, intent: ExtendedIntent, mode: SelectionMode): string {
  const score = getIntentCapabilityScore(model, intent);
  const parts: string[] = [];
  
  if (score >= 9) parts.push(`${intent}能力顶尖`);
  else if (score >= 8) parts.push(`${intent}能力优秀`);
  else if (score >= 7) parts.push(`${intent}能力良好`);
  
  if (model.isFree) parts.push('完全免费');
  else if (model.cost.input + model.cost.output < 1) parts.push('成本极低');
  else if (model.cost.input + model.cost.output < 5) parts.push('性价比高');
  
  if (model.arenaElo && model.arenaElo > 1400) parts.push('Arena排名前列');
  if (model.contextWindow >= 200000) parts.push('超大上下文');
  
  if (mode === 'cheapest' && !model.isFree) parts.push('最低价格');
  if (mode === 'value') parts.push('最优性价比');
  
  return parts.length > 0 ? parts.join(', ') : '综合表现良好';
}

/** Get recommendations based on new request format */
function getNewRecommendations(request: NewRecommendationRequest): NewRecommendationResponse {
  const data = loadCapabilityData();
  
  // Filter models by available list
  const availableModels = request.availableModels;
  const filteredModels = data.models.filter(m => 
    availableModels.includes(m.id) || 
    availableModels.some(avail => avail.includes(m.name.toLowerCase()) || m.id.includes(avail))
  );
  
  // If no matching models found, use all
  const modelsToUse = filteredModels.length > 0 ? filteredModels : data.models;
  
  // Budget filter
  const budgetLimit = BUDGET_MODE_LIMITS[request.budget || 'medium'];
  const budgetFiltered = modelsToUse.filter(m => 
    budgetLimit.maxTotalCost === Infinity || 
    m.isFree || 
    (m.cost.input + m.cost.output) <= budgetLimit.maxTotalCost
  );
  
  // Sort based on mode
  const intent = request.intent || 'auto';
  const mode = request.mode || 'best';
  
  const sortedModels = [...budgetFiltered].sort((a, b) => {
    const aScore = getIntentCapabilityScore(a, intent);
    const bScore = getIntentCapabilityScore(b, intent);
    
    if (mode === 'best') {
      return bScore - aScore; // Highest capability score
    } else if (mode === 'value') {
      // Balance capability and cost
      const aValue = a.valueScore || calculateValueScore(aScore, a.cost);
      const bValue = b.valueScore || calculateValueScore(bScore, b.cost);
      return bValue - aValue;
    } else if (mode === 'cheapest') {
      // Lowest cost
      const aCost = a.cost.input + a.cost.output;
      const bCost = b.cost.input + b.cost.output;
      return aCost - bCost;
    }
    return 0;
  });
  
  // Generate recommendations
  const recommendations: RecommendationItem[] = sortedModels.slice(0, 5).map(model => {
    const capabilityScore = getIntentCapabilityScore(model, intent);
    return {
      model: model.id,
      score: Math.round(capabilityScore * 10),
      costPerToken: model.cost,
      capabilityScore: capabilityScore,
      valueScore: model.valueScore || calculateValueScore(capabilityScore, model.cost),
      reason: generateReason(model, intent, mode),
    };
  });
  
  // Generate presets
  const presets = {
    optimal: findBestForPreset(sortedModels, 'optimal', availableModels),
    economy: findBestForPreset(sortedModels, 'economy', availableModels),
    power: findBestForPreset(sortedModels, 'power', availableModels),
  };
  
  // Generate task recommendations
  const taskIntents: ExtendedIntent[] = ['coding', 'reasoning', 'math', 'translation', 'creative', 'analysis', 'longContext', 'chinese', 'chat'];
  const taskRecommendations: Record<string, RecommendationItem> = {};
  
  for (const taskIntent of taskIntents) {
    const bestForTask = findBestForIntent(modelsToUse, taskIntent, budgetLimit.maxTotalCost);
    if (bestForTask) {
      taskRecommendations[taskIntent] = {
        model: bestForTask.id,
        score: Math.round(getIntentCapabilityScore(bestForTask, taskIntent) * 10),
        costPerToken: bestForTask.cost,
        capabilityScore: getIntentCapabilityScore(bestForTask, taskIntent),
        valueScore: bestForTask.valueScore || calculateValueScore(getIntentCapabilityScore(bestForTask, taskIntent), bestForTask.cost),
        reason: generateReason(bestForTask, taskIntent, 'best'),
      };
    }
  }
  
  return { recommendations, presets, taskRecommendations };
}

/** Find best model for a preset type */
function findBestForPreset(
  models: ModelCapability[],
  presetType: 'optimal' | 'economy' | 'power',
  availableModels: string[]
): PresetRecommendation {
  // Prefer models that are in the available list
  const inAvailableList = models.filter(m => availableModels.includes(m.id));
  const useModels = inAvailableList.length > 0 ? inAvailableList : models;
  
  if (presetType === 'optimal') {
    // Best overall score with reasonable cost
    const sorted = [...useModels].sort((a, b) => {
      const aOverall = a.overallScore || calculateOverallScore(a.capabilities);
      const bOverall = b.overallScore || calculateOverallScore(b.capabilities);
      // Prefer high score but penalize high cost
      const aPenalty = (a.cost.input + a.cost.output) > 10 ? 0.1 : 0;
      const bPenalty = (b.cost.input + b.cost.output) > 10 ? 0.1 : 0;
      return (bOverall - bPenalty) - (aOverall - aPenalty);
    });
    const best = sorted[0];
    if (!best) return { model: useModels[0]?.id || '', reason: 'Fallback model' }; 
    return { model: best.id, reason: generateReason(best, 'auto', 'value') };
  }
  
  if (presetType === 'economy') {
    // Best free or cheapest model with decent quality
    const freeModels = useModels.filter(m => m.isFree || (m.cost.input + m.cost.output) <= 1);
    if (freeModels.length > 0) {
      const sorted = [...freeModels].sort((a, b) => 
        (b.overallScore || calculateOverallScore(b.capabilities)) - 
        (a.overallScore || calculateOverallScore(a.capabilities))
      );
      const best = sorted[0];
      if (!best) return { model: freeModels[0]?.id || useModels[0]?.id || '', reason: 'Fallback model' }; 
      return { model: best.id, reason: generateReason(best, 'auto', 'cheapest') };
    }
    // If no free, pick cheapest
    const sorted = [...useModels].sort((a, b) => 
      (a.cost.input + a.cost.output) - (b.cost.input + b.cost.output)
    );
    const best = sorted[0];
    if (!best) return { model: useModels[0]?.id || '', reason: 'Fallback model' }; 
    return { model: best.id, reason: generateReason(best, 'auto', 'cheapest') };
  }
  
  if (presetType === 'power') {
    // Highest capability score regardless of cost
    const sorted = [...useModels].sort((a, b) => 
      (b.overallScore || calculateOverallScore(b.capabilities)) - 
      (a.overallScore || calculateOverallScore(a.capabilities))
    );
    const best = sorted[0];
    if (!best) return { model: useModels[0]?.id || '', reason: 'Fallback model' }; 
    return { model: best.id, reason: generateReason(best, 'auto', 'best') };
  }
  
  return { model: useModels[0]?.id || '', reason: 'Default recommendation' };
}

/** Find best model for a specific intent */
function findBestForIntent(
  models: ModelCapability[],
  intent: ExtendedIntent,
  maxCost: number
): ModelCapability | null {
  const filtered = models.filter(m => 
    maxCost === Infinity || m.isFree || (m.cost.input + m.cost.output) <= maxCost
  );
  
  const sorted = [...filtered].sort((a, b) => 
    getIntentCapabilityScore(b, intent) - getIntentCapabilityScore(a, intent)
  );
  
  return sorted[0] || null;
}
