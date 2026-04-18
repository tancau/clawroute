'use client';

import { ConfigPreview } from '@/components/ConfigPreview';
import { ErrorBoundary } from '@/components/error-boundary';

interface StepPreviewProps {
  errorTitle: string;
  errorDescription: string;
  reloadLabel: string;
}

export function StepPreview({ errorTitle, errorDescription, reloadLabel }: StepPreviewProps) {
  return (
    <div className="space-y-6">
      <ErrorBoundary errorTitle={errorTitle} errorDescription={errorDescription} reloadLabel={reloadLabel}>
        <ConfigPreview />
      </ErrorBoundary>
    </div>
  );
}
