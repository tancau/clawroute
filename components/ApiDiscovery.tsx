'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Download, Loader2, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DiscoveredModel {
  id: string;
  name: string;
  owned_by: string;
  context_window: number | null;
  max_tokens: number | null;
  pricing: { prompt: string; completion: string } | null;
}

interface DiscoverResult {
  models: DiscoveredModel[];
  count: number;
  error?: string;
}

export function ApiDiscovery() {
  const t = useTranslations('apiDiscovery');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Provider name detection
  const detectProvider = (url: string): string => {
    if (url.includes('openrouter.ai')) return 'openrouter';
    if (url.includes('dashscope') || url.includes('aliyuncs')) return 'qwen';
    if (url.includes('deepseek')) return 'deepseek';
    if (url.includes('anthropic')) return 'anthropic';
    if (url.includes('api.openai.com')) return 'openai';
    if (url.includes('generativelanguage') || url.includes('google')) return 'google';
    if (url.includes('mistral')) return 'mistral';
    if (url.includes('groq')) return 'groq';
    if (url.includes('together.ai') || url.includes('together')) return 'together';
    if (url.includes('fireworks')) return 'fireworks';
    if (url.includes('open-adapt') || url.includes('novita')) return 'novita';
    return 'custom';
  };

  const handleDiscover = async () => {
    if (!baseUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateConfig = () => {
    if (!result || result.models.length === 0) return;

    const provider = detectProvider(baseUrl);
    const providerName = provider === 'custom' ? 'discovered' : provider;

    // Generate model entries
    const modelEntries = result.models.map(m => {
      const entry: Record<string, unknown> = {
        id: m.id,
        name: m.name || m.id,
        input: ['text'],
      };
      if (m.context_window) entry.contextWindow = m.context_window;
      if (m.max_tokens) entry.maxTokens = m.max_tokens;

      // OpenRouter pricing
      if (m.pricing) {
        const inputCost = parseFloat(m.pricing.prompt || '0');
        const outputCost = parseFloat(m.pricing.completion || '0');
        if (inputCost > 0 || outputCost > 0) {
          entry.cost = {
            input: Math.round(inputCost * 1e8) / 1e8,
            output: Math.round(outputCost * 1e8) / 1e8,
            cacheRead: 0,
            cacheWrite: 0,
          };
        } else {
          entry.cost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
        }
      }
      return entry;
    });

    // Pick primary (first model) and fallbacks (next 3)
    const primaryRef = `${providerName}/${result.models[0]!.id}`;
    const fallbackRefs = result.models.slice(1, 4).map(m => `${providerName}/${m.id}`);

    // Build allowlist
    const allRefs = [primaryRef, ...fallbackRefs];
    const allowlist: Record<string, { alias: string }> = {};
    for (const ref of allRefs) {
      const model = result.models.find(m => `${providerName}/${m.id}` === ref);
      allowlist[ref] = { alias: model?.name || ref.split('/').pop() || ref };
    }

    const config = {
      models: {
        mode: 'merge',
        providers: {
          [providerName]: {
            baseUrl: baseUrl.trim().replace(/\/+$/, '').replace(/\/v1$/, ''),
            apiKey: apiKey.trim(),
            api: 'openai-completions',
            models: modelEntries,
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: primaryRef,
            fallbacks: fallbackRefs,
          },
          models: allowlist,
        },
      },
    };

    return JSON.stringify(config, null, 2);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('description')}</p>

      {/* Input fields */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('baseUrlLabel')}</label>
          <Input
            placeholder={t('baseUrlPlaceholder')}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('apiKeyLabel')}</label>
          <Input
            type="password"
            placeholder={t('apiKeyPlaceholder')}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button
          onClick={handleDiscover}
          disabled={!baseUrl.trim() || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('discovering')}
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              {t('discover')}
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && result.models.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t('foundModels', { count: result.count })}</span>
          </div>

          <div className="border rounded-md max-h-[200px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2">{t('modelId')}</th>
                  <th className="text-left p-2">{t('owner')}</th>
                  <th className="text-left p-2">{t('context')}</th>
                </tr>
              </thead>
              <tbody>
                {result.models.slice(0, 50).map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{m.id}</td>
                    <td className="p-2">{m.owned_by}</td>
                    <td className="p-2">{m.context_window ? `${(m.context_window / 1000).toFixed(0)}K` : '-'}</td>
                  </tr>
                ))}
                {result.models.length > 50 && (
                  <tr className="border-t">
                    <td colSpan={3} className="p-2 text-center text-muted-foreground">
                      +{result.models.length - 50} more...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const config = handleGenerateConfig();
              if (config) {
                navigator.clipboard.writeText(config);
                alert(t('configCopied'));
              }
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            {t('generateConfig')}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const config = handleGenerateConfig();
              if (config) {
                const blob = new Blob([config], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'openclaw.json';
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('downloadConfig')}
          </Button>
        </div>
      )}
    </div>
  );
}
