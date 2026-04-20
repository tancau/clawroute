/**
 * Data Quality Check for Model Capabilities
 * 
 * Analyzes model data completeness and quality
 */

import type { ModelCapability } from '../models/capability-matrix';

// ===== Types =====

export interface DataQualityCheck {
  modelId: string;
  modelName: string;
  missingFields: string[];
  confidence: number;  // 0-1, data confidence score
  needsUserInput: boolean;
  warnings: string[];
}

export interface QualityReport {
  totalModels: number;
  highQualityCount: number;  // confidence >= 0.8
  mediumQualityCount: number; // confidence 0.5-0.8
  lowQualityCount: number;   // confidence < 0.5
  modelsNeedingInput: DataQualityCheck[];
}

// ===== Quality Check Functions =====

/**
 * Check data quality for a single model
 */
export function checkDataQuality(model: ModelCapability): DataQualityCheck {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  
  // Check benchmark data
  if (!model.benchmarks?.humanEval) {
    missingFields.push('coding_benchmark');
  }
  if (!model.benchmarks?.mmlu) {
    missingFields.push('reasoning_benchmark');
  }
  if (!model.benchmarks?.gsm8k) {
    missingFields.push('math_benchmark');
  }
  if (!model.benchmarks?.mtBench) {
    missingFields.push('mt_bench');
  }
  
  // Check Arena Elo
  if (!model.arenaElo) {
    missingFields.push('arena_elo');
    warnings.push('Missing Arena Elo rating - real-world performance unknown');
  }
  
  // Check pricing
  if (!model.cost?.input && model.cost?.input !== 0) {
    missingFields.push('input_price');
    warnings.push('Missing input pricing - cannot calculate value score');
  }
  if (!model.cost?.output && model.cost?.output !== 0) {
    missingFields.push('output_price');
    warnings.push('Missing output pricing - cannot calculate value score');
  }
  
  // Check context window
  if (!model.contextWindow) {
    missingFields.push('context_window');
    warnings.push('Missing context window size');
  }
  
  // Check capabilities completeness
  const capabilityKeys = ['coding', 'reasoning', 'math', 'translation', 'creative', 'analysis', 'longContext', 'chinese'] as const;
  const missingCapabilities = capabilityKeys.filter(key => {
    const score = model.capabilities[key];
    return score === undefined || score === null || score === 5; // 5 is default/unknown
  });
  
  if (missingCapabilities.length > 4) {
    warnings.push(`${missingCapabilities.length} capability scores are default/unknown`);
  }
  
  // Calculate confidence score
  // Total fields: 8 benchmarks + 2 pricing + 1 context + 8 capabilities = 19
  const totalFields = 19;
  const missingCount = missingFields.length + Math.floor(missingCapabilities.length / 2);
  const confidence = Math.max(0, 1 - missingCount / totalFields);
  
  return {
    modelId: model.id,
    modelName: model.name,
    missingFields,
    confidence: Math.round(confidence * 100) / 100,
    needsUserInput: confidence < 0.7,
    warnings,
  };
}

/**
 * Generate quality report for all models
 */
export function generateQualityReport(models: ModelCapability[]): QualityReport {
  const checks = models.map(checkDataQuality);
  
  const highQualityCount = checks.filter(c => c.confidence >= 0.8).length;
  const mediumQualityCount = checks.filter(c => c.confidence >= 0.5 && c.confidence < 0.8).length;
  const lowQualityCount = checks.filter(c => c.confidence < 0.5).length;
  const modelsNeedingInput = checks.filter(c => c.needsUserInput);
  
  return {
    totalModels: models.length,
    highQualityCount,
    mediumQualityCount,
    lowQualityCount,
    modelsNeedingInput,
  };
}

/**
 * Get fields that user can contribute
 */
export function getContributableFields(model: ModelCapability): string[] {
  const fields: string[] = [];
  
  if (!model.benchmarks?.humanEval) fields.push('humanEval');
  if (!model.benchmarks?.mmlu) fields.push('mmlu');
  if (!model.benchmarks?.gsm8k) fields.push('gsm8k');
  if (!model.benchmarks?.mtBench) fields.push('mtBench');
  if (!model.arenaElo) fields.push('arenaElo');
  if (!model.cost?.input && model.cost?.input !== 0) fields.push('inputCost');
  if (!model.cost?.output && model.cost?.output !== 0) fields.push('outputCost');
  if (!model.contextWindow) fields.push('contextWindow');
  
  return fields;
}

/**
 * Field display names
 */
export const FIELD_LABELS: Record<string, string> = {
  humanEval: 'HumanEval Score (Coding)',
  mmlu: 'MMLU Score (Reasoning)',
  gsm8K: 'GSM8K Score (Math)',
  mtBench: 'MT-Bench Score',
  arenaElo: 'Chatbot Arena Elo',
  inputCost: 'Input Cost ($/1M tokens)',
  outputCost: 'Output Cost ($/1M tokens)',
  contextWindow: 'Context Window (tokens)',
  coding_score: 'Coding Ability (1-10)',
  reasoning_score: 'Reasoning Ability (1-10)',
  math_score: 'Math Ability (1-10)',
  translation_score: 'Translation Ability (1-10)',
  creative_score: 'Creative Writing (1-10)',
  analysis_score: 'Analysis Ability (1-10)',
  long_context_score: 'Long Context Handling (1-10)',
  chinese_score: 'Chinese Language Support (1-10)',
};
