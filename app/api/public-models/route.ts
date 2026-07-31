/**
 * Public Models API - No authentication required
 * Returns model list with pricing for public display
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface JsonModel {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface JsonProvider {
  name: string;
  models?: JsonModel[];
  [key: string]: unknown;
}

interface JsonProvidersData {
  providers: Record<string, JsonProvider>;
  lastUpdated?: string;
}

export async function GET() {
  try {
    // 尝试不同的路径
    const possiblePaths = [
      path.join(process.cwd(), 'data', 'providers.json'),
      path.join(process.cwd(), 'clawroute', 'data', 'providers.json'),
      path.join(__dirname, '../../data/providers.json')
    ];
    
    let providersContent;
    let usedPath;
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        providersContent = fs.readFileSync(p, 'utf-8');
        usedPath = p;
        break;
      }
    }
    
    if (!providersContent) {
      console.error('No providers.json found at any path');
      return NextResponse.json(
        { error: 'Providers data not found' },
        { status: 500 }
      );
    }
    
    console.log('Using providers.json from:', usedPath);
    const data = JSON.parse(providersContent) as JsonProvidersData;
    const providers = data.providers;
    const allModels = [];

    for (const [providerId, provider] of Object.entries(providers)) {
      if (!provider.models) continue;
      
      for (const model of provider.models) {
        const m = model as Record<string, unknown>;
        allModels.push({
          id: m.id as string,
          name: m.name as string,
          provider: providerId,
          providerName: provider.name,
          costPer1MToken: typeof m.costPer1MToken === 'number' ? m.costPer1MToken : 0,
          outputCostPer1MToken: typeof m.outputCostPer1MToken === 'number' ? m.outputCostPer1MToken : 0,
          speedRating: typeof m.speedRating === 'number' ? m.speedRating : 2,
          qualityRating: typeof m.qualityRating === 'number' ? m.qualityRating : 2,
          capabilityTags: Array.isArray(m.capabilityTags) ? m.capabilityTags : [],
          contextWindow: typeof m.contextWindow === 'number' ? m.contextWindow : 0,
          pricingSource: typeof m.pricingSource === 'string' ? m.pricingSource : 'unknown',
        });
      }
    }

    // Sort by cost ascending
    allModels.sort((a, b) => (a.costPer1MToken || 0) - (b.costPer1MToken || 0));

    return NextResponse.json({
      models: allModels.slice(0, 50),
      total: allModels.length,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to get models' },
      { status: 500 }
    );
  }
}
