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
        <label className="text-sm font-medium text-muted-foreground">{t('primaryLabel')}</label>
        <select
          value={selection.primaryModelId}
          onChange={(e) => setPrimaryModel(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('selectPrimary')}</option>
          {candidateModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — ${m.costPer1KToken.toFixed(4)}/1K
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{t('primaryHint')}</p>
      </div>

      {/* Fallback Models */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">{t('fallbackLabel')}</label>
        <div className="space-y-1">
          {selection.fallbackModelIds.map((modelId, index) => {
            const model = candidateModels.find(m => m.id === modelId);
            return (
              <div key={modelId} className="flex items-center gap-1 rounded-md border bg-background px-3 py-2 text-sm">
                <span className="text-xs text-muted-foreground mr-1">{index + 1}.</span>
                <span className="flex-1">{model?.name ?? modelId}</span>
                <span className="text-xs text-muted-foreground">${model?.costPer1KToken.toFixed(4) ?? '?'}/1K</span>
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
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
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
                  {m.name} — ${m.costPer1KToken.toFixed(4)}/1K
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t('fallbackHint')}</p>
      </div>
    </div>
  );
}
