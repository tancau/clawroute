#!/usr/bin/env node

/**
 * HopLLM Model Updater - Multi-Source Price Fetcher
 *
 * Fetches model prices from multiple sources:
 * 1. Official provider pricing (static config for direct purchase)
 * 2. OpenRouter (aggregator with its own pricing)
 *
 * Each source is stored as a separate provider, allowing users to compare channels.
 *
 * Usage: node scripts/update-models.js [--source=all|official|openrouter]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROVIDERS_FILE = path.join(__dirname, '../data/providers.json');

/** Official provider pricing configurations (USD per 1M tokens) */
const OFFICIAL_PRICING = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    models: {
      'gpt-4o': { input: 5.0, output: 15.0, contextWindow: 128000 },
      'gpt-4o-mini': { input: 0.15, output: 0.6, contextWindow: 128000 },
      'gpt-4-turbo': { input: 10.0, output: 30.0, contextWindow: 128000 },
      'gpt-4': { input: 30.0, output: 60.0, contextWindow: 8192 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5, contextWindow: 16385 },
    }
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    models: {
      'claude-3-5-sonnet': { input: 3.0, output: 15.0, contextWindow: 200000 },
      'claude-3-5-haiku': { input: 0.25, output: 1.25, contextWindow: 200000 },
      'claude-3-opus': { input: 15.0, output: 75.0, contextWindow: 200000 },
      'claude-sonnet-4-6': { input: 3.0, output: 15.0, contextWindow: 200000 },
      'claude-haiku-4-5': { input: 1.0, output: 5.0, contextWindow: 200000 },
    }
  },
  google: {
    name: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnvVar: 'GOOGLE_API_KEY',
    models: {
      'gemini-1.5-pro': { input: 3.5, output: 10.5, contextWindow: 2000000 },
      'gemini-1.5-flash': { input: 0.075, output: 0.3, contextWindow: 1000000 },
      'gemini-2.0-flash': { input: 0.1, output: 0.4, contextWindow: 1000000 },
    }
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    models: {
      'deepseek-chat': { input: 0.5, output: 0.5, contextWindow: 64000 },
      'deepseek-reasoner': { input: 1.0, output: 1.0, contextWindow: 64000 },
      'deepseek-coder': { input: 0.3, output: 0.3, contextWindow: 64000 },
    }
  },
  qwen: {
    name: 'Qwen (Alibaba)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnvVar: 'DASHSCOPE_API_KEY',
    models: {
      'qwen-plus': { input: 0.8, output: 2.0, contextWindow: 131072 },
      'qwen-max': { input: 2.0, output: 6.0, contextWindow: 32768 },
      'qwen-turbo': { input: 0.8, output: 0.8, contextWindow: 8192 },
    }
  },
  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnvVar: 'MISTRAL_API_KEY',
    models: {
      'mistral-small': { input: 0.2, output: 0.6, contextWindow: 32000 },
      'mistral-medium': { input: 1.0, output: 3.0, contextWindow: 32000 },
      'mistral-large': { input: 2.0, output: 6.0, contextWindow: 32000 },
    }
  },
  grok: {
    name: 'Grok (xAI)',
    baseUrl: 'https://api.x.ai/v1',
    apiKeyEnvVar: 'XAI_API_KEY',
    models: {
      'grok-2': { input: 5.0, output: 15.0, contextWindow: 131072 },
      'grok-2-mini': { input: 0.5, output: 1.5, contextWindow: 131072 },
    }
  },
  moonshot: {
    name: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKeyEnvVar: 'MOONSHOT_API_KEY',
    models: {
      'moonshot-v1-8k': { input: 1.0, output: 1.0, contextWindow: 8192 },
      'moonshot-v1-32k': { input: 2.0, output: 2.0, contextWindow: 32768 },
      'moonshot-v1-128k': { input: 4.0, output: 4.0, contextWindow: 128000 },
    }
  },
  cohere: {
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v1',
    apiKeyEnvVar: 'COHERE_API_KEY',
    models: {
      'command-r': { input: 0.5, output: 1.5, contextWindow: 128000 },
      'command-r-plus': { input: 3.0, output: 15.0, contextWindow: 128000 },
    }
  },
};

