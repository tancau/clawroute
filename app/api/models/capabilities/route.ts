/**
 * Model Capability Matrix with User Feedback API
 * 
 * GET: Get models with merged user feedback data
 * POST: Trigger recalculation of merged scores
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureAllFeedbackTables } from '@/lib/db/feedback-tables';
import modelCapabilitiesData from '@/data/model-capabilities.json';
import type { ModelCapability } from '@/lib/models/capability-matrix';
import { mergeScores, type UserFeedback } from '@/lib/models/merge-feedback';

// ===== Types =====

interface ModelWithFeedback extends ModelCapability {
  userFeedbackStats?: {
    totalFeedbacks: number;
    verifiedFeedbacks: number;
    avgScores: Record<string, number>;
  };
  mergedScores?: {
    overallScore: number;
    valueScore: number;
    confidence: number;
    sources: string[];
  };
}

// ===== GET: Get Models with Feedback =====

export async function GET(request: NextRequest) {
  try {
    await ensureAllFeedbackTables();
    
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const includeMerged = searchParams.get('merged') === 'true';
    
    // Get models from static data
    const models = modelCapabilitiesData.models as ModelCapability[];
    
    if (modelId) {
      // Get single model
      const model = models.find(m => m.id === modelId);
      if (!model) {
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        );
      }
      
      // Get feedbacks for this model
      const feedbacks = await getModelFeedbacks(modelId);
      
      const result: ModelWithFeedback = { ...model };
      
      if (feedbacks.length > 0) {
        result.userFeedbackStats = {
          totalFeedbacks: feedbacks.length,
          verifiedFeedbacks: feedbacks.filter(f => f.verified).length,
          avgScores: calculateAvgScores(feedbacks),
        };
      }
      
      if (includeMerged) {
        const merged = mergeScores(model, feedbacks);
        result.mergedScores = {
          overallScore: merged.overallScore,
          valueScore: merged.valueScore,
          confidence: merged.confidence,
          sources: merged.sources,
        };
      }
      
      return NextResponse.json(result);
    }
    
    // Get all models with feedback summary
    const modelsWithFeedback: ModelWithFeedback[] = await Promise.all(
      models.map(async (model) => {
        const feedbacks = await getModelFeedbacks(model.id);
        const result: ModelWithFeedback = { ...model };
        
        if (feedbacks.length > 0) {
          result.userFeedbackStats = {
            totalFeedbacks: feedbacks.length,
            verifiedFeedbacks: feedbacks.filter(f => f.verified).length,
            avgScores: calculateAvgScores(feedbacks),
          };
        }
        
        if (includeMerged) {
          const merged = mergeScores(model, feedbacks);
          result.mergedScores = {
            overallScore: merged.overallScore,
            valueScore: merged.valueScore,
            confidence: merged.confidence,
            sources: merged.sources,
          };
        }
        
        return result;
      })
    );
    
    return NextResponse.json({
      models: modelsWithFeedback,
      lastUpdated: modelCapabilitiesData.lastUpdated,
      totalModels: models.length,
      modelsWithFeedback: modelsWithFeedback.filter(m => m.userFeedbackStats).length,
    });
    
  } catch (error) {
    console.error('Failed to get models with feedback:', error);
    return NextResponse.json(
      { error: 'Failed to get models' },
      { status: 500 }
    );
  }
}

// ===== Helper: Get Model Feedbacks =====

async function getModelFeedbacks(modelId: string): Promise<UserFeedback[]> {
  try {
    const result = await sql`
      SELECT 
        id, user_id, model_id,
        coding_score, reasoning_score, math_score, translation_score,
        creative_score, analysis_score, long_context_score, chinese_score,
        input_cost, output_cost,
        verified, upvotes, quality_score
      FROM model_feedback
      WHERE model_id = ${modelId}
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      modelId: row.model_id,
      userId: row.user_id,
      codingScore: row.coding_score ?? undefined,
      reasoningScore: row.reasoning_score ?? undefined,
      mathScore: row.math_score ?? undefined,
      translationScore: row.translation_score ?? undefined,
      creativeScore: row.creative_score ?? undefined,
      analysisScore: row.analysis_score ?? undefined,
      longContextScore: row.long_context_score ?? undefined,
      chineseScore: row.chinese_score ?? undefined,
      inputCost: row.input_cost ?? undefined,
      outputCost: row.output_cost ?? undefined,
      verified: row.verified ?? false,
      upvotes: row.upvotes ?? 0,
      qualityScore: row.quality_score ?? 5.0,
    }));
    
  } catch (error) {
    console.error('Failed to get model feedbacks:', error);
    return [];
  }
}

// ===== Helper: Calculate Average Scores =====

function calculateAvgScores(feedbacks: UserFeedback[]): Record<string, number> {
  const scoreKeys = [
    'coding', 'reasoning', 'math', 'translation',
    'creative', 'analysis', 'longContext', 'chinese'
  ] as const;
  
  const result: Record<string, number> = {};
  
  for (const key of scoreKeys) {
    const field = `${key}Score` as keyof UserFeedback;
    const values = feedbacks
      .map(f => f[field])
      .filter((v): v is number => v !== undefined);
    
    if (values.length > 0) {
      result[key] = Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
    }
  }
  
  return result;
}
