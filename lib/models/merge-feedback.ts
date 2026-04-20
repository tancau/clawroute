/**
 * Feedback Merge Logic
 * 
 * Merges benchmark and arena data for model scores
 * User feedback is for display only, NOT used in score calculation
 */

import type { ModelCapability, ModelCapabilityScores } from './capability-matrix';
import { calculateOverallScore, calculateValueScore } from './capability-matrix';

// ===== Types =====

export interface UserFeedback {
  id: string;
  modelId: string;
  userId: string;
  
  // Scores (1-10)
  codingScore?: number;
  reasoningScore?: number;
  mathScore?: number;
  translationScore?: number;
  creativeScore?: number;
  analysisScore?: number;
  longContextScore?: number;
  chineseScore?: number;
  
  // Pricing
  inputCost?: number;
  outputCost?: number;
  
  // Quality
  qualityScore: number;  // Feedback quality score
  verified: boolean;
  upvotes: number;
}

export interface WeightConfig {
  benchmarkWeight: number;
  arenaWeight: number;
  userFeedbackBaseWeight: number;
  userFeedbackMaxWeight: number;
  userFeedbackPerFeedback: number;
}

export interface MergedScores {
  capabilities: ModelCapabilityScores;
  cost: {
    input: number;
    output: number;
  };
  overallScore: number;
  valueScore: number;
  confidence: number;
  sources: string[];
}

// ===== Default Config =====

export const DEFAULT_WEIGHT_CONFIG: WeightConfig = {
  benchmarkWeight: 0.70,       // 70% weight for benchmarks
  arenaWeight: 0.30,           // 30% weight for Arena Elo
  userFeedbackBaseWeight: 0,   // 0% weight for user feedback (display only)
  userFeedbackMaxWeight: 0,    // 0% max weight
  userFeedbackPerFeedback: 0,  // no weight increase
};

// ===== Score Merging Functions =====

/**
 * Calculate user feedback weight based on feedback count and quality
 */
export function calculateUserFeedbackWeight(
  feedbacks: UserFeedback[],
  config: WeightConfig = DEFAULT_WEIGHT_CONFIG
): number {
  if (feedbacks.length === 0) {
    return config.userFeedbackBaseWeight;
  }
  
  // Weight increases with more feedbacks, up to max
  const countWeight = feedbacks.length * config.userFeedbackPerFeedback;
  
  // Quality multiplier (verified feedbacks count more)
  const verifiedCount = feedbacks.filter(f => f.verified).length;
  const qualityMultiplier = verifiedCount > 0 ? 1.2 : 1.0;
  
  // Upvote bonus (popular feedbacks get more weight)
  const totalUpvotes = feedbacks.reduce((sum, f) => sum + f.upvotes, 0);
  const upvoteBonus = Math.min(totalUpvotes * 0.01, 0.05);
  
  const finalWeight = (config.userFeedbackBaseWeight + countWeight + upvoteBonus) * qualityMultiplier;
  
  return Math.min(finalWeight, config.userFeedbackMaxWeight);
}

/**
 * Merge benchmark and arena scores
 * User feedback is tracked but NOT used in score calculation
 */
export function mergeScores(
  model: ModelCapability,
  feedbacks: UserFeedback[],
  config: WeightConfig = DEFAULT_WEIGHT_CONFIG
): MergedScores {
  // Normalize weights (user feedback weight is 0, for display only)
  const benchmarkWeight = config.benchmarkWeight;  // 70%
  const arenaWeight = config.arenaWeight;          // 30%
  const userWeight = 0;                             // 0% - display only
  
  const sources: string[] = ['Benchmarks (70%)', 'Arena Elo (30%)'];
  if (feedbacks.length > 0) {
    sources.push(`User Reviews (${feedbacks.length}) - reference only`);
  }
  
  // Merge capability scores (benchmark + arena only)
  const capabilities = mergeCapabilityScores(
    model,
    feedbacks,
    benchmarkWeight,
    arenaWeight,
    userWeight
  );
  
  // Merge pricing
  const cost = mergePricing(model, feedbacks);
  
  // Calculate scores
  const overallScore = calculateOverallScore(capabilities);
  const valueScore = calculateValueScore(overallScore, cost);
  
  // Calculate confidence
  const confidence = calculateConfidence(model, feedbacks);
  
  return {
    capabilities,
    cost,
    overallScore,
    valueScore,
    confidence,
    sources,
  };
}

