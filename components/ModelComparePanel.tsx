'use client';

import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SortMode } from '@/lib/types';

const sortModes: { key: SortMode; label: string }[] = [
  { key: 'costFirst', label: '成本优先' },
  { key: 'qualityFirst', label: '质量优先' },
  { key: 'speedFirst', label: '速度优先' },
];

function SpeedRating({ rating }: { rating: number }) {
  return <span>{'⚡'.repeat(rating)}</span>;
}

function QualityRating({ rating }: { rating: number }) {
  return <span>{'⭐'.repeat(rating)}</span>;
}

export function ModelComparePanel() {
  const sortMode = useAppStore((s) => s.sortMode);
  const setSortMode = useAppStore((s) => s.setSortMode);
  const getSortedModelsForSelectedScene = useAppStore((s) => s.getSortedModelsForSelectedScene);

  const models = getSortedModelsForSelectedScene();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">模型比较</h3>

      {/* Sort mode selector */}
      <div className="flex gap-2">
        {sortModes.map(({ key, label }) => (
          <Button
            key={key}
            variant={sortMode === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortMode(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Model table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">模型</th>
              <th className="text-left py-2 px-2">速度</th>
              <th className="text-left py-2 px-2">质量</th>
              <th className="text-left py-2 px-2">成本/1K token</th>
              <th className="text-left py-2 px-2">推荐理由</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id} className="border-b hover:bg-muted/50">
                <td className="py-2 px-2 font-medium">{model.name}</td>
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
