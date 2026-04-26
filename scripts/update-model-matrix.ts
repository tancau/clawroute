#!/usr/bin/env node
/**
 * HopLLM Model Capability Matrix Updater
 * 
 * Fetches benchmark data from:
 * - Chatbot Arena (via wulong.dev API)
 * - LLM Pricing (via simonw/llm-prices GitHub repo)
 * - OpenLLM Leaderboard (fallback to existing data)
 * 
 * Usage: npx ts-node scripts/update-model-matrix.ts [--dry-run] [--verbose]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Types =====
interface ArenaModel {
  rank: number;
  model: string;
  vendor: string | null;
  license: string | null;
  score: number | null;
  ci: number | null;
  votes: number | null;
}

interface ArenaResponse {
  meta: {
    leaderboard: string;
    source_url: string;
    fetched_at: string;
    last_updated: string;
    model_count: number;
  };
  models: ArenaModel[];
}

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

interface PricingEntry {
  id: string;
  name: string;
  price_history: {
    input: number;
    output: number;
    from_date: string | null;
    to_date: string | null;
    input_cached: number | null;
  }[];
}

interface ProviderPricing {
  vendor: string;
  models: PricingEntry[];
}

interface ModelCapability {
  id: string;
  provider: string;
  name: string;
  description?: string;
  capabilities: {
    coding: number;
    reasoning: number;
    math: number;
    translation: number;
    creative: number;
    analysis: number;
    longContext: number;
    chinese: number;
  };
  benchmarks?: {
    humanEval?: number;
    mmlu?: number;
    gsm8K?: number;
    mtBench?: number;
    arenaElo?: number;
  };
  arenaElo?: number;
  cost: {
    input: number;
    output: number;
    cacheRead?: number;
  };
  contextWindow: number;
  maxTokens: number;
  inputTypes: string[];
  tags: string[];
  overallScore?: number;
  valueScore?: number;
  updatedAt: string;
  dataSource: string[];
  isFree?: boolean;
  isAvailable?: boolean;
}

// ===== Configuration =====
const DATA_DIR = path.join(__dirname, '..', 'data');
const CAPABILITY_FILE = path.join(DATA_DIR, 'model-capabilities.json');

// Real API endpoints
const ARENA_API = 'https://api.wulong.dev/arena-ai-leaderboards/v1/leaderboard?name=text';
const ARENA_FALLBACK_API = 'https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards/main/data/latest.json';
const PRICING_BASE_URL = 'https://raw.githubusercontent.com/simonw/llm-prices/main/data';

// Pricing vendors to fetch
const PRICING_VENDORS = [
  'anthropic',
  'openai', 
  'google',
  'mistral',
  'deepseek',
  'meta',
  'cohere',
  'amazon',
  'xai',
];

// Model name mapping for Arena -> internal ID
const ARENA_TO_INTERNAL_MAP: Record<string, string> = {
  // Anthropic
  'claude-opus-4-7-thinking': 'anthropic/claude-opus-4',
  'claude-opus-4-6-thinking': 'anthropic/claude-opus-4',
  'claude-opus-4-7': 'anthropic/claude-opus-4',
  'claude-opus-4-6': 'anthropic/claude-opus-4',
  'claude-opus-4-5-20251101-thinking-32k': 'anthropic/claude-opus-4',
  'claude-opus-4-5-20251101': 'anthropic/claude-opus-4',
  'claude-sonnet-4-6': 'anthropic/claude-sonnet-4',
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-3.5-haiku': 'anthropic/claude-3.5-haiku',
  'claude-3-opus': 'anthropic/claude-3-opus',
  'claude-3-haiku': 'anthropic/claude-3-haiku',
  
  // OpenAI
  'gpt-5.4-high': 'openai/gpt-5',
  'gpt-5.4': 'openai/gpt-5',
  'gpt-5.2-chat-latest-20260210': 'openai/gpt-5',
  'gpt-5.4-mini-high': 'openai/gpt-5-mini',
  'gpt-5.1-high': 'openai/gpt-5',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-4': 'openai/gpt-4',
  
  // Google
  'gemini-3.1-pro-preview': 'google/gemini-3-pro',
  'gemini-3-pro': 'google/gemini-3-pro',
  'gemini-3-flash': 'google/gemini-3-flash',
  'gemini-2.0-flash': 'google/gemini-2.0-flash',
  'gemini-1.5-pro': 'google/gemini-1.5-pro',
  'gemini-1.5-flash': 'google/gemini-1.5-flash',
  
  // DeepSeek
  'deepseek-r1': 'deepseek/deepseek-r1',
  'deepseek-v3': 'deepseek/deepseek-v3',
  'deepseek-coder': 'deepseek/deepseek-coder',
  
  // Qwen/Alibaba
  'qwen3.5-max-preview': 'qwen/qwen3.5-max',
  'qwen3.6-max': 'qwen/qwen3.6-max',
  'qwen3.6-plus': 'qwen/qwen3.6-plus',
  'qwen3-coder': 'qwen/qwen3-coder',
  
  // GLM
  'glm-5.1': 'glm/glm-5',
  'glm-5': 'glm/glm-5',
  'glm-4': 'glm/glm-4',
  
  // xAI
  'grok-4.20-beta1': 'xai/grok-4',
  'grok-4.20-beta-0309-reasoning': 'xai/grok-4',
  'grok-4.20-multi-agent-beta-0309': 'xai/grok-4',
  'grok-4.1-thinking': 'xai/grok-4',
  'grok-4.1': 'xai/grok-4',
  
  // Meta
  'llama-3.1-70b': 'meta/llama-3.1-70b',
  'llama-3.1-8b': 'meta/llama-3.1-8b',
  'llama-3-70b': 'meta/llama-3-70b',
  
  // Mistral
  'mistral-large': 'mistral/mistral-large',
  'mistral-medium': 'mistral/mistral-medium',
  'mistral-small': 'mistral/mistral-small',
  
  // Cohere
  'command-r-plus': 'cohere/command-r-plus',
  'command-r': 'cohere/command-r',
  
  // Bytedance
  'dola-seed-2.0-pro': 'bytedance/dola-seed-2.0',
};

// Pricing ID to internal ID mapping
const PRICING_TO_INTERNAL_MAP: Record<string, string> = {
  // Anthropic
  'claude-3.7-sonnet': 'anthropic/claude-3.7-sonnet',
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-3.5-haiku': 'anthropic/claude-3.5-haiku',
  'claude-4.5-haiku': 'anthropic/claude-4.5-haiku',
  'claude-sonnet-4.5': 'anthropic/claude-sonnet-4',
  'claude-3-opus': 'anthropic/claude-3-opus',
  'claude-3-haiku': 'anthropic/claude-3-haiku',
  
  // OpenAI
  'gpt-4.5': 'openai/gpt-4.5',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'chatgpt-4o-latest': 'openai/gpt-4o',
  'o1-preview': 'openai/o1-preview',
  'o1-mini': 'openai/o1-mini',
  'o1-pro': 'openai/o1-pro',
  
  // Google
  'gemini-2.0-flash': 'google/gemini-2.0-flash',
  'gemini-1.5-pro': 'google/gemini-1.5-pro',
  'gemini-1.5-flash': 'google/gemini-1.5-flash',
  'gemini-1.5-pro-legacy': 'google/gemini-1.5-pro',
  
  // Mistral
  'mistral-large-2': 'mistral/mistral-large-2',
  'mistral-large': 'mistral/mistral-large',
  'mistral-medium': 'mistral/mistral-medium',
  'mistral-small': 'mistral/mistral-small',
  'codestral': 'mistral/codestral',
  
  // DeepSeek
  'deepseek-chat': 'deepseek/deepseek-v3',
  'deepseek-coder': 'deepseek/deepseek-coder',
  'deepseek-reasoner': 'deepseek/deepseek-r1',
  
  // Cohere
  'command-r-plus': 'cohere/command-r-plus',
  'command-r': 'cohere/command-r',
  
  // xAI
  'grok-2': 'xai/grok-2',
  'grok-2-mini': 'xai/grok-2-mini',
};

// ===== Helper Functions =====

/**
 * Map Arena model name to internal ID
 */