/**
 * Merge individual capability scores
 */
function mergeCapabilityScores(
  model: ModelCapability,
  feedbacks: UserFeedback[],
  benchmarkWeight: number,
  arenaWeight: number,
  userWeight: number
): ModelCapabilityScores {
  const keys: (keyof ModelCapabilityScores)[] = [
    'coding', 'reasoning', 'math', 'translation', 
    'creative', 'analysis', 'longContext', 'chinese'
  ];
  
  const result: ModelCapabilityScores = {
    coding: 5,
    reasoning: 5,
    math: 5,
    translation: 5,
    creative: 5,
    analysis: 5,
    longContext: 5,
    chinese: 5,
  };
  
  for (const key of keys) {
    // Get benchmark score (from model capabilities)
    const benchmarkScore = model.capabilities[key] ?? 5;
    
    // Get arena-derived score (use reasoning as proxy for overall quality)
    const arenaScore = model.arenaElo 
      ? Math.min(10, Math.max(0, (model.arenaElo - 1000) / 30))
      : benchmarkScore;
    
    // Get user feedback scores
    const userScores = feedbacks
      .map(f => getFeedbackScore(f, key))
      .filter((s): s is number => s !== undefined);
    
    const avgUserScore = userScores.length > 0
      ? userScores.reduce((sum, s) => sum + s, 0) / userScores.length
      : benchmarkScore;
    
    // Weighted average
    result[key] = Math.round(
      benchmarkScore * benchmarkWeight +
      arenaScore * arenaWeight +
      avgUserScore * userWeight
    );
  }
  
  return result;
}

/**
 * Get feedback score for a capability
 */
function getFeedbackScore(feedback: UserFeedback, key: keyof ModelCapabilityScores): number | undefined {
  const mapping: Record<keyof ModelCapabilityScores, keyof UserFeedback> = {
    coding: 'codingScore',
    reasoning: 'reasoningScore',
    math: 'mathScore',
    translation: 'translationScore',
    creative: 'creativeScore',
    analysis: 'analysisScore',
    longContext: 'longContextScore',
    chinese: 'chineseScore',
  };
  
  return feedback[mapping[key] as keyof UserFeedback] as number | undefined;
}

/**
 * Merge pricing information
 */
function mergePricing(
  model: ModelCapability,
  feedbacks: UserFeedback[]
): { input: number; output: number } {
  // Start with model's pricing
  let inputCost = model.cost?.input ?? 0;
  let outputCost = model.cost?.output ?? 0;
  
  // If model has no pricing, use user-reported pricing
  if (inputCost === 0 && outputCost === 0 && feedbacks.length > 0) {
    const inputCosts = feedbacks
      .map(f => f.inputCost)
      .filter((c): c is number => c !== undefined && c > 0);
    
    const outputCosts = feedbacks
      .map(f => f.outputCost)
      .filter((c): c is number => c !== undefined && c > 0);
    
    if (inputCosts.length > 0) {
      inputCost = inputCosts.reduce((sum, c) => sum + c, 0) / inputCosts.length;
    }
    
    if (outputCosts.length > 0) {
      outputCost = outputCosts.reduce((sum, c) => sum + c, 0) / outputCosts.length;
    }
  }
  
  return {
    input: Math.round(inputCost * 10000) / 10000,
    output: Math.round(outputCost * 10000) / 10000,
  };
}

/**
 * Calculate confidence score
 */
function calculateConfidence(model: ModelCapability, feedbacks: UserFeedback[]): number {
  let confidence = 0.5; // Base confidence
  
  // Bonus for benchmarks
  if (model.benchmarks?.humanEval) confidence += 0.1;
  if (model.benchmarks?.mmlu) confidence += 0.1;
  if (model.benchmarks?.gsm8k) confidence += 0.05;
  if (model.benchmarks?.mtBench) confidence += 0.05;
  
  // Bonus for Arena Elo
  if (model.arenaElo) confidence += 0.1;
  
  // Bonus for user feedbacks
  confidence += Math.min(feedbacks.length * 0.05, 0.2);
  
  // Bonus for verified feedbacks
  const verifiedCount = feedbacks.filter(f => f.verified).length;
  confidence += Math.min(verifiedCount * 0.05, 0.1);
  
  return Math.min(1, Math.round(confidence * 100) / 100);
}

