#!/usr/bin/env node
/**
 * HopLLM Model Capability Matrix Updater
 * 
 * Fetches benchmark data from:
 * - Hugging Face OpenLLM Leaderboard
 * - Chatbot Arena
 * - Provider announcements
 * 
 * Usage: npx ts-node scripts/update-model-matrix.ts [--dry-run] [--verbose]
 */

import * as fs from 'fs';
import * as path from 'path';

// ===== Types =====
interface OpenLLMLeaderboardEntry {
  model: string;
  average: number;
  arc: number;
  hellaswag: number;
  mmlu: number;
  truthfulqa: number;
  winogrande: number;
  gsm8k: number;
}

interface ChatbotArenaEntry {
  model: string;
  elo: number;
  votes: number;
  organization: string;
}

interface ProviderPricing {
  [modelId: string]: {
    input: number;
    output: number;
    contextWindow: number;
    maxTokens: number;
  };
}

// ===== Configuration =====
const DATA_DIR = path.join(__dirname, '..', 'data');
const CAPABILITY_FILE = path.join(DATA_DIR, 'model-capabilities.json');
const MODELS_FILE = path.join(DATA_DIR, 'models.json');

const HF_OPENLLM_API = 'https://huggingface.co/api/open-llm-leaderboard/v1';
const CHATBOT_ARENA_API = 'https://huggingface.co/api/spaces/lmsys/chatbot-arena-leaderboard';

// ===== API Fetchers =====

/**
 * Fetch data from Hugging Face OpenLLM Leaderboard
 * Note: This is a placeholder. Real implementation may need adjustment
 * based on actual API availability.
 */
async function fetchOpenLLMData(): Promise<OpenLLMLeaderboardEntry[]> {
  console.log('📊 Fetching OpenLLM Leaderboard data...');
  
  try {
    const response = await fetch(HF_OPENLLM_API);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️  Could not fetch OpenLLM data:', error);
    console.warn('   Using cached/existing data instead.');
    return [];
  }
}

/**
 * Fetch Chatbot Arena Elo ratings
 * Note: Real implementation may need to scrape or use alternate API
 */
async function fetchArenaData(): Promise<ChatbotArenaEntry[]> {
  console.log('🏆 Fetching Chatbot Arena data...');
  
  try {
    // Try the HF spaces API
    const response = await fetch(CHATBOT_ARENA_API);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️  Could not fetch Arena data:', error);
    console.warn('   Using cached/existing data instead.');
    return [];
  }
}

/**
 * Fetch pricing from various provider APIs
 * This is a placeholder for real implementation
 */
async function fetchProviderPricing(): Promise<ProviderPricing> {
  console.log('💰 Fetching provider pricing...');
  
  // In a real implementation, this would:
  // 1. Fetch from OpenAI's pricing page or API
  // 2. Fetch from Anthropic's pricing page
  // 3. Fetch from other providers
  
  // For now, return empty object (use existing data)
  return {};
}

// ===== Data Processing =====

/**
 * Map model name from leaderboard to internal ID format
 */
