import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providers } = body as {
      providers: Array<{
        id: string;
        baseUrl: string;
        apiKey?: string;
      }>;
    };

    if (!providers || !Array.isArray(providers)) {
      return NextResponse.json({ error: 'providers array required' }, { status: 400 });
    }

    const results = await Promise.all(
      providers.map(async (p) => {
        const baseUrl = (p.baseUrl || '').replace(/\/+$/, '');
        const startTime = Date.now();

        try {
          // Try /v1/models first (lightweight, works with or without auth)
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (p.apiKey) {
            headers['Authorization'] = `Bearer ${p.apiKey}`;
          }

          let modelsUrl = `${baseUrl}/models`;
          if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/')) {
            modelsUrl = `${baseUrl}/v1/models`;
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          const res = await fetch(modelsUrl, {
            method: 'GET',
            headers,
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const latency = Date.now() - startTime;

          if (res.ok) {
            let modelCount = 0;
            try {
              const data = await res.json();
              modelCount = Array.isArray(data?.data) ? data.data.length : 0;
            } catch { /* non-json response, still ok */ }

            return {
              id: p.id,
              status: 'online' as const,
              latency,
              modelCount,
              httpStatus: res.status,
            };
          }

          if (res.status === 401 || res.status === 403) {
            return {
              id: p.id,
              status: 'auth-required' as const,
              latency,
              httpStatus: res.status,
              hint: 'Endpoint is up but requires valid API key',
            };
          }

          if (res.status === 429) {
            return {
              id: p.id,
              status: 'rate-limited' as const,
              latency,
              httpStatus: res.status,
              hint: 'Online but rate limited',
            };
          }

          return {
            id: p.id,
            status: 'degraded' as const,
            latency,
            httpStatus: res.status,
            hint: `HTTP ${res.status}`,
          };
        } catch (err) {
          const latency = Date.now() - startTime;
          const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message.includes('timeout'));

          return {
            id: p.id,
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
