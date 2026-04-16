import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint to discover models from an OpenAI-compatible API.
 * POST /api/discover
 * Body: { baseUrl: string, apiKey: string }
 * Returns: { models: [...] }
 * 
 * This proxy is needed because browsers can't call arbitrary API endpoints
 * due to CORS restrictions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseUrl, apiKey } = body;

    if (!baseUrl || typeof baseUrl !== 'string') {
      return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 });
    }

    // Normalize URL - ensure it ends with /v1/models
    let modelsUrl = baseUrl.trim().replace(/\/+$/, '');
    if (!modelsUrl.endsWith('/models')) {
      if (!modelsUrl.endsWith('/v1')) {
        modelsUrl += '/v1';
      }
      modelsUrl += '/models';
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && typeof apiKey === 'string') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({
        error: `API returned ${response.status}: ${text.slice(0, 200)}`,
        status: response.status,
      }, { status: 502 });
    }

    const data = await response.json();

    // OpenAI /v1/models format: { data: [{ id, object, created, owned_by }] }
    // Some providers return extra fields
    const models = (data.data || data.models || []).map((m: Record<string, unknown>) => ({
      id: m.id || m.name || '',
      name: m.name || m.id || '',
      owned_by: m.owned_by || m.provider || '',
      // Some providers include these
      context_window: m.context_window || m.contextWindow || m.max_context_length || null,
      max_tokens: m.max_tokens || m.maxTokens || null,
      pricing: m.pricing || null, // OpenRouter style
      // Raw for debugging
      raw: m,
    }));

    return NextResponse.json({ models, count: models.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
