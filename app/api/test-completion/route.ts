import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providers } = body as {
      providers: Array<{
        id: string;
        baseUrl: string;
        apiKey?: string;
        model?: string;
      }>;
    };

    if (!providers || !Array.isArray(providers)) {
      return NextResponse.json({ error: 'providers array required' }, { status: 400 });
    }

    const TEST_PROMPT = 'Respond with exactly one word: yes';
    const MAX_TOKENS = 5;
    const TIMEOUT_MS = 15000;

    const results = await Promise.all(
      providers.map(async (p) => {
        const baseUrl = (p.baseUrl || '').replace(/\/+$/, '');

        if (!p.apiKey) {
          return {
            id: p.id,
            model: p.model || 'unknown',
            status: 'no-key' as const,
            error: 'API key required for completion test',
          };
        }

        const startTime = Date.now();

        try {
          // Build the completion URL
          let completionUrl = `${baseUrl}/chat/completions`;
          if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/')) {
            completionUrl = `${baseUrl}/v1/chat/completions`;
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

          const res = await fetch(completionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${p.apiKey}`,
            },
            body: JSON.stringify({
              model: p.model || undefined,
              messages: [{ role: 'user', content: TEST_PROMPT }],
              max_tokens: MAX_TOKENS,
              temperature: 0,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const latency = Date.now() - startTime;

          if (!res.ok) {
            let errorMsg = `HTTP ${res.status}`;
            try {
              const errData = await res.json();
              errorMsg = errData?.error?.message || errData?.message || errorMsg;
            } catch { /* non-json */ }

            if (res.status === 401 || res.status === 403) {
              return { id: p.id, model: p.model, status: 'auth-failed' as const, latency, httpStatus: res.status, error: errorMsg };
            }
            if (res.status === 429) {
              return { id: p.id, model: p.model, status: 'rate-limited' as const, latency, httpStatus: res.status, error: errorMsg };
            }
            if (res.status === 404) {
              return { id: p.id, model: p.model, status: 'model-not-found' as const, latency, httpStatus: res.status, error: errorMsg };
            }
            return { id: p.id, model: p.model, status: 'error' as const, latency, httpStatus: res.status, error: errorMsg };
          }

          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content?.trim() || '';
          const modelUsed = data?.model || p.model || 'unknown';
          const usage = data?.usage;

          return {
            id: p.id,
            model: modelUsed,
            status: 'working' as const,
            latency,
            response: content.substring(0, 100),
            tokens: usage ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens } : undefined,
          };
        } catch (err) {
          const latency = Date.now() - startTime;
          const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message.includes('timeout'));

          return {
            id: p.id,
            model: p.model || 'unknown',
            status: isTimeout ? ('timeout' as const) : ('offline' as const),
            latency,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
