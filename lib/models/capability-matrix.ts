/**
 * HopLLM Model Capability Matrix
 * 
 * Comprehensive model capability scoring system based on:
 * - Public benchmarks (HumanEval, MMLU, GSM8K, MT-Bench)
 * - Chatbot Arena Elo ratings
 * - User feedback and real-world performance
 */

// ===== Core Interfaces =====

export interface ModelCapabilityScores {
  /** Coding ability (HumanEval benchmark, 0-10) */
  coding: number;
  /** Reasoning ability (MMLU benchmark, 0-10) */
  reasoning: number;
  /** Mathematical ability (GSM8K benchmark, 0-10) */
  math: number;
  /** Translation ability (MT-Bench, 0-10) */
  translation: number;
  /** Creative writing ability (MT-Bench, 0-10) */
  creative: number;
  /** Analysis ability (MT-Bench, 0-10) */
  analysis: number;
  /** Long context handling (based on context window, 0-10) */
  longContext: number;
  /** Chinese language support (0-10) */
  chinese: number;
}

export interface ModelCost {
  /** Input cost in USD per 1M tokens */
  input: number;
  /** Output cost in USD per 1M tokens */
  output: number;
  /** Cache read cost in USD per 1M tokens (if supported) */
  cacheRead?: number;
  /** Cache write cost in USD per 1M tokens (if supported) */
  cacheWrite?: number;
}

export interface ModelBenchmark {
  /** HumanEval pass@1 score (0-100) */
  humanEval?: number;
  /** MMLU accuracy (0-100) */
  mmlu?: number;
  /** GSM8K accuracy (0-100) */
  gsm8k?: number;
  /** MT-Bench score (0-10) */
  mtBench?: number;
  /** Chatbot Arena Elo rating */
  arenaElo?: number;
}

export interface ModelCapability {
  /** Model ID in provider/model format */
  id: string;
  /** Provider name */
  provider: string;
  /** Display name */
  name: string;
  /** Model description */
  description?: string;
  
  /** Capability scores (0-10 for each dimension) */
  capabilities: ModelCapabilityScores;
  
  /** Raw benchmark scores */
  benchmarks?: ModelBenchmark;
  
  /** Chatbot Arena Elo rating */
  arenaElo?: number;
  
  /** Pricing information */
  cost: ModelCost;
  
  /** Context window size in tokens */
  contextWindow: number;
  
  /** Maximum output tokens */
  maxTokens: number;
  
  /** Supported input types */
  inputTypes: ('text' | 'image' | 'audio' | 'video')[];
  
  /** Model tags for categorization */
  tags: string[];
  
  /** Overall score (calculated from capabilities) */
  overallScore?: number;
  
  /** Value score (quality / cost ratio) */
  valueScore?: number;
  
  /** Last updated timestamp */
  updatedAt: string;
  
  /** Data sources used */
  dataSource: string[];
  
  /** Is this model free to use? */
  isFree?: boolean;
  
  /** Is this model available? */
  isAvailable?: boolean;
}

// ===== Aggregated Types =====

export interface CapabilityMatrixData {
  models: ModelCapability[];
  lastUpdated: string;
  version: string;
  dataSource: string[];
}

// ===== Recommendation Types =====

export type RecommendationIntent = 
  | 'coding' 
  | 'reasoning' 
  | 'math' 
  | 'translation' 
  | 'creative' 
  | 'analysis' 
  | 'longContext' 
  | 'chinese'
  | 'general'
  | 'fast'
  | 'cheap';

export type BudgetLevel = 'free' | 'low' | 'medium' | 'high';

export interface RecommendationRequest {
  /** Primary intent/use case */
  intent: RecommendationIntent;
  /** Budget preference */
  budget?: BudgetLevel;
  /** Minimum quality threshold (0-10) */
  minQuality?: number;
  /** Maximum cost per 1M tokens (input + output) */
  maxCost?: number;
  /** Minimum context window required */
  minContextWindow?: number;
  /** Required input types */
  requiredInputs?: ('text' | 'image' | 'audio' | 'video')[];
  /** Maximum number of recommendations */
  limit?: number;
  /** Provider filter */
  providers?: string[];
}

export interface RecommendedModel extends ModelCapability {
  /** Recommendation score (0-100) */
  recommendationScore: number;
  /** Why this model was recommended */
  recommendationReason: string;
}

// ===== Scoring Functions =====

/**
 * Calculate overall score from capabilities
 * Weighted average based on importance
 */