/** Provider ID mapping from OpenRouter to internal */
const OPENROUTER_PROVIDER_MAP = {
  'openai': 'openai',
  'anthropic': 'anthropic',
  'google': 'google',
  'deepseek': 'deepseek',
  'alibaba': 'qwen',
  'qwen': 'qwen',
  'mistralai': 'mistral',
  'meta-llama': 'meta',
  'x-ai': 'grok',
  'cohere': 'cohere',
  'perplexity': 'perplexity',
  'nvidia': 'nvidia',
  'microsoft': 'microsoft',
  '01-ai': 'yi',
  'moonshotai': 'moonshot',
  'baichuan': 'baichuan',
  'zhipu': 'zhipu',
  'stepfun': 'stepfun',
  'minimax': 'minimax',
  'bytedance': 'bytedance',
  'thudm': 'chatglm',
  'tencent': 'tencent',
  'internlm': 'internlm',
  'siliconflow': 'siliconflow',
};

/**
 * Generate official provider models from static config
 */
function generateOfficialModels() {
  const models = [];

  for (const [providerId, config] of Object.entries(OFFICIAL_PRICING)) {
    for (const [modelId, pricing] of Object.entries(config.models)) {
      models.push({
        id: modelId,
        name: `${config.name}: ${modelId}`,
        provider: providerId,
        costPer1MToken: pricing.input,
        outputCostPer1MToken: pricing.output,
        contextWindow: pricing.contextWindow,
        speedRating: 2,
        qualityRating: 2,
        capabilityTags: [],
        recommendationReason: 'Official direct pricing',
        pricingSource: 'official',
      });
    }
  }

  return models;
}

/**
 * Fetch models from OpenRouter (free, no API key required)
 */
