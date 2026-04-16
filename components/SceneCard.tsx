'use client';

import type { Scene } from '@/lib/types';
import { useTranslations } from 'next-intl';

interface SceneCardProps {
  scene: Scene;
  onSelect: (sceneId: string) => void;
}

export function SceneCard({ scene, onSelect }: SceneCardProps) {
  const t = useTranslations('home');

  return (
    <div
      className="relative rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
      onClick={() => onSelect(scene.id)}
    >
      <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-primary via-accent to-secondary opacity-50 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-card rounded-xl p-6 text-center h-full">
        <span className="text-5xl mb-4 block">{scene.icon}</span>
        <h3 className="text-xl font-semibold mb-2 text-foreground">{scene.name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{scene.description}</p>
        <span className="inline-block text-xs font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {t('savingLabelShort')} {scene.estimatedSaving}
        </span>
      </div>
    </div>
  );
}