export function calculateOverallScore(capabilities: ModelCapabilityScores): number {
  const weights = {
    coding: 0.15,
    reasoning: 0.20,
    math: 0.10,
    translation: 0.10,
    creative: 0.10,
    analysis: 0.15,
    longContext: 0.10,
    chinese: 0.10,
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const [key, weight] of Object.entries(weights)) {
    const score = capabilities[key as keyof ModelCapabilityScores];
    if (score !== undefined && score !== null) {
      totalScore += score * weight;
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? Math.round(totalScore / totalWeight * 10) / 10 : 0;
}

/**
 * Calculate value score (quality per dollar)
 * Higher is better
 */
export function calculateValueScore(overallScore: number, cost: ModelCost): number {
  const totalCost = cost.input + cost.output;
  if (totalCost === 0) {
    // Free models get a high value score
    return overallScore * 10;
  }
  // Score per dollar (inverted, so cheaper = higher score)
  // Using log scale to handle large cost differences
  const costLog = Math.log10(totalCost + 1);
  return Math.round((overallScore / (costLog + 1)) * 100) / 100;
}

/**
 * Map benchmark scores to capability scores (0-10)
 */
export function mapBenchmarkToCapability(
  benchmark: ModelBenchmark
): Partial<ModelCapabilityScores> {
  const capabilities: Partial<ModelCapabilityScores> = {};
  
  // HumanEval: 0-100 -> 0-10
  if (benchmark.humanEval !== undefined) {
    capabilities.coding = Math.round(benchmark.humanEval / 10);
  }
  
  // MMLU: 0-100 -> 0-10
  if (benchmark.mmlu !== undefined) {
    capabilities.reasoning = Math.round(benchmark.mmlu / 10);
  }
  
  // GSM8K: 0-100 -> 0-10
  if (benchmark.gsm8k !== undefined) {
    capabilities.math = Math.round(benchmark.gsm8k / 10);
  }
  
  // MT-Bench: already 0-10 scale
  if (benchmark.mtBench !== undefined) {
    // Average for translation, creative, analysis
    const avgMtBench = benchmark.mtBench;
    capabilities.translation = Math.round(avgMtBench);
    capabilities.creative = Math.round(avgMtBench);
    capabilities.analysis = Math.round(avgMtBench);
  }
  
  // Arena Elo: typically 1000-1300 range
  if (benchmark.arenaElo !== undefined) {
    // Normalize Elo to 0-10 scale
    // Elo of 1000 -> 0, Elo of 1300 -> 10
    const normalizedElo = (benchmark.arenaElo - 1000) / 30;
    capabilities.reasoning = Math.max(0, Math.min(10, Math.round(normalizedElo)));
  }
  
  return capabilities;
}

/**
 * Calculate long context score based on context window
 */
export function calculateLongContextScore(contextWindow: number): number {
  // Context windows range from 4K to 2M+
  // 4K -> 0, 32K -> 3, 128K -> 6, 1M+ -> 10
  if (contextWindow >= 1000000) return 10;
  if (contextWindow >= 200000) return 8;
  if (contextWindow >= 128000) return 7;
  if (contextWindow >= 64000) return 5;
  if (contextWindow >= 32000) return 4;
  if (contextWindow >= 16000) return 2;
  if (contextWindow >= 8000) return 1;
  return 0;
}

/**
 * Get budget limits in USD per 1M tokens
 */
export function getBudgetLimits(budget: BudgetLevel): { maxInput: number; maxOutput: number } {
  switch (budget) {
    case 'free':
      return { maxInput: 0, maxOutput: 0 };
    case 'low':
      return { maxInput: 0.5, maxOutput: 1.5 };
    case 'medium':
      return { maxInput: 3, maxOutput: 10 };
    case 'high':
      return { maxInput: 20, maxOutput: 60 };
    default:
      return { maxInput: Infinity, maxOutput: Infinity };
  }
}

// ===== Export Constants =====

export const INTENT_CAPABILITY_MAP: Record<RecommendationIntent, (keyof ModelCapabilityScores)[]> = {
  coding: ['coding', 'reasoning'],
  reasoning: ['reasoning', 'analysis'],
  math: ['math', 'reasoning'],
  translation: ['translation', 'chinese'],
  creative: ['creative'],
  analysis: ['analysis', 'reasoning'],
  longContext: ['longContext'],
  chinese: ['chinese', 'translation'],
  general: ['reasoning', 'analysis', 'coding'],
  fast: [], // Speed-based, not capability-based
  cheap: [], // Cost-based, not capability-based
};

export const DEFAULT_CAPABILITY_SCORES: ModelCapabilityScores = {
  coding: 5,
  reasoning: 5,
  math: 5,
  translation: 5,
  creative: 5,
  analysis: 5,
  longContext: 5,
  chinese: 5,
};