async function fetchOpenRouterModels() {
  console.log('  Fetching from OpenRouter...');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`  OpenRouter API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    const models = data.data
      .filter(m => {
        const id = m.id.toLowerCase();
        const isSupported =
          id.includes('gpt-') ||
          id.includes('claude') ||
          id.includes('gemini') ||
          id.includes('deepseek') ||
          id.includes('llama') ||
          id.includes('qwen') ||
          id.includes('mistral') ||
          id.includes('command') ||
          id.includes('grok') ||
          id.includes('kimi') ||
          id.includes('yi-') ||
          id.includes('baichuan') ||
          id.includes('chatglm') ||
          id.includes('glm-') ||
          id.includes('step-') ||
          id.includes('minimax') ||
          id.includes('doubao') ||
          id.includes('hunyuan') ||
          id.includes('internlm') ||
          id.includes('phi') ||
          id.includes('nemotron');

        const isStable = !id.includes('preview') && !id.includes('beta') && !id.includes('alpha') && !id.includes('deprecated');
        return isSupported && isStable;
      })
      .slice(0, 100)
      .map(m => {
        const parts = m.id.split('/');
        const rawProvider = parts[0];
        const modelId = parts.length >= 2 ? parts.slice(1).join('/') : m.id;
        const provider = OPENROUTER_PROVIDER_MAP[rawProvider] || rawProvider;

        return {
          id: modelId,
          name: m.name || modelId,
          provider: provider,
          costPer1MToken: m.pricing?.prompt ? (parseFloat(m.pricing.prompt) * 1_000_000) : 0,
          outputCostPer1MToken: m.pricing?.completion ? (parseFloat(m.pricing.completion) * 1_000_000) : 0,
          contextWindow: m.context_length || 0,
          speedRating: 2,
          qualityRating: 2,
          capabilityTags: [],
          recommendationReason: 'OpenRouter aggregator',
          pricingSource: 'openrouter',
        };
      });

    console.log(`  Found ${models.length} models from OpenRouter`);
    return models;
  } catch (error) {
    console.warn(`  Error fetching OpenRouter: ${error.message}`);
    return [];
  }
}

/**
 * Update providers.json with pricing data
 */
async function updateModels(options = {}) {
  const source = options.source || 'all';

  console.log('🔄 HopLLM Model Updater (Multi-Source)\n');

  let officialModels = [];
  let openRouterModels = [];

  // Generate official pricing
  if (source === 'all' || source === 'official') {
    console.log('Generating official pricing...');
    officialModels = generateOfficialModels();
    console.log(`  Total official models: ${officialModels.length}\n`);
  }

  // Fetch OpenRouter pricing
  if (source === 'all' || source === 'openrouter') {
    console.log('Fetching OpenRouter pricing...');
    openRouterModels = await fetchOpenRouterModels();
    console.log();
  }

  // Load existing providers.json
  let providersData;
  try {
    providersData = JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf-8'));
  } catch (error) {
    console.error('Failed to load providers.json:', error.message);
    process.exit(1);
  }

  // Update providers with official pricing
  if (officialModels.length > 0) {
    console.log('Updating official provider pricing...');
    for (const model of officialModels) {
      const provider = providersData.providers[model.provider];
      if (!provider) continue;

      const existing = provider.models.find(m => m.id === model.id);
      if (existing) {
        // Update existing model
        existing.costPer1MToken = model.costPer1MToken;
        existing.outputCostPer1MToken = model.outputCostPer1MToken;
        existing.pricingSource = 'official';
      } else {
        // Add new model
        provider.models.push(model);
      }
    }
    console.log(`  Updated ${officialModels.length} official models\n`);
  }

  // Update OpenRouter provider (as a separate aggregator channel)
  if (openRouterModels.length > 0) {
    console.log('Updating OpenRouter aggregator pricing...');

    // Create or update openrouter provider
    if (!providersData.providers.openrouter) {
      providersData.providers.openrouter = {
        name: 'OpenRouter (Aggregator)',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKeyEnvVar: 'OPENROUTER_API_KEY',
        api: 'openai-completions',
        models: [],
      };
    }

    const orProvider = providersData.providers.openrouter;
    const existingIds = new Set((orProvider.models || []).map(m => m.id));
    let added = 0;
    let updated = 0;

    for (const model of openRouterModels) {
      if (!existingIds.has(model.id)) {
        orProvider.models.push(model);
        added++;
      } else {
        const existing = orProvider.models.find(m => m.id === model.id);
        if (existing) {
          existing.costPer1MToken = model.costPer1MToken;
          existing.outputCostPer1MToken = model.outputCostPer1MToken;
          updated++;
        }
      }
    }

    console.log(`  Added ${added} new models, updated ${updated} existing models\n`);
  }

  providersData.lastUpdated = new Date().toISOString().split('T')[0];

  // Write updated file
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providersData, null, 2));

  console.log('✅ Update complete!');
  console.log(`   Last updated: ${providersData.lastUpdated}`);

  // Print summary
  console.log('\n📊 Model counts by provider:');
  for (const [providerId, provider] of Object.entries(providersData.providers)) {
    const modelCount = provider.models?.length || 0;
    const officialCount = provider.models?.filter(m => m.pricingSource === 'official').length || 0;
    const orCount = provider.models?.filter(m => m.pricingSource === 'openrouter').length || 0;
    console.log(`   ${providerId}: ${modelCount} models (${officialCount} official, ${orCount} OpenRouter)`);
  }

  // Print price comparison for common models
  console.log('\n💰 Price comparison (Input cost per 1M tokens):');
  const comparisons = [
    { official: 'openai/gpt-4o-mini', orPattern: 'gpt-4o-mini' },
    { official: 'openai/gpt-4o', orPattern: 'gpt-4o' },
    { official: 'deepseek/deepseek-chat', orPattern: 'deepseek-chat' },
  ];

  for (const compare of comparisons) {
    const [providerId, modelId] = compare.official.split('/');
    const official = providersData.providers[providerId]?.models?.find(m => m.id === modelId);
    const orModels = providersData.providers.openrouter?.models?.filter(m =>
      m.id.includes(compare.orPattern) || m.name.includes(compare.orPattern)
    );

    if (official) {
      console.log(`\n   ${modelId}:`);
      console.log(`     Official (${providerId}): $${official.costPer1MToken} input / $${official.outputCostPer1MToken} output`);
      if (orModels && orModels.length > 0) {
        for (const or of orModels.slice(0, 2)) {
          console.log(`     OpenRouter: $${or.costPer1MToken} input / $${or.outputCostPer1MToken} output`);
        }
      }
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const sourceArg = args.find(arg => arg.startsWith('--source='));
const source = sourceArg ? sourceArg.split('=')[1] : 'all';

// Run if executed directly
updateModels({ source }).catch(console.error);

export { updateModels, generateOfficialModels, fetchOpenRouterModels };
