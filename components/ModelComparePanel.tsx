'use client';

import { useTranslations } from 'next-intl';
import { useAppStore } from '@/store/use-app-store';
import { ModelLogo } from '@/components/ModelLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SortMode } from '@/lib/types';

const sortModeKeys: SortMode[] = ['costFirst', 'qualityFirst', 'speedFirst'];

function SpeedRating({ rating }: { rating: number }) {
  return <span>{'⚡'.repeat(rating)}</span>;
}

function QualityRating({ rating }: { rating: number }) {
  return <span>{'⭐'.repeat(rating)}</span>;
}

export function ModelComparePanel() {
  const t = useTranslations('modelCompare');
  const sortMode = useAppStore((s) => s.sortMode);
  const setSortMode = useAppStore((s) => s.setSortMode);
  const getSortedModelsForSelectedScene = useAppStore((s) => s.getSortedModelsForSelectedScene);

  const models = getSortedModelsForSelectedScene();

  const sortModeLabels: Record<SortMode, string> = {
    costFirst: t('sortCost'),
    qualityFirst: t('sortQuality'),
    speedFirst: t('sortSpeed'),
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('title')}</h3>

      {/* Sort mode selector */}
      <div className="flex gap-2">
        {sortModeKeys.map((key) => (
          <Button
            key={key}
            variant={sortMode === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortMode(key)}
          >
            {sortModeLabels[key]}
          </Button>
        ))}
      </div>

      {/* Model table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">{t('modelName')}</th>
              <th className="text-left py-2 px-2">{t('speed')}</th>
              <th className="text-left py-2 px-2">{t('quality')}</th>
              <th className="text-left py-2 px-2">{t('costPer1K')}</th>
              <th className="text-left py-2 px-2">{t('reason')}</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id} className="border-b hover:bg-muted/50">
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <ModelLogo provider={model.provider} size="sm" />
                    <span className="font-medium">{model.name}</span>
                  </div>
                </td>
                <td className="py-2 px-2"><SpeedRating rating={model.speedRating} /></td>
                <td className="py-2 px-2"><QualityRating rating={model.qualityRating} /></td>
                <td className="py-2 px-2">
                  <Badge variant="secondary">
                    ${model.costPer1KToken.toFixed(4)}
                  </Badge>
                </td>
                <td className="py-2 px-2 text-muted-foreground text-xs">
                  {model.recommendationReason ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
