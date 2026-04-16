import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify an API key by making a lightweight chat completion request.
 * POST /api/verify
 * Body: { baseUrl: string, apiKey: string, model?: string }
 * Returns: { valid: boolean, model?: string, error?: string, latencyMs?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseUrl, apiKey, model } = body;

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ valid: false, error: 'baseUrl and apiKey are required' }, { status: 400 });
    }

    // Build the chat completions URL
    let chatUrl = baseUrl.trim().replace(/\/+$/, '');
    if (!chatUrl.endsWith('/v1')) {
      chatUrl += '/v1';
    }
    chatUrl += '/chat/completions';

    const startMs = Date.now();

    // Send a minimal completion request (max 1 token)
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    const latencyMs = Date.now() - startMs;

    if (response.ok) {
      const data = await response.json();
      const usedModel = data.model || model || '';
      return NextResponse.json({
        valid: true,
        model: usedModel,
        latencyMs,
      });
    }

    // 401/403 = bad key, 404 = bad model but key works, 429 = rate limited but key works
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({
        valid: false,
        error: `Authentication failed (${response.status})`,
        latencyMs,
      });
    }

    // For other errors, key might be valid but model/endpoint wrong
    const text = await response.text().catch(() => '');
    const keyProbablyValid = [404, 400, 422, 429].includes(response.status);

    return NextResponse.json({
      valid: keyProbablyValid,
      model: model || '',
      error: keyProbablyValid
        ? `Key valid but model issue (${response.status})`
        : `API error ${response.status}: ${text.slice(0, 150)}`,
      latencyMs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
