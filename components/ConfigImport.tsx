'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Upload, Merge, AlertCircle, CheckCircle2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

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

interface ParsedConfig {
  providers: ParsedProvider[];
  primary?: string;
  fallbacks?: string[];
  allowlist: Record<string, { alias?: string }>;
  rawJson: string;
}

export function ConfigImport() {
  const t = useTranslations('configImport');
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState<ParsedConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [mergedJson, setMergedJson] = useState<string | null>(null);

  const parseConfig = () => {
    setError(null);
    setParsed(null);
    setMergedJson(null);

    const text = pasteText.trim();
    if (!text) return;

    try {
      // Try JSON first
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        setError(t('invalidJson'));
        return;
      }

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

      // Extract agents.defaults
      const agents = data.agents as Record<string, unknown> | undefined;
      const defaults = agents?.defaults as Record<string, unknown> | undefined;
      const modelCfg = defaults?.model as Record<string, unknown> | undefined;
      const allowlist = (defaults?.models as Record<string, { alias?: string }>) || {};

      setParsed({
        providers,
        primary: modelCfg?.primary as string | undefined,
        fallbacks: modelCfg?.fallbacks as string[] | undefined,
        allowlist,
        rawJson: text,
      });

      // Auto-expand first provider
      if (providers.length > 0) {
        setExpandedProviders(new Set([providers[0]!.id]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('parseError'));
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

  const handleMergeDownload = () => {
    if (!parsed) return;

    // The parsed config IS the valid OpenClaw config
    // Just clean it up and return
    const config = JSON.parse(parsed.rawJson);
    setMergedJson(JSON.stringify(config, null, 2));
  };

  const copyMerged = async () => {
    if (!mergedJson) return;
    await navigator.clipboard.writeText(mergedJson);
    alert(t('copied'));
  };

  const downloadMerged = () => {
    if (!mergedJson) return;
    const blob = new Blob([mergedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openclaw.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('description')}</p>

      {/* Paste area */}
      <div className="space-y-3">
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono h-32 resize-y"
          placeholder={t('pastePlaceholder')}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <Button onClick={parseConfig} disabled={!pasteText.trim()} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          {t('analyze')}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Parsed result */}
      {parsed && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t('parsedOk', { providers: parsed.providers.length, models: parsed.providers.reduce((s, p) => s + p.models.length, 0) })}</span>
          </div>

          {/* Model selection info */}
          {(parsed.primary || parsed.fallbacks) && (
            <div className="p-3 rounded-md bg-muted/50 text-xs space-y-1">
              {parsed.primary && <div><span className="font-medium">Primary:</span> {parsed.primary}</div>}
              {parsed.fallbacks && parsed.fallbacks.length > 0 && <div><span className="font-medium">Fallbacks:</span> {parsed.fallbacks.join(', ')}</div>}
              <div><span className="font-medium">Allowlist:</span> {Object.keys(parsed.allowlist).length} models</div>
            </div>
          )}

          {/* Provider list */}
          <div className="space-y-1">
            {parsed.providers.map(provider => (
              <div key={provider.id} className="border rounded-md">
                <button
                  className="w-full flex items-center justify-between p-2 text-sm hover:bg-muted/50"
                  onClick={() => toggleProvider(provider.id)}
                >
                  <span className="font-medium">{provider.id}</span>
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
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleMergeDownload}>
              <Merge className="h-4 w-4 mr-2" />
              {t('prepareConfig')}
            </Button>
            <Button variant="outline" size="icon" onClick={() => { setParsed(null); setPasteText(''); setMergedJson(null); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Merged result */}
      {mergedJson && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={copyMerged}>
              📋 {t('copyConfig')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={downloadMerged}>
              💾 {t('downloadConfig')}
            </Button>
          </div>
          <div className="border rounded-md max-h-[200px] overflow-auto">
            <pre className="text-xs p-3 font-mono">{mergedJson}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
