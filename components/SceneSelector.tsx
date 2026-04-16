'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/use-app-store';
import { SceneCard } from '@/components/SceneCard';

export function SceneSelector() {
  const router = useRouter();
  const t = useTranslations('home');
  const scenes = useAppStore((s) => s.scenes);
  const selectScene = useAppStore((s) => s.selectScene);

  const handleSelect = (sceneId: string) => {
    selectScene(sceneId);
    router.push(`/configure?scene=${sceneId}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
      {scenes.map((scene) => (
        <SceneCard 
          key={scene.id} 
          scene={scene} 
          onSelect={handleSelect}
          savingLabel={t('savingLabel')}
        />
      ))}
    </div>
  );
}
