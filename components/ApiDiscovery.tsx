'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Download, Loader2, Search, AlertCircle, CheckCircle2, Shield, ShieldCheck, ShieldX } from 'lucide-react';

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

interface VerifyResult {
  valid: boolean;
  model?: string;
  error?: string;
  latencyMs?: number;
}

export function ApiDiscovery() {
  const t = useTranslations('apiDiscovery');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const detectProvider = (url: string): string => {
    if (url.includes('openrouter.ai')) return 'openrouter';
    if (url.includes('dashscope') || url.includes('aliyuncs')) return 'qwen';
    if (url.includes('deepseek')) return 'deepseek';
    if (url.includes('anthropic')) return 'anthropic';
    if (url.includes('api.openai.com')) return 'openai';
    if (url.includes('generativelanguage') || url.includes('google')) return 'google';
    if (url.includes('mistral')) return 'mistral';
    if (url.includes('groq')) return 'groq';
    return 'custom';
  };

  const handleDiscover = async () => {
    if (!baseUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setVerifyResult(null);
    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
      });
      const data = await response.json();
      if (data.error) { setError(data.error); } else { setResult(data); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!baseUrl.trim() || !apiKey.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: result?.models?.[0]?.id || undefined }),
      });
      const data: VerifyResult = await response.json();
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({ valid: false, error: err instanceof Error ? err.message : 'Network error' });
    } finally { setVerifying(false); }
  };

  const handleGenerateConfig = (): string | undefined => {
    if (!result || result.models.length === 0) return undefined;
    const provider = detectProvider(baseUrl);
    const providerName = provider === 'custom' ? 'discovered' : provider;

    const modelEntries = result.models.map(m => {
      const entry: Record<string, unknown> = { id: m.id, name: m.name || m.id, input: ['text'] };
      if (m.context_window) entry.contextWindow = m.context_window;
      if (m.max_tokens) entry.maxTokens = m.max_tokens;
      if (m.pricing) {
        const inputCost = parseFloat(m.pricing.prompt || '0');
        const outputCost = parseFloat(m.pricing.completion || '0');
        entry.cost = (inputCost > 0 || outputCost > 0)
          ? { input: Math.round(inputCost * 1e8) / 1e8, output: Math.round(outputCost * 1e8) / 1e8, cacheRead: 0, cacheWrite: 0 }
          : { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
      }
      return entry;
    });

    const primaryRef = `${providerName}/${result.models[0]!.id}`;
    const fallbackRefs = result.models.slice(1, 4).map(m => `${providerName}/${m.id}`);
    const allRefs = [primaryRef, ...fallbackRefs];
    const allowlist: Record<string, { alias: string }> = {};
    for (const ref of allRefs) {
      const model = result.models.find(m => `${providerName}/${m.id}` === ref);
      allowlist[ref] = { alias: model?.name || ref.split('/').pop() || ref };
    }

    return JSON.stringify({
      models: { mode: 'merge', providers: { [providerName]: { baseUrl: baseUrl.trim().replace(/\/+$/, '').replace(/\/v1$/, ''), apiKey: apiKey.trim(), api: 'openai-completions', models: modelEntries } } },
      agents: { defaults: { model: { primary: primaryRef, fallbacks: fallbackRefs }, models: allowlist } },
    }, null, 2);
  };

  const handleCopy = () => {
    const c = handleGenerateConfig();
    if (c) { navigator.clipboard.writeText(c); alert(t('configCopied')); }
  };

  const handleDownload = () => {
    const c = handleGenerateConfig();
    if (!c) return;
    const blob = new Blob([c], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'openclaw.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('description')}</p>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('baseUrlLabel')}</label>
          <Input placeholder={t('baseUrlPlaceholder')} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('apiKeyLabel')}</label>
          <Input type="password" placeholder={t('apiKeyPlaceholder')} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="mt-1" />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDiscover} disabled={!baseUrl.trim() || loading} className="flex-1">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!loading && <Search className="h-4 w-4 mr-2" />}
            {loading ? t('discovering') : t('discover')}
          </Button>
          <Button variant="outline" onClick={handleVerify} disabled={!baseUrl.trim() || !apiKey.trim() || verifying}>
            {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!verifying && <Shield className="h-4 w-4 mr-2" />}
            {verifying ? t('verifying') : t('verifyKey')}
          </Button>
        </div>
      </div>

      {/* Verify result */}
      {verifyResult && (
        <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${verifyResult.valid ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
          {verifyResult.valid ? <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> : <ShieldX className="h-4 w-4 mt-0.5 shrink-0" />}
          <div>
            <span className="font-medium">{verifyResult.valid ? t('keyValid') : t('keyInvalid')}</span>
            {verifyResult.latencyMs != null && <span className="ml-2 text-xs opacity-70">{verifyResult.latencyMs}ms</span>}
            {verifyResult.model && <div className="text-xs mt-0.5 opacity-70">Model: {verifyResult.model}</div>}
            {verifyResult.error && <div className="text-xs mt-0.5 opacity-70">{verifyResult.error}</div>}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
                  <tr className="border-t"><td colSpan={3} className="p-2 text-center text-muted-foreground">+{result.models.length - 50} more...</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />{t('generateConfig')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />{t('downloadConfig')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
