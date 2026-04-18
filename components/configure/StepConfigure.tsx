'use client';

import { ModelSelector } from '@/components/ModelSelector';
import { TemplateSelector } from '@/components/TemplateSelector';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';

interface StepConfigureProps {
  errorTitle: string;
  errorDescription: string;
  reloadLabel: string;
  nextLabel: string;
  onNext: () => void;
}

export function StepConfigure({ errorTitle, errorDescription, reloadLabel, nextLabel, onNext }: StepConfigureProps) {
  return (
    <div className="space-y-6">
      <TemplateSelector />
      <ErrorBoundary errorTitle={errorTitle} errorDescription={errorDescription} reloadLabel={reloadLabel}>
        <ModelSelector />
      </ErrorBoundary>
      <div className="flex justify-end">
        <Button onClick={onNext} className="gap-2">
          {nextLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
