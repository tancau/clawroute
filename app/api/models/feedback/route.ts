/**
 * Model Feedback API
 * 
 * POST: Submit user feedback for a model
 * GET: Get feedback statistics for a model
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureAllFeedbackTables } from '@/lib/db/feedback-tables';

// Generate unique ID
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

// ===== Types =====

interface FeedbackSubmission {
  modelId: string;
  userId: string;
  
  // Scores (1-10)
  scores?: {
    coding?: number;
    reasoning?: number;
    math?: number;
    translation?: number;
    creative?: number;
    analysis?: number;
    longContext?: number;
    chinese?: number;
  };
  
  // Pricing
  costs?: {
    input?: number;
    output?: number;
  };
  
  // Comment
  comment?: string;
}

interface FeedbackStats {
  modelId: string;
  totalFeedbacks: number;
  verifiedFeedbacks: number;
  avgScores: {
    coding?: number;
    reasoning?: number;
    math?: number;
    translation?: number;
    creative?: number;
    analysis?: number;
    longContext?: number;
    chinese?: number;
  };
  avgCosts: {
    input?: number;
    output?: number;
  };
}

// ===== POST: Submit Feedback =====

export async function POST(request: NextRequest) {
  try {
    await ensureAllFeedbackTables();
    
    const body: FeedbackSubmission = await request.json();
    
    // Validate
    if (!body.modelId || !body.userId) {
      return NextResponse.json(
        { error: 'modelId and userId are required' },
        { status: 400 }
      );
    }
    
    // Validate scores
    if (body.scores) {
      for (const [key, value] of Object.entries(body.scores)) {
        if (value !== undefined && (value < 1 || value > 10)) {
          return NextResponse.json(
            { error: `Score ${key} must be between 1 and 10` },
            { status: 400 }
          );
        }
      }
    }
    
    // Validate costs
    if (body.costs) {
      if (body.costs.input !== undefined && body.costs.input < 0) {
        return NextResponse.json(
          { error: 'Input cost cannot be negative' },
          { status: 400 }
        );
      }
      if (body.costs.output !== undefined && body.costs.output < 0) {
        return NextResponse.json(
          { error: 'Output cost cannot be negative' },
          { status: 400 }
        );
      }
    }
    
    const id = generateId();
    const now = Date.now();
    
    // Check if user already submitted feedback for this model
    const existing = await sql`
      SELECT id FROM model_feedback 
      WHERE user_id = ${body.userId} AND model_id = ${body.modelId}
      LIMIT 1
    `;
    
    if (existing.rows.length > 0) {
      const existingId = existing.rows[0]?.id;
      if (!existingId) {
        throw new Error('Failed to get existing feedback ID');
      }
      
      // Update existing feedback
      await sql`
        UPDATE model_feedback SET
          coding_score = ${body.scores?.coding ?? null},
          reasoning_score = ${body.scores?.reasoning ?? null},
          math_score = ${body.scores?.math ?? null},
          translation_score = ${body.scores?.translation ?? null},
          creative_score = ${body.scores?.creative ?? null},
          analysis_score = ${body.scores?.analysis ?? null},
          long_context_score = ${body.scores?.longContext ?? null},
          chinese_score = ${body.scores?.chinese ?? null},
          input_cost = ${body.costs?.input ?? null},
          output_cost = ${body.costs?.output ?? null},
          comment = ${body.comment ?? null},
          created_at = ${now}
        WHERE id = ${existingId}
      `;
      
      return NextResponse.json({
        success: true,
        message: 'Feedback updated successfully',
        feedbackId: existingId,
      });
    }
    
    // Insert new feedback
    await sql`
      INSERT INTO model_feedback (
        id, user_id, model_id,
        coding_score, reasoning_score, math_score, translation_score,
        creative_score, analysis_score, long_context_score, chinese_score,
        input_cost, output_cost, comment,
        created_at
      ) VALUES (
        ${id}, ${body.userId}, ${body.modelId},
        ${body.scores?.coding ?? null},
        ${body.scores?.reasoning ?? null},
        ${body.scores?.math ?? null},
        ${body.scores?.translation ?? null},
        ${body.scores?.creative ?? null},
        ${body.scores?.analysis ?? null},
        ${body.scores?.longContext ?? null},
        ${body.scores?.chinese ?? null},
        ${body.costs?.input ?? null},
        ${body.costs?.output ?? null},
        ${body.comment ?? null},
        ${now}
      )
    `;
    
    // Update user reputation
    await updateUserReputation(body.userId);
    
    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: id,
    });
    
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

// ===== GET: Get Feedback Stats =====

export async function GET(request: NextRequest) {
  try {
    await ensureAllFeedbackTables();
    
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId is required' },
        { status: 400 }
      );
    }
    
    // Get all feedbacks for this model
    const result = await sql`
      SELECT 
        coding_score, reasoning_score, math_score, translation_score,
        creative_score, analysis_score, long_context_score, chinese_score,
        input_cost, output_cost,
        verified, upvotes
      FROM model_feedback
      WHERE model_id = ${modelId}
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        modelId,
        totalFeedbacks: 0,
        verifiedFeedbacks: 0,
        avgScores: {},
        avgCosts: {},
      } as FeedbackStats);
    }
    
    // Calculate averages
    const rows = result.rows;
    const avgScores: FeedbackStats['avgScores'] = {};
    const avgCosts: FeedbackStats['avgCosts'] = {};
    
    const scoreFields = [
      'coding_score', 'reasoning_score', 'math_score', 'translation_score',
      'creative_score', 'analysis_score', 'long_context_score', 'chinese_score'
    ] as const;
    
    for (const field of scoreFields) {
      const values = rows
        .map(r => r[field])
        .filter((v): v is number => v !== null);
      
      if (values.length > 0) {
        const key = field.replace('_score', '') as keyof typeof avgScores;
        avgScores[key] = Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
      }
    }
    
    // Calculate cost averages
    const inputCosts = rows
      .map(r => r.input_cost)
      .filter((v): v is number => v !== null);
    
    const outputCosts = rows
      .map(r => r.output_cost)
      .filter((v): v is number => v !== null);
    
    if (inputCosts.length > 0) {
      avgCosts.input = Math.round(inputCosts.reduce((a, b) => a + b, 0) / inputCosts.length * 10000) / 10000;
    }
    
    if (outputCosts.length > 0) {
      avgCosts.output = Math.round(outputCosts.reduce((a, b) => a + b, 0) / outputCosts.length * 10000) / 10000;
    }
    
    const stats: FeedbackStats = {
      modelId,
      totalFeedbacks: rows.length,
      verifiedFeedbacks: rows.filter(r => r.verified).length,
      avgScores,
      avgCosts,
    };
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Failed to get feedback stats:', error);
    return NextResponse.json(
      { error: 'Failed to get feedback stats' },
      { status: 500 }
    );
  }
}

// ===== Helper: Update User Reputation =====

async function updateUserReputation(userId: string) {
  try {
    // Get user's feedback stats
    const feedbackStats = await sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN verified THEN 1 ELSE 0 END) as verified,
        SUM(upvotes) as total_upvotes
      FROM model_feedback
      WHERE user_id = ${userId}
    `;
    
    if (feedbackStats.rows.length === 0) return;
    
    const stats = feedbackStats.rows[0];
    if (!stats) return;
    
    const total = parseInt(stats.total as string) || 0;
    const verified = parseInt(stats.verified as string) || 0;
    const totalUpvotes = parseInt(stats.total_upvotes as string) || 0;
    
    // Calculate reputation score
    // Base: 1 point per feedback, 2 points per verified, 0.5 per upvote
    const reputationScore = Math.min(10, total + verified + totalUpvotes * 0.5);
    
    const now = Date.now();
    
    // Upsert user reputation
    await sql`
      INSERT INTO user_reputation (user_id, total_feedbacks, verified_feedbacks, total_upvotes, reputation_score, created_at, updated_at)
      VALUES (${userId}, ${total}, ${verified}, ${totalUpvotes}, ${reputationScore}, ${now}, ${now})
      ON CONFLICT (user_id)
      DO UPDATE SET
        total_feedbacks = ${total},
        verified_feedbacks = ${verified},
        total_upvotes = ${totalUpvotes},
        reputation_score = ${reputationScore},
        updated_at = ${now}
    `;
    
  } catch (error) {
    console.error('Failed to update user reputation:', error);
  }
}
