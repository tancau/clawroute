'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Heart, Activity, AlertCircle, CheckCircle2, Trash2, ChevronDown, ChevronRight, AlertTriangle, Info, Loader2, Wifi, WifiOff, Shield, Clock, MessageSquare } from 'lucide-react';
import { diagnoseConfig, HealthIssue, HealthReport } from '@/lib/config-doctor';

interface ParsedProvider {
  id: string;
  baseUrl: string;
  apiKey: string;
  api: string;
  models: Array<{
    id: string;
    name: string;
    input?: string[];
    contextWindow?: number;
    maxTokens?: number;
  }>;
}

interface PingResult {
  id: string;
  status: 'online' | 'auth-required' | 'rate-limited' | 'degraded' | 'timeout' | 'offline';
  latency: number;
  modelCount?: number;
  httpStatus?: number;
  hint?: string;
  error?: string;
}

interface CompletionResult {
  id: string;
  model: string;
  status: 'working' | 'auth-failed' | 'rate-limited' | 'model-not-found' | 'error' | 'timeout' | 'offline' | 'no-key';
  latency?: number;
  response?: string;
  tokens?: { prompt: number; completion: number; total: number };
  httpStatus?: number;
  error?: string;
}

export function ConfigImport() {
  const t = useTranslations('configImport');
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState<ParsedProvider[] | null>(null);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [pingResults, setPingResults] = useState<PingResult[] | null>(null);
  const [pinging, setPinging] = useState(false);
  const [completionResults, setCompletionResults] = useState<CompletionResult[] | null>(null);
  const [testingCompletion, setTestingCompletion] = useState(false);

  const parseConfig = () => {
    setError(null);
    setParsed(null);
    setReport(null);
    setPingResults(null);
    setCompletionResults(null);

    const text = pasteText.trim();
    if (!text) return;

    try {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        setError(t('invalidJson'));
        return;
      }

      const healthReport = diagnoseConfig(data);
      setReport(healthReport);

      const providers: ParsedProvider[] = [];
      const modelsSection = data.models as Record<string, unknown> | undefined;

      if (modelsSection?.providers && typeof modelsSection.providers === 'object') {
        for (const [pid, pdata] of Object.entries(modelsSection.providers as Record<string, Record<string, unknown>>)) {
          const models = Array.isArray(pdata.models) ? pdata.models : [];
          providers.push({
            id: pid,
            baseUrl: (pdata.baseUrl as string) || '',
            apiKey: (pdata.apiKey as string) || '',
            api: (pdata.api as string) || 'openai-completions',
            models: models.map((m: Record<string, unknown>) => ({
              id: (m.id as string) || '',
              name: (m.name as string) || (m.id as string) || '',
              input: m.input as string[] | undefined,
              contextWindow: m.contextWindow as number | undefined,
              maxTokens: m.maxTokens as number | undefined,
            })),
          });
        }
      }

      setParsed(providers);
      if (providers.length > 0) {
        setExpandedProviders(new Set([providers[0]!.id]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parseError'));
    }
  };

  const handlePing = async () => {
    if (!parsed || parsed.length === 0) return;
    setPinging(true);
    setPingResults(null);

    try {
      const response = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providers: parsed.map(p => ({
            id: p.id,
            baseUrl: p.baseUrl,
            apiKey: p.apiKey || undefined,
          })),
        }),
      });
      const data = await response.json();
      setPingResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ping failed');
    } finally {
      setPinging(false);
    }
  };

  const handleCompletionTest = async () => {
    if (!parsed || parsed.length === 0) return;
    setTestingCompletion(true);
    setCompletionResults(null);

    try {
      // Build test list: one model per provider (first model)
      const testProviders = parsed
        .filter(p => p.apiKey && p.models.length > 0)
        .map(p => ({
          id: p.id,
          baseUrl: p.baseUrl,
          apiKey: p.apiKey,
          model: p.models[0]!.id,
        }));

      if (testProviders.length === 0) {
        setError(t('noKeysForTest'));
        setTestingCompletion(false);
        return;
      }

      const response = await fetch('/api/test-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers: testProviders }),
      });
      const data = await response.json();
      setCompletionResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestingCompletion(false);
    }
  };

  const toggleProvider = (id: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyFixed = async () => {
    await navigator.clipboard.writeText(pasteText);
    alert(t('copied'));
  };

  const downloadFixed = () => {
    const blob = new Blob([pasteText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hopllm.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityIcon = (severity: HealthIssue['severity']) => {
    switch (severity) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
      case 'info': return <Info className="h-4 w-4 text-blue-400 shrink-0" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return t('scoreGreat');
    if (score >= 70) return t('scoreGood');
    if (score >= 50) return t('scoreFair');
    return t('scorePoor');
  };

  const getPingStatusIcon = (status: PingResult['status']) => {
    switch (status) {
      case 'online': return <Wifi className="h-3.5 w-3.5 text-green-500" />;
      case 'auth-required': return <Shield className="h-3.5 w-3.5 text-yellow-500" />;
      case 'rate-limited': return <Clock className="h-3.5 w-3.5 text-orange-500" />;
      case 'degraded': return <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />;
      case 'timeout': return <Clock className="h-3.5 w-3.5 text-red-400" />;
      case 'offline': return <WifiOff className="h-3.5 w-3.5 text-red-500" />;
    }
  };

  const getPingStatusLabel = (r: PingResult) => {
    switch (r.status) {
      case 'online': return `${r.modelCount} models · ${r.latency}ms`;
      case 'auth-required': return t('pingAuth');
      case 'rate-limited': return t('pingRateLimit');
      case 'degraded': return `HTTP ${r.httpStatus} · ${r.latency}ms`;
      case 'timeout': return t('pingTimeout');
      case 'offline': return t('pingOffline');
    }
  };

  const getPingBg = (status: PingResult['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500/5 border-green-500/20';
      case 'auth-required': return 'bg-yellow-500/5 border-yellow-500/20';
      case 'rate-limited': return 'bg-orange-500/5 border-orange-500/20';
      case 'degraded': return 'bg-yellow-500/5 border-yellow-500/20';
      case 'timeout': return 'bg-red-500/5 border-red-500/20';
      case 'offline': return 'bg-red-500/5 border-red-500/20';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('description')}</p>

      <div className="space-y-3">
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono h-32 resize-y"
          placeholder={t('pastePlaceholder')}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <Button onClick={parseConfig} disabled={!pasteText.trim()} className="w-full">
          <Heart className="h-4 w-4 mr-2" />
          {t('analyze')}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Health Report */}
      {report && (
        <div className="space-y-3">
          {/* Score */}
          <div className="flex items-center gap-3 p-4 rounded-lg border">
            <div className={`text-3xl font-bold ${getScoreColor(report.score)}`}>
              {report.score}
            </div>
            <div>
              <div className="font-medium">{getScoreLabel(report.score)}</div>
              <div className="text-xs text-muted-foreground">
                {report.stats.providers} providers · {report.stats.models} models · {report.stats.fallbackCount} fallbacks
              </div>
            </div>
          </div>

          {/* Issues */}
          {report.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('issuesFound', { count: report.issues.length })}</h4>
              {report.issues.map((issue, i) => (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-md text-xs ${
                  issue.severity === 'error' ? 'bg-red-500/10 text-red-700' :
                  issue.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-700' :
                  'bg-blue-500/10 text-blue-600'
                }`}>
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{issue.message}</div>
                    <div className="opacity-70 mt-0.5">{issue.detail}</div>
                    {issue.fix && <div className="opacity-60 mt-0.5 italic">💡 {issue.fix}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {report.issues.length === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-700 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{t('allGood')}</span>
            </div>
          )}

          {/* Availability Test */}
          {parsed && parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t('availabilityTest')}</h4>
                <Button variant="outline" size="sm" onClick={handlePing} disabled={pinging}>
                  {pinging && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {!pinging && <Activity className="h-3.5 w-3.5 mr-1.5" />}
                  {pinging ? t('pinging') : t('testAvailability')}
                </Button>
              </div>

              {pingResults && (
                <div className="space-y-1.5">
                  {pingResults.map((r) => (
                    <div key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs ${getPingBg(r.status)}`}>
                      {getPingStatusIcon(r.status)}
                      <span className="font-medium">{r.id}</span>
                      <span className="text-muted-foreground">{getPingStatusLabel(r)}</span>
                      {r.hint && <span className="opacity-60 ml-auto">{r.hint}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completion Test - actually test if models can answer */}
          {parsed && parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t('completionTest')}</h4>
                <Button variant="outline" size="sm" onClick={handleCompletionTest} disabled={testingCompletion}>
                  {testingCompletion && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {!testingCompletion && <MessageSquare className="h-3.5 w-3.5 mr-1.5" />}
                  {testingCompletion ? t('testingModel') : t('testModel')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('completionTestDesc')}</p>

              {completionResults && (
                <div className="space-y-1.5">
                  {completionResults.map((r) => {
                    const isWorking = r.status === 'working';
                    return (
                      <div key={r.id} className={`px-3 py-2.5 rounded-md border text-xs ${
                        isWorking ? 'bg-green-500/5 border-green-500/20' :
                        r.status === 'no-key' ? 'bg-gray-500/5 border-gray-500/20' :
                        'bg-red-500/5 border-red-500/20'
                      }`}>
                        <div className="flex items-center gap-2">
                          {isWorking ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> :
                           r.status === 'no-key' ? <Info className="h-3.5 w-3.5 text-gray-400" /> :
                           <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                          <span className="font-medium">{r.id}/{r.model}</span>
                          {isWorking && <span className="text-green-600 ml-auto">✅ {t('modelCanAnswer')}</span>}
                          {!isWorking && r.status !== 'no-key' && <span className="text-red-500 ml-auto">❌ {r.error || r.status}</span>}
                          {r.status === 'no-key' && <span className="text-gray-400 ml-auto">{t('noKey')}</span>}
                        </div>
                        {isWorking && (
                          <div className="mt-1.5 pl-5.5 space-y-0.5">
                            <div className="flex gap-3 text-muted-foreground">
                              <span>⏱ {r.latency}ms</span>
                              {r.tokens && <span>🔤 {r.tokens.total} tokens</span>}
                            </div>
                            <div className="font-mono bg-muted/30 rounded px-2 py-1 mt-1">
                              💬 &ldquo;{r.response}&rdquo;
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Provider list */}
          {parsed && parsed.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">{t('providers')}</h4>
              {parsed.map(provider => {
                const ping = pingResults?.find(p => p.id === provider.id);
                return (
                  <div key={provider.id} className="border rounded-md">
                    <button
                      className="w-full flex items-center justify-between p-2 text-sm hover:bg-muted/50"
                      onClick={() => toggleProvider(provider.id)}
                    >
                      <div className="flex items-center gap-2">
                        {ping ? getPingStatusIcon(ping.status) : null}
                        <span className="font-medium">{provider.id}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {provider.models.length} models
                        {provider.apiKey ? ' 🔑' : ' ⚠️ no key'}
                      </span>
                      {expandedProviders.has(provider.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {expandedProviders.has(provider.id) && (
                      <div className="border-t px-2 pb-2">
                        <div className="text-xs text-muted-foreground p-1">{provider.baseUrl}</div>
                        {provider.models.map(m => (
                          <div key={m.id} className="flex items-center justify-between text-xs px-1 py-0.5 hover:bg-muted/30 rounded">
                            <span className="font-mono">{provider.id}/{m.id}</span>
                            <span className="text-muted-foreground">
                              {m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={copyFixed}>
              📋 {t('copyConfig')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={downloadFixed}>
              💾 {t('downloadConfig')}
            </Button>
            <Button variant="outline" size="icon" onClick={() => { setParsed(null); setPasteText(''); setReport(null); setPingResults(null); setCompletionResults(null); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
