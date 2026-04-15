#!/usr/bin/env node

/**
 * ClawRoute Model Updater
 * 
 * Fetches latest model lists from various LLM providers and updates providers.json
 * 
 * Usage: node scripts/update-models.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROVIDERS_FILE = path.join(__dirname, '../data/providers.json');

// Provider API endpoints for fetching model lists
const PROVIDER_APIS = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}` },
    filter: (data) => data.data.filter(m => m.id.includes('gpt')).map(m => ({
      id: m.id,
      name: m.id.replace(/-/g, ' ').replace(/gpt/i, 'GPT ')
    }))
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/models',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
    filter: (data) => data.data.map(m => ({
      id: m.id,
      name: m.display_name || m.id
    }))
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models?key=' + (process.env.GOOGLE_API_KEY || ''),
    headers: {},
    filter: (data) => data.models.map(m => ({
      id: m.name.replace('models/', ''),
      name: m.displayName || m.name
    }))
  },
  deepseek: {
    // DeepSeek doesn't have a public model list API, use known models
    url: null,
    known: [
      { id: 'deepseek-chat', name: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1' }
    ],
    filter: (data) => data
  },
  cohere: {
    url: 'https://api.cohere.ai/v2/models',
    headers: { 'Authorization': `Bearer ${process.env.COHERE_API_KEY || ''}` },
    filter: (data) => data.models.filter(m => m.latest).map(m => ({
      id: m.name,
      name: m.name
    }))
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/models',
    headers: {},
    filter: (data) => data.data.slice(0, 50).map(m => ({
      id: m.id,
      name: m.name || m.id,
      cost: m.pricing?.prompt
    }))
  }
};

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchProviderModels(providerId) {
  const provider = PROVIDER_APIS[providerId];
  
  if (!provider) {
    console.warn(`  Unknown provider: ${providerId}`);
    return [];
  }
  
  if (!provider.url) {
    // Use known models if no API available
    console.log(`  Using known models for ${providerId}`);
    return provider.known || [];
  }
  
  try {
    console.log(`  Fetching from ${providerId}...`);
    const response = await fetchWithTimeout(provider.url, { headers: provider.headers });
    
    if (!response.ok) {
      console.warn(`  Failed to fetch ${providerId}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    return provider.filter(data);
  } catch (error) {
    console.warn(`  Error fetching ${providerId}: ${error.message}`);
    return [];
  }
}

async function updateModels() {
  console.log('🔄 ClawRoute Model Updater\n');
  console.log('Fetching latest models from providers...\n');
  
  const results = {};
  
  for (const providerId of Object.keys(PROVIDER_APIS)) {
    console.log(`\n📦 ${providerId}:`);
    const models = await fetchProviderModels(providerId);
    results[providerId] = models;
    console.log(`  Found ${models.length} models`);
  }
  
  // Load existing providers.json
  let providersData;
  try {
    providersData = JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf-8'));
  } catch (error) {
    console.error('Failed to load providers.json:', error.message);
    process.exit(1);
  }
  
  // Update models for each provider
  let updatedCount = 0;
  
  for (const [providerId, models] of Object.entries(results)) {
    if (providersData.providers[providerId] && models.length > 0) {
      // Merge with existing model data, preserving our custom fields
      const existingModels = providersData.providers[providerId].models || [];
      
      // Update only if we got new models from API
      if (models.length > existingModels.length || process.argv.includes('--force')) {
        providersData.providers[providerId].models = models.map(newModel => {
          const existing = existingModels.find(m => m.id === newModel.id);
          if (existing) {
            return { ...existing, ...newModel };
          }
          return newModel;
        });
        updatedCount++;
      }
    }
  }
  
  providersData.lastUpdated = new Date().toISOString().split('T')[0];
  
  // Write updated file
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providersData, null, 2));
  
  console.log('\n✅ Update complete!');
  console.log(`   Updated ${updatedCount} providers`);
  console.log(`   Last updated: ${providersData.lastUpdated}`);
  
  // Print summary
  console.log('\n📊 Model counts by provider:');
  for (const [providerId, provider] of Object.entries(providersData.providers)) {
    console.log(`   ${providerId}: ${provider.models?.length || 0} models`);
  }
}

// Run if executed directly
updateModels().catch(console.error);

export { updateModels, fetchProviderModels };
