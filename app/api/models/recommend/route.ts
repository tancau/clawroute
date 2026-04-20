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
