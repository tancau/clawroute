/**
 * Model Preset API
 * 
 * POST - Apply a preset configuration for user model preferences
 * GET - Get preset recommendations for available models
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import {
  ModelCapability,
  CapabilityMatrixData,
  calculateOverallScore,
  calculateValueScore,
  ModelCapabilityScores,
} from '@/lib/models/capability-matrix';

// ===== Types =====

export type PresetType = 'optimal' | 'economy' | 'power';

export interface PresetRequest {
  userId?: string;
  preset: PresetType;
  availableModels: string[];
}

export interface PresetModels {
  default: string;
  coding: string;
  reasoning: string;
  creative: string;
  cheap: string;
  math?: string;
  translation?: string;
  chinese?: string;
  longContext?: string;
}

export interface PresetResponse {
  preset: PresetType;
  models: PresetModels;
  reasons: Record<string, string>;
  costs: Record<string, { input: number; output: number }>;
}

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

// ===== Intent Mapping =====

const INTENT_CAPABILITY_MAP: Record<string, (keyof ModelCapabilityScores)[]> = {
  coding: ['coding', 'reasoning'],
  reasoning: ['reasoning', 'analysis'],
  math: ['math', 'reasoning'],
  translation: ['translation', 'chinese'],
  creative: ['creative'],
  analysis: ['analysis', 'reasoning'],
  longContext: ['longContext'],
  chinese: ['chinese', 'translation'],
  default: ['reasoning', 'analysis', 'coding'],
};

// ===== Helper Functions =====

function getIntentScore(model: ModelCapability, intent: string): number {
  const capabilities = INTENT_CAPABILITY_MAP[intent] || INTENT_CAPABILITY_MAP.default || [];
  if (capabilities.length === 0) return 0;
  let total = 0;
  for (const cap of capabilities) {
    total += model.capabilities[cap] || 0;
  }
  return total / capabilities.length;
}

function findBestForIntent(
  models: ModelCapability[],
  intent: string,
  presetType: PresetType
): { model: ModelCapability; reason: string } {
  let sorted = [...models];
  
  // Sort based on preset type
  if (presetType === 'economy') {
    // Prioritize free/cheap with decent quality
    const freeModels = models.filter(m => m.isFree || (m.cost.input + m.cost.output) <= 1);
    if (freeModels.length > 0) {
      sorted = [...freeModels].sort((a, b) => {
        const aScore = getIntentScore(a, intent);
        const bScore = getIntentScore(b, intent);
        return bScore - aScore;
      });
    } else {
      sorted.sort((a, b) => {
        const aScore = getIntentScore(a, intent);
        const bScore = getIntentScore(b, intent);
        const aValue = aScore / Math.log10((a.cost.input + a.cost.output) + 1);
        const bValue = bScore / Math.log10((b.cost.input + b.cost.output) + 1);
        return bValue - aValue;
      });
    }
  } else if (presetType === 'power') {
    // Best score regardless of cost
    sorted.sort((a, b) => {
      const aScore = getIntentScore(a, intent);
      const bScore = getIntentScore(b, intent);
      return bScore - aScore;
    });
  } else {
    // Optimal: balance quality and cost
    sorted.sort((a, b) => {
      const aScore = getIntentScore(a, intent);
      const bScore = getIntentScore(b, intent);
      const aValue = a.valueScore || calculateValueScore(aScore, a.cost);
      const bValue = b.valueScore || calculateValueScore(bScore, b.cost);
      return bValue - aValue;
    });
  }
  
  const best = sorted[0];
  if (!best) {
    const fallback = models[0];
    if (!fallback) return { model: models[0]!, reason: 'No models available' }; 
    return { model: fallback, reason: 'Fallback model' }; 
  }
  
  // Generate reason
  const score = getIntentScore(best, intent);
  const parts: string[] = [];
  
  if (score >= 9) parts.push(`${intent}能力顶尖`);
  else if (score >= 8) parts.push(`${intent}能力优秀`);
  else if (score >= 7) parts.push(`${intent}能力良好`);
  
  if (presetType === 'economy') {
    if (best.isFree) parts.push('完全免费');
    else parts.push('成本最低');
  } else if (presetType === 'power') {
    parts.push('最高性能');
  } else {
    if (best.isFree) parts.push('完全免费');
    else if (best.cost.input + best.cost.output < 3) parts.push('性价比高');
  }
  
  return { model: best, reason: parts.join(', ') || '综合推荐' };
}

function findCheapestModel(models: ModelCapability[]): { model: ModelCapability; reason: string } {
  const freeModels = models.filter(m => m.isFree);
  if (freeModels.length > 0) {
    const bestFree = [...freeModels].sort((a, b) => 
      (b.overallScore || calculateOverallScore(b.capabilities)) - 
      (a.overallScore || calculateOverallScore(a.capabilities))
    )[0];
    return { model: bestFree!, reason: '完全免费，质量最优' };
  }
  
  const sorted = [...models].sort((a, b) => 
    (a.cost.input + a.cost.output) - (b.cost.input + b.cost.output)
  );
  return { model: sorted[0]!, reason: '成本最低' };
}

// ===== API Handlers =====

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const preset = (searchParams.get('preset') as PresetType) || 'optimal';
    const availableModels = searchParams.get('models')?.split(',') || [];
    
    const data = loadCapabilityData();
    
    // Filter by available models
    const modelsToUse = availableModels.length > 0
      ? data.models.filter(m => 
        availableModels.includes(m.id) || 
        availableModels.some(avail => m.id.includes(avail))
      )
      : data.models;
    
    if (modelsToUse.length === 0) {
      return NextResponse.json(
        { error: 'No matching models found in available list' },
        { status: 400 }
      );
    }
    
    // Get recommendations for each role
    const defaultResult = findBestForIntent(modelsToUse, 'default', preset);
    const codingResult = findBestForIntent(modelsToUse, 'coding', preset);
    const reasoningResult = findBestForIntent(modelsToUse, 'reasoning', preset);
    const creativeResult = findBestForIntent(modelsToUse, 'creative', preset);
    const mathResult = findBestForIntent(modelsToUse, 'math', preset);
    const translationResult = findBestForIntent(modelsToUse, 'translation', preset);
    const chineseResult = findBestForIntent(modelsToUse, 'chinese', preset);
    const longContextResult = findBestForIntent(modelsToUse, 'longContext', preset);
    const cheapResult = findCheapestModel(modelsToUse);
    
    const response: PresetResponse = {
      preset,
      models: {
        default: defaultResult.model.id,
        coding: codingResult.model.id,
        reasoning: reasoningResult.model.id,
        creative: creativeResult.model.id,
        cheap: cheapResult.model.id,
        math: mathResult.model.id,
        translation: translationResult.model.id,
        chinese: chineseResult.model.id,
        longContext: longContextResult.model.id,
      },
      reasons: {
        default: defaultResult.reason,
        coding: codingResult.reason,
        reasoning: reasoningResult.reason,
        creative: creativeResult.reason,
        cheap: cheapResult.reason,
        math: mathResult.reason,
        translation: translationResult.reason,
        chinese: chineseResult.reason,
        longContext: longContextResult.reason,
      },
      costs: {
        default: defaultResult.model.cost,
        coding: codingResult.model.cost,
        reasoning: reasoningResult.model.cost,
        creative: creativeResult.model.cost,
        cheap: cheapResult.model.cost,
        math: mathResult.model.cost,
        translation: translationResult.model.cost,
        chinese: chineseResult.model.cost,
        longContext: longContextResult.model.cost,
      },
    };
    
    return NextResponse.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Preset API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preset recommendations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PresetRequest = await request.json();
    
    const { preset, availableModels } = body;
    
    if (!preset || !['optimal', 'economy', 'power'].includes(preset)) {
      return NextResponse.json(
        { error: 'Invalid preset type. Use: optimal, economy, or power' },
        { status: 400 }
      );
    }
    
    if (!availableModels || availableModels.length === 0) {
      return NextResponse.json(
        { error: 'availableModels array is required' },
        { status: 400 }
      );
    }
    
    const data = loadCapabilityData();
    
    // Filter by available models
    const modelsToUse = data.models.filter(m => 
      availableModels.includes(m.id) || 
      availableModels.some(avail => m.id.includes(avail))
    );
    
    if (modelsToUse.length === 0) {
      // If no exact matches, try partial matching
      const partialMatches = data.models.filter(m => 
        availableModels.some(avail => 
          m.name.toLowerCase().includes(avail.toLowerCase()) ||
          avail.toLowerCase().includes(m.name.toLowerCase())
        )
      );
      
      if (partialMatches.length === 0) {
        return NextResponse.json(
          { error: 'No matching models found in available list' },
          { status: 400 }
        );
      }
      
      modelsToUse.push(...partialMatches);
    }
    
    // Generate preset recommendations
    const defaultResult = findBestForIntent(modelsToUse, 'default', preset);
    const codingResult = findBestForIntent(modelsToUse, 'coding', preset);
    const reasoningResult = findBestForIntent(modelsToUse, 'reasoning', preset);
    const creativeResult = findBestForIntent(modelsToUse, 'creative', preset);
    const mathResult = findBestForIntent(modelsToUse, 'math', preset);
    const translationResult = findBestForIntent(modelsToUse, 'translation', preset);
    const chineseResult = findBestForIntent(modelsToUse, 'chinese', preset);
    const longContextResult = findBestForIntent(modelsToUse, 'longContext', preset);
    const cheapResult = findCheapestModel(modelsToUse);
    
    const response: PresetResponse = {
      preset,
      models: {
        default: defaultResult.model.id,
        coding: codingResult.model.id,
        reasoning: reasoningResult.model.id,
        creative: creativeResult.model.id,
        cheap: cheapResult.model.id,
        math: mathResult.model.id,
        translation: translationResult.model.id,
        chinese: chineseResult.model.id,
        longContext: longContextResult.model.id,
      },
      reasons: {
        default: defaultResult.reason,
        coding: codingResult.reason,
        reasoning: reasoningResult.reason,
        creative: creativeResult.reason,
        cheap: cheapResult.reason,
        math: mathResult.reason,
        translation: translationResult.reason,
        chinese: chineseResult.reason,
        longContext: longContextResult.reason,
      },
      costs: {
        default: defaultResult.model.cost,
        coding: codingResult.model.cost,
        reasoning: reasoningResult.model.cost,
        creative: creativeResult.model.cost,
        cheap: cheapResult.model.cost,
        math: mathResult.model.cost,
        translation: translationResult.model.cost,
        chinese: chineseResult.model.cost,
        longContext: longContextResult.model.cost,
      },
    };
    
    return NextResponse.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Preset API error:', error);
    return NextResponse.json(
      { error: 'Failed to apply preset' },
      { status: 500 }
    );
  }
}