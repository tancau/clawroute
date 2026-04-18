'use client';

import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

export function ModelSelector() {
  const t = useTranslations('modelSelector');
  const selection = useAppStore((s) => s.selection);
  const setPrimaryModel = useAppStore((s) => s.setPrimaryModel);
  const addFallbackModel = useAppStore((s) => s.addFallbackModel);
  const removeFallbackModel = useAppStore((s) => s.removeFallbackModel);
  const reorderFallbacks = useAppStore((s) => s.reorderFallbacks);
  const getModelsForSelectedScene = useAppStore((s) => s.getModelsForSelectedScene);

  const candidateModels = getModelsForSelectedScene();

  // Models available for fallback (not already primary or in fallbacks)
  const usedModelIds = new Set([selection.primaryModelId, ...selection.fallbackModelIds]);
  const availableForFallback = candidateModels.filter(m => !usedModelIds.has(m.id));

  const handleMoveFallbackUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...selection.fallbackModelIds];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index]!, newOrder[index - 1]!];
    reorderFallbacks(newOrder);
  };

  const handleMoveFallbackDown = (index: number) => {
    if (index >= selection.fallbackModelIds.length - 1) return;
    const newOrder = [...selection.fallbackModelIds];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1]!, newOrder[index]!];
    reorderFallbacks(newOrder);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('title')}</h3>

      {/* Primary Model */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-10">{t('primaryLabel')}</label>
        <p className="text-xs text-neutral-7">{t('primaryExplanation')}</p>
        <select
          value={selection.primaryModelId}
          onChange={(e) => setPrimaryModel(e.target.value)}
          className="w-full rounded-md border border-border-default bg-surface-overlay px-3 py-2.5 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
        >
          <option value="">{t('selectPrimary')}</option>
          {candidateModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — ${m.costPer1KToken.toFixed(4)}/1K tokens
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-7">{t('primaryHint')}</p>
      </div>

      {/* Fallback Models */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-10">{t('fallbackLabel')}</label>
        <p className="text-xs text-neutral-7">{t('fallbackExplanation')}</p>
        <div className="space-y-1">
          {selection.fallbackModelIds.map((modelId, index) => {
            const model = candidateModels.find(m => m.id === modelId);
            return (
              <div key={modelId} className="flex items-center gap-1 rounded-md border border-border-default bg-surface-overlay px-3 py-2 text-sm">
                <span className="text-xs text-neutral-7 mr-1 font-mono">{index + 1}.</span>
                <span className="flex-1">{model?.name ?? modelId}</span>
                <span className="text-xs text-neutral-7">${model?.costPer1KToken.toFixed(4) ?? '?'}/1K</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveFallbackUp(index)} disabled={index === 0}>
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveFallbackDown(index)} disabled={index === selection.fallbackModelIds.length - 1}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFallbackModel(modelId)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
        {availableForFallback.length > 0 && (
          <div className="flex gap-2">
            <select
              id="fallback-add-select"
              defaultValue=""
              className="flex-1 rounded-md border border-border-default bg-surface-overlay px-3 py-2.5 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
              onChange={(e) => {
                if (e.target.value) {
                  addFallbackModel(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="">{t('addFallback')}</option>
              {availableForFallback.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — ${m.costPer1KToken.toFixed(4)}/1K tokens
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="text-xs text-neutral-7">{t('fallbackHint')}</p>
      </div>
    </div>
  );
}