function mapArenaToInternal(arenaName: string): string | null {
  const normalizedName = arenaName.toLowerCase().replace(/[\s_]+/g, '-');
  
  // Direct mapping
  if (ARENA_TO_INTERNAL_MAP[arenaName]) {
    return ARENA_TO_INTERNAL_MAP[arenaName];
  }
  
  // Try normalized mapping
  for (const [key, value] of Object.entries(ARENA_TO_INTERNAL_MAP)) {
    if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
      return value;
    }
  }
  
  // Try to construct from vendor
  const parts = arenaName.split('/');
  if (parts.length === 2) {
    return arenaName.toLowerCase();
  }
  
  return null;
}

/**
 * Map pricing ID to internal ID
 */
function mapPricingToInternal(pricingId: string): string | null {
  const normalized = pricingId.toLowerCase().replace(/[\s_]+/g, '-');
  
  if (PRICING_TO_INTERNAL_MAP[pricingId]) {
    return PRICING_TO_INTERNAL_MAP[pricingId];
  }
  
  if (PRICING_TO_INTERNAL_MAP[normalized]) {
    return PRICING_TO_INTERNAL_MAP[normalized];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(PRICING_TO_INTERNAL_MAP)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

// ===== API Fetchers =====

/**
 * Fetch Chatbot Arena Elo ratings
 */
async function fetchArenaData(): Promise<Map<string, { elo: number; ci: number; votes: number; rank: number }>> {
  console.log('🏆 Fetching Chatbot Arena data...');
  
  const result = new Map<string, { elo: number; ci: number; votes: number; rank: number }>();
  
  // Try primary API first, then fallback
  const apis = [
    { url: ARENA_API, name: 'wulong.dev API' },
    { url: null, name: 'GitHub fallback (will construct URL)' }, // Special handling for fallback
  ];
  
  for (const api of apis) {
    try {
      let data: ArenaResponse;
      
      if (api.url === null) {
        // Use GitHub fallback - need to first get latest date, then fetch the data
        console.log(`   Trying GitHub fallback...`);
        const latestResponse = await fetch(ARENA_FALLBACK_API, {
          headers: { 'User-Agent': 'HopLLM-ModelMatrix/1.0' },
        });
        
        if (!latestResponse.ok) {
          throw new Error(`GitHub fallback failed: HTTP ${latestResponse.status}`);
        }
        
        const latestInfo = await latestResponse.json();
        const date = latestInfo.date;
        
        const dataUrl = `https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards/main/data/${date}/text.json`;
        const dataResponse = await fetch(dataUrl, {
          headers: { 'User-Agent': 'HopLLM-ModelMatrix/1.0' },
        });
        
        if (!dataResponse.ok) {
          throw new Error(`GitHub data fetch failed: HTTP ${dataResponse.status}`);
        }
        
        data = await dataResponse.json();
      } else {
        const response = await fetch(api.url, {
          headers: { 'User-Agent': 'HopLLM-ModelMatrix/1.0' },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        data = await response.json();
      }
      
      console.log(`   ✓ Fetched ${data.models.length} models from ${api.name}`);
      
      for (const model of data.models) {
        if (model.score === null) continue;
        
        const internalId = mapArenaToInternal(model.model);
        if (internalId) {
          result.set(internalId, {
            elo: model.score,
            ci: model.ci || 0,
            votes: model.votes || 0,
            rank: model.rank,
          });
        }
      }
      
      console.log(`   ✓ Mapped ${result.size} models to internal IDs`);
      return result;
    } catch (error) {
      console.warn(`   ⚠️ ${api.name} failed:`, error instanceof Error ? error.message : error);
      continue;
    }
  }
  
  console.warn('⚠️  All Arena APIs failed. Using cached/existing data instead.');
  return result;
}

/**
 * Fetch LLM pricing data from multiple vendors
 */
async function fetchProviderPricing(): Promise<Map<string, { input: number; output: number; cacheRead?: number }>> {
  console.log('💰 Fetching provider pricing...');
  
  const result = new Map<string, { input: number; output: number; cacheRead?: number }>();
  
  const fetchPromises = PRICING_VENDORS.map(async (vendor) => {
    try {
      const url = `${PRICING_BASE_URL}/${vendor}.json`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'HopLLM-ModelMatrix/1.0' },
      });
      
      if (!response.ok) {
        return; // Silently skip vendors without pricing data
      }
      
      const data: ProviderPricing = await response.json();
      
      for (const model of data.models) {
        const latestPrice = model.price_history[model.price_history.length - 1];
        if (!latestPrice) continue;
        
        const internalId = mapPricingToInternal(model.id);
        if (internalId) {
          result.set(internalId, {
            input: latestPrice.input,
            output: latestPrice.output,
            cacheRead: latestPrice.input_cached || undefined,
          });
        }
      }
    } catch (error) {
      // Silently skip vendors with errors
    }
  });
  
  await Promise.allSettled(fetchPromises);
  
  console.log(`   ✓ Fetched pricing for ${result.size} models`);
  return result;
}

/**
 * Fetch OpenLLM Leaderboard data
 * Note: OpenLLM doesn't have a simple API, so we use a curated fallback
 */
async function fetchOpenLLMData(): Promise<Map<string, { mmlu?: number; gsm8k?: number; humanEval?: number }>> {
  console.log('📊 OpenLLM Leaderboard: Using existing benchmark data (API unavailable)');
  
  // OpenLLM Leaderboard doesn't provide a simple API
  // Return empty map - we'll preserve existing benchmark data
  return new Map();
}

// ===== Data Processing =====

/**
 * Calculate capability score from benchmark value
 */
function calculateCapabilityScore(benchmark: string, value: number): number {
  // Most benchmarks are 0-100 scale, convert to 0-10
  if (benchmark === 'arenaElo') {
    // Arena Elo is typically 1000-1500 range
    const normalized = (value - 1000) / 50;
    return Math.max(0, Math.min(10, Math.round(normalized)));
  }
  
  // Standard benchmarks (0-100 -> 0-10)
  return Math.round(value / 10);
}

/**
 * Merge fetched data with existing capability data
 * Manual data takes priority over fetched data
 */
function mergeData(
  existing: { models: ModelCapability[]; lastUpdated: string; version: string; dataSource: string[] },
  arenaData: Map<string, { elo: number; ci: number; votes: number; rank: number }>,
  pricingData: Map<string, { input: number; output: number; cacheRead?: number }>,
  openLLMData: Map<string, { mmlu?: number; gsm8k?: number; humanEval?: number }>
): typeof existing {
  const now = new Date().toISOString();
  const dataSources = new Set<string>();
  
  const updatedModels = existing.models.map(model => {
    const updated = { ...model };
    let hasUpdates = false;
    
    // Update Arena Elo (if not manually set)
    const arenaEntry = arenaData.get(model.id);
    if (arenaEntry && (!model.arenaElo || model.dataSource.includes('Chatbot Arena'))) {
      updated.arenaElo = arenaEntry.elo;
      updated.benchmarks = {
        ...updated.benchmarks,
        arenaElo: arenaEntry.elo,
      };
      hasUpdates = true;
      dataSources.add('Chatbot Arena');
    }
    
    // Update pricing (if not manually set or if from pricing data)
    const pricingEntry = pricingData.get(model.id);
    if (pricingEntry && (model.dataSource.includes('Provider API') || model.dataSource.includes('Pricing'))) {
      updated.cost = {
        input: pricingEntry.input,
        output: pricingEntry.output,
      };
      if (pricingEntry.cacheRead) {
        updated.cost.cacheRead = pricingEntry.cacheRead;
      }
      hasUpdates = true;
      dataSources.add('Provider Pricing');
    }
    
    // Update benchmarks from OpenLLM (if available)
    const openLLMEntry = openLLMData.get(model.id);
    if (openLLMEntry) {
      if (openLLMEntry.mmlu && !model.benchmarks?.mmlu) {
        updated.benchmarks = { ...updated.benchmarks, mmlu: openLLMEntry.mmlu };
        updated.capabilities.reasoning = calculateCapabilityScore('mmlu', openLLMEntry.mmlu);
        hasUpdates = true;
      }
      if (openLLMEntry.gsm8k && !model.benchmarks?.gsm8K) {
        updated.benchmarks = { ...updated.benchmarks, gsm8K: openLLMEntry.gsm8k };
        updated.capabilities.math = calculateCapabilityScore('gsm8k', openLLMEntry.gsm8k);
        hasUpdates = true;
      }
      if (openLLMEntry.humanEval && !model.benchmarks?.humanEval) {
        updated.benchmarks = { ...updated.benchmarks, humanEval: openLLMEntry.humanEval };
        updated.capabilities.coding = calculateCapabilityScore('humanEval', openLLMEntry.humanEval);
        hasUpdates = true;
      }
      dataSources.add('OpenLLM Leaderboard');
    }
    
    if (hasUpdates) {
      updated.updatedAt = now;
      // Merge data sources
      updated.dataSource = Array.from(new Set([...updated.dataSource, ...Array.from(dataSources)]));
    }
    
    return updated;
  });
  
  return {
    ...existing,
    models: updatedModels,
    lastUpdated: now,
    dataSource: Array.from(new Set([...existing.dataSource, ...Array.from(dataSources)])),
  };
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
  let existingData: { models: ModelCapability[]; lastUpdated: string; version: string; dataSource: string[] };
  try {
    const content = fs.readFileSync(CAPABILITY_FILE, 'utf-8');
    existingData = JSON.parse(content);
    console.log(`📖 Loaded ${existingData.models.length} existing models`);
  } catch (error) {
    console.error('❌ Could not read existing capability data');
    console.error(`   File: ${CAPABILITY_FILE}`);
    process.exit(1);
  }
  
  // Fetch new data
  const [arenaData, pricingData, openLLMData] = await Promise.all([
    fetchArenaData(),
    fetchProviderPricing(),
    fetchOpenLLMData(),
  ]);
  
  if (verbose) {
    console.log();
    console.log('📊 Fetch Summary:');
    console.log(`   Arena entries: ${arenaData.size}`);
    console.log(`   Pricing entries: ${pricingData.size}`);
    console.log(`   OpenLLM entries: ${openLLMData.size}`);
    console.log();
    
    // Show sample Arena data
    if (arenaData.size > 0) {
      console.log('   Top Arena models:');
      const sorted = Array.from(arenaData.entries())
        .sort((a, b) => b[1].elo - a[1].elo)
        .slice(0, 5);
      for (const [id, data] of sorted) {
        console.log(`     ${id}: Elo ${data.elo} (rank #${data.rank})`);
      }
    }
  }
  
  // Merge data
  const updatedData = mergeData(existingData, arenaData, pricingData, openLLMData);
  
  // Count updates
  let updateCount = 0;
  for (let i = 0; i < existingData.models.length; i++) {
    const existingModel = existingData.models[i];
    const updatedModel = updatedData.models[i];
    if (existingModel && updatedModel && existingModel.updatedAt !== updatedModel.updatedAt) {
      updateCount++;
    }
  }
  
  console.log();
  console.log(`📝 Updated ${updateCount} models`);
  
  // Save or preview
  if (dryRun) {
    console.log();
    console.log('🔍 Dry run - would save the following:');
    const summary = {
      lastUpdated: updatedData.lastUpdated,
      modelCount: updatedData.models.length,
      dataSources: updatedData.dataSource,
      sampleModels: updatedData.models.slice(0, 3).map(m => ({
        id: m.id,
        name: m.name,
        arenaElo: m.arenaElo,
        cost: m.cost,
      })),
    };
    console.log(JSON.stringify(summary, null, 2));
  } else {
    // Backup existing file
    const backupFile = CAPABILITY_FILE.replace('.json', `.backup-${Date.now()}.json`);
    fs.copyFileSync(CAPABILITY_FILE, backupFile);
    console.log(`   ✓ Backup saved: ${path.basename(backupFile)}`);
    
    // Write updated data
    fs.writeFileSync(
      CAPABILITY_FILE,
      JSON.stringify(updatedData, null, 2)
    );
    console.log(`   ✓ Updated: ${path.basename(CAPABILITY_FILE)}`);
  }
  
  console.log();
  console.log('✨ Done!');
}

main().catch(console.error);
