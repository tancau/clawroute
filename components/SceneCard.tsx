'use client';

import { useTranslations } from 'next-intl';
import type { Scene } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

interface SceneCardProps {
  scene: Scene;
  onSelect: (sceneId: string) => void;
  savingLabel: string;
}

export function SceneCard({ scene, onSelect, savingLabel }: SceneCardProps) {
  const t = useTranslations('scenes');
  const tDesc = useTranslations('sceneDescriptions');

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      onClick={() => onSelect(scene.id)}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <span className="text-4xl mb-3">{scene.icon}</span>
        <h3 className="text-lg font-semibold mb-2">{t(scene.id)}</h3>
        <p className="text-sm text-muted-foreground mb-2">{tDesc(scene.id)}</p>
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          {savingLabel} {scene.estimatedSaving}
        </span>
      </CardContent>
    </Card>
  );
}
