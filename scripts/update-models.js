#!/usr/bin/env node

/**
 * ClawRoute Model Updater
 * 
 * Fetches latest model lists from OpenRouter (free, no API key required)
 * and merges with our curated provider data
 * 
 * Usage: node scripts/update-models.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROVIDERS_FILE = path.join(__dirname, '../data/providers.json');

/**
 * OpenRouter has a public API that doesn't require authentication
 * It aggregates models from many providers: OpenAI, Anthropic, Google, DeepSeek, Meta, etc.
 */
async function fetchOpenRouterModels() {
  console.log('  Fetching from OpenRouter (no API key required)...');
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`  OpenRouter API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // Filter to popular/reliable models and extract useful info
    const models = data.data
      .filter(m => {
        // Filter to models that are generally available and not too obscure
        const id = m.id.toLowerCase();
        const isSupported = 
          id.includes('gpt-') ||
          id.includes('claude') ||
          id.includes('gemini') ||
          id.includes('deepseek') ||
          id.includes('llama') ||
          id.includes('qwen') ||
          id.includes('mistral') ||
          id.includes('command');
        
        // Exclude preview/beta models
        const isStable = !id.includes('preview') && !id.includes('beta') && !id.includes('alpha');
        
        return isSupported && isStable;
      })
      .slice(0, 100) // Limit to top 100
      .map(m => ({
        id: m.id,
        name: m.name || m.id,
        provider: getProviderFromOpenRouterId(m.id),
        context_length: m.context_length,
        pricing: m.pricing ? {
          prompt: m.pricing.prompt,
          completion: m.pricing.completion
        } : null
      }));
    
    console.log(`  Found ${models.length} models from OpenRouter`);
    return models;
  } catch (error) {
    console.warn(`  Error fetching OpenRouter: ${error.message}`);
    return [];
  }
}

/** Extract provider name from OpenRouter model ID */
function getProviderFromOpenRouterId(openRouterId) {
  const parts = openRouterId.split('/');
  if (parts.length >= 2) {
    return parts[0]; // e.g., "openai", "anthropic", "google"
  }
  return 'unknown';
}

/** Calculate cost per 1K tokens from OpenRouter pricing */
function calculateCostPer1KToken(pricing) {
  if (!pricing || !pricing.completion) return 0;
  // OpenRouter pricing is per million tokens, convert to per 1K
  return pricing.completion / 1000;
}

async function updateModels() {
  console.log('🔄 ClawRoute Model Updater\n');
  console.log('Fetching latest models from OpenRouter (free, no API key)...\n');
  
  // Fetch from OpenRouter
  const openRouterModels = await fetchOpenRouterModels();
  
  if (openRouterModels.length === 0) {
    console.error('❌ Failed to fetch models from OpenRouter');
    process.exit(1);
  }
  
  // Load existing providers.json
  let providersData;
  try {
    providersData = JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf-8'));
  } catch (error) {
    console.error('Failed to load providers.json:', error.message);
    process.exit(1);
  }
  
  // Group OpenRouter models by provider
  const modelsByProvider = {};
  for (const model of openRouterModels) {
    if (!modelsByProvider[model.provider]) {
      modelsByProvider[model.provider] = [];
    }
    modelsByProvider[model.provider].push(model);
  }
  
  // Update providers with latest model data from OpenRouter
  let updatedCount = 0;
  
  for (const [providerId, models] of Object.entries(modelsByProvider)) {
    if (providersData.providers[providerId]) {
      // Merge with existing provider data
      const existingIds = new Set(
        (providersData.providers[providerId].models || []).map(m => m.id)
      );
      
      // Add new models found on OpenRouter
      for (const model of models) {
        if (!existingIds.has(model.id)) {
          providersData.providers[providerId].models.push({
            id: model.id,
            name: model.name,
            costPer1KToken: calculateCostPer1KToken(model.pricing),
            speedRating: 2, // Default, can be refined
            qualityRating: 2, // Default, can be refined
            capabilityTags: [],
            recommendationReason: 'Updated from OpenRouter'
          });
          updatedCount++;
        }
      }
    }
  }
  
  providersData.lastUpdated = new Date().toISOString().split('T')[0];
  
  // Write updated file
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providersData, null, 2));
  
  console.log('\n✅ Update complete!');
  console.log(`   Added ${updatedCount} new models`);
  console.log(`   Last updated: ${providersData.lastUpdated}`);
  
  // Print summary
  console.log('\n📊 Model counts by provider:');
  for (const [providerId, provider] of Object.entries(providersData.providers)) {
    console.log(`   ${providerId}: ${provider.models?.length || 0} models`);
  }
}

// Run if executed directly
updateModels().catch(console.error);

export { updateModels, fetchOpenRouterModels };
