'use client';

import { ModelComparePanel } from '@/components/ModelComparePanel';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/use-app-store';
import { ArrowRight } from 'lucide-react';

interface StepCompareProps {
  nextLabel: string;
  onNext: () => void;
}

export function StepCompare({ nextLabel, onNext }: StepCompareProps) {
  const selectedSceneId = useAppStore((s) => s.selectedSceneId);

  return (
    <div className="space-y-6">
      <ModelComparePanel />
      {selectedSceneId && (
        <div className="flex justify-end">
          <Button onClick={onNext} className="gap-2">
            {nextLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