/**
 * Aggregate multiple user feedbacks into summary
 */
// ===== User Review Statistics Types =====

export interface UserReviewStats {
  modelId: string;
  totalReviews: number;
  verifiedReviews: number;
  avgOverallScore: number;
  scoreBreakdown: {
    coding: number;
    reasoning: number;
    math: number;
    translation: number;
    creative: number;
    analysis: number;
    longContext: number;
    chinese: number;
  };
  totalUpvotes: number;
  recentReviews: number; // Reviews in last 30 days
}

export interface UserChoiceRanking {
  modelId: string;
  modelName: string;
  provider: string;
  selectionCount: number;
  uniqueUsers: number;
  avgUserRating: number;
  trend: 'rising' | 'stable' | 'declining';
  rank: number;
}

export interface ModelRankings {
  objectiveRanking: {
    modelId: string;
    modelName: string;
    provider: string;
    overallScore: number;
    valueScore: number;
    rank: number;
  }[];
  userChoiceRanking: UserChoiceRanking[];
  userReviewRanking: {
    modelId: string;
    modelName: string;
    provider: string;
    avgUserScore: number;
    totalReviews: number;
    rank: number;
  }[];
}

/**
 * Calculate user review statistics for display
 */
export function calculateUserReviewStats(
  modelId: string,
  feedbacks: UserFeedback[]
): UserReviewStats {
  const recentReviews = feedbacks.length; // Simplified for now
  
  const avgScores = aggregateUserFeedbacks(feedbacks);
  
  // Calculate overall average
  const scoreValues = Object.values(avgScores.avgScores).filter((v): v is number => v !== undefined);
  const avgOverallScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length * 10) / 10
    : 0;
  
  return {
    modelId,
    totalReviews: feedbacks.length,
    verifiedReviews: feedbacks.filter(f => f.verified).length,
    avgOverallScore,
    scoreBreakdown: {
      coding: avgScores.avgScores.coding ?? 0,
      reasoning: avgScores.avgScores.reasoning ?? 0,
      math: avgScores.avgScores.math ?? 0,
      translation: avgScores.avgScores.translation ?? 0,
      creative: avgScores.avgScores.creative ?? 0,
      analysis: avgScores.avgScores.analysis ?? 0,
      longContext: avgScores.avgScores.longContext ?? 0,
      chinese: avgScores.avgScores.chinese ?? 0,
    },
    totalUpvotes: avgScores.totalUpvotes,
    recentReviews,
  };
}

/**
 * Aggregate multiple user feedbacks into summary
 */
export function aggregateUserFeedbacks(feedbacks: UserFeedback[]): {
  avgScores: Partial<ModelCapabilityScores>;
  avgInputCost: number | null;
  avgOutputCost: number | null;
  totalUpvotes: number;
  verifiedCount: number;
} {
  if (feedbacks.length === 0) {
    return {
      avgScores: {},
      avgInputCost: null,
      avgOutputCost: null,
      totalUpvotes: 0,
      verifiedCount: 0,
    };
  }
  
  const keys: (keyof ModelCapabilityScores)[] = [
    'coding', 'reasoning', 'math', 'translation',
    'creative', 'analysis', 'longContext', 'chinese'
  ];
  
  const avgScores: Partial<ModelCapabilityScores> = {};
  
  for (const key of keys) {
    const scores = feedbacks
      .map(f => getFeedbackScore(f, key))
      .filter((s): s is number => s !== undefined);
    
    if (scores.length > 0) {
      avgScores[key] = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length * 10) / 10;
    }
  }
  
  const inputCosts = feedbacks
    .map(f => f.inputCost)
    .filter((c): c is number => c !== undefined && c > 0);
  
  const outputCosts = feedbacks
    .map(f => f.outputCost)
    .filter((c): c is number => c !== undefined && c > 0);
  
  return {
    avgScores,
    avgInputCost: inputCosts.length > 0 
      ? Math.round(inputCosts.reduce((sum, c) => sum + c, 0) / inputCosts.length * 10000) / 10000
      : null,
    avgOutputCost: outputCosts.length > 0
      ? Math.round(outputCosts.reduce((sum, c) => sum + c, 0) / outputCosts.length * 10000) / 10000
      : null,
    totalUpvotes: feedbacks.reduce((sum, f) => sum + f.upvotes, 0),
    verifiedCount: feedbacks.filter(f => f.verified).length,
  };
}