function normalizeModelId(name: string): string {
  const mapping: Record<string, string> = {
    'gpt-4o': 'openai/gpt-4o',
    'gpt-4-turbo': 'openai/gpt-4-turbo',
    'gpt-4o-mini': 'openai/gpt-4o-mini',
    'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
    'claude-3.5-haiku': 'anthropic/claude-3.5-haiku',
    'claude-3-opus': 'anthropic/claude-3-opus',
    'gemini-2.0-flash': 'google/gemini-2.0-flash',
    'gemini-1.5-pro': 'google/gemini-1.5-pro',
    'deepseek-r1': 'deepseek/deepseek-r1',
    'deepseek-v3': 'deepseek/deepseek-v3',
    'deepseek-coder': 'deepseek/deepseek-coder',
    'qwen3.6-max': 'qwen/qwen3.6-max',
    'qwen3.6-plus': 'qwen/qwen3.6-plus',
    'qwen3-coder': 'qwen/qwen3-coder',
    'mistral-large': 'mistral/mistral-large',
    'mistral-medium': 'mistral/mistral-medium',
    'mistral-small': 'mistral/mistral-small',
    'llama-3.1-70b': 'meta/llama-3.1-70b',
    'llama-3.1-8b': 'meta/llama-3.1-8b',
    'command-r-plus': 'cohere/command-r-plus',
    'command-r': 'cohere/command-r',
    'glm-4': 'glm/glm-4',
    'glm-5': 'glm/glm-5',
  };
  
  // Try direct mapping
  const normalizedName = name.toLowerCase().replace(/[\s_-]+/g, '-');
  for (const [key, value] of Object.entries(mapping)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // If no mapping found, try to construct from name
  const parts = name.split('/');
  if (parts.length === 2) {
    return name.toLowerCase();
  }
  
  return name.toLowerCase();
}

/**
 * Calculate capability score from benchmark
 */
function calculateCapabilityScore(
  benchmark: string,
  value: number
): number {
  const scales: Record<string, { min: number; max: number }> = {
    'humanEval': { min: 0, max: 100 },
    'mmlu': { min: 0, max: 100 },
    'gsm8k': { min: 0, max: 100 },
    'arenaElo': { min: 1000, max: 1300 },
  };
  
  const scale = scales[benchmark];
  if (!scale) return Math.round(value / 10);
  
  const normalized = (value - scale.min) / (scale.max - scale.min);
  return Math.round(normalized * 10);
}

/**
 * Merge fetched data with existing capability data
 */
function mergeData(
  existing: any,
  openllm: OpenLLMLeaderboardEntry[],
  arena: ChatbotArenaEntry[],
  pricing: ProviderPricing
): any {
  const updated = { ...existing };
  const now = new Date().toISOString();
  
  // Update models with new benchmark data
  for (const model of updated.models) {
    // Find matching OpenLLM entry
    const openllmEntry = openllm.find(
      e => normalizeModelId(e.model) === model.id
    );
    
    if (openllmEntry) {
      model.benchmarks = {
        ...model.benchmarks,
        mmlu: openllmEntry.mmlu,
        gsm8k: openllmEntry.gsm8k,
      };
      
      // Update capabilities
      model.capabilities.reasoning = calculateCapabilityScore('mmlu', openllmEntry.mmlu);
      model.capabilities.math = calculateCapabilityScore('gsm8k', openllmEntry.gsm8k);
    }
    
    // Find matching Arena entry
    const arenaEntry = arena.find(
      e => normalizeModelId(e.model) === model.id
    );
    
    if (arenaEntry) {
      model.arenaElo = arenaEntry.elo;
      model.benchmarks = {
        ...model.benchmarks,
        arenaElo: arenaEntry.elo,
      };
    }
    
    // Update pricing if available
    const pricingEntry = pricing[model.id];
    if (pricingEntry) {
      model.cost = {
        input: pricingEntry.input,
        output: pricingEntry.output,
      };
      model.contextWindow = pricingEntry.contextWindow;
      model.maxTokens = pricingEntry.maxTokens;
    }
    
    model.updatedAt = now;
  }
  
  updated.lastUpdated = now;
  updated.dataSource = [
    ...Array.from(new Set([
      ...updated.dataSource,
      'HuggingFace OpenLLM',
      'Chatbot Arena',
    ]))
  ];
  
  return updated;
}

// ===== Main =====

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  
  console.log('🚀 HopLLM Model Capability Matrix Updater');
  console.log('==========================================');
  console.log();
  
  // Read existing data
  let existingData: any;
  try {
    const content = fs.readFileSync(CAPABILITY_FILE, 'utf-8');
    existingData = JSON.parse(content);
    console.log(`📖 Loaded ${existingData.models.length} existing models`);
  } catch (error) {
    console.error('❌ Could not read existing capability data');
    process.exit(1);
  }
  
  // Fetch new data
  const [openllmData, arenaData, pricingData] = await Promise.all([
    fetchOpenLLMData(),
    fetchArenaData(),
    fetchProviderPricing(),
  ]);
  
  if (verbose) {
    console.log(`   OpenLLM entries: ${openllmData.length}`);
    console.log(`   Arena entries: ${arenaData.length}`);
    console.log(`   Pricing entries: ${Object.keys(pricingData).length}`);
  }
  
  // Merge data
  const updatedData = mergeData(
    existingData,
    openllmData,
    arenaData,
    pricingData
  );
  
  // Save or preview
  if (dryRun) {
    console.log();
    console.log('🔍 Dry run - would save the following:');
    console.log(JSON.stringify(updatedData, null, 2).slice(0, 1000) + '...');
  } else {
    fs.writeFileSync(
      CAPABILITY_FILE,
      JSON.stringify(updatedData, null, 2)
    );
    console.log(`✅ Updated ${CAPABILITY_FILE}`);
  }
  
  console.log();
  console.log('✨ Done!');
}

main().catch(console.error);
