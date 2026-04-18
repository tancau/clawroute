'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface StepSceneProps {
  switchSceneLabel: string;
  nextLabel: string;
  onNext: () => void;
}

export function StepScene({ switchSceneLabel, nextLabel, onNext }: StepSceneProps) {
  const selectedSceneId = useAppStore((s) => s.selectedSceneId);
  const scenes = useAppStore((s) => s.scenes);
  const selectScene = useAppStore((s) => s.selectScene);
  const currentScene = scenes.find((s) => s.id === selectedSceneId);

  return (
    <div className="space-y-6">
      {currentScene ? (
        <div className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-surface-overlay/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentScene.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-neutral-10">{currentScene.name}</h3>
              <p className="text-sm text-neutral-7">{currentScene.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-brand-primary hover:underline">
              {switchSceneLabel}
            </Link>
            <Button onClick={onNext} className="gap-2">
              {nextLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => {
                selectScene(scene.id);
                onNext();
              }}
              className="p-4 rounded-xl border border-border-subtle bg-surface-overlay/50 hover:border-brand-primary/30 hover:shadow-glow-primary transition-all duration-fast text-left"
            >
              <span className="text-2xl mb-2 block">{scene.icon}</span>
              <h3 className="text-sm font-semibold text-neutral-10 mb-1">{scene.name}</h3>
              <p className="text-xs text-neutral-7 line-clamp-2">{scene.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
