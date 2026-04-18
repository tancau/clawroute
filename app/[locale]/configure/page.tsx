'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/error-boundary';
import { ConfigStepper } from '@/components/configure/ConfigStepper';
import { StepScene } from '@/components/configure/StepScene';
import { StepCompare } from '@/components/configure/StepCompare';
import { StepConfigure } from '@/components/configure/StepConfigure';
import { StepPreview } from '@/components/configure/StepPreview';
import { AdvancedPanel } from '@/components/configure/AdvancedPanel';
import { Layers, GitCompareArrows, Settings, FileCode } from 'lucide-react';

const stepConfigs = [
  { id: 'scene', label: 'Scene', icon: Layers },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows },
  { id: 'configure', label: 'Configure', icon: Settings },
  { id: 'preview', label: 'Export', icon: FileCode },
];

function ConfigureContent() {
  const t = useTranslations('configure');
  const tError = useTranslations('errorBoundary');
  const searchParams = useSearchParams();
  const sceneId = searchParams.get('scene');
  const selectedSceneId = useAppStore((s) => s.selectedSceneId);
  const selectScene = useAppStore((s) => s.selectScene);
  const scenes = useAppStore((s) => s.scenes);
  const configStep = useAppStore((s) => s.configStep);
  const setConfigStep = useAppStore((s) => s.setConfigStep);
  const completedSteps = useAppStore((s) => s.completedSteps);
  const markStepCompleted = useAppStore((s) => s.markStepCompleted);

  useEffect(() => {
    if (sceneId && sceneId !== selectedSceneId) {
      selectScene(sceneId);
      // If scene is pre-selected from homepage, skip to step 2
      setConfigStep(2);
    }
  }, [sceneId, selectedSceneId, selectScene, setConfigStep]);

  const currentScene = scenes.find((s) => s.id === (selectedSceneId ?? sceneId));

  const handleNext = () => {
    markStepCompleted(configStep);
    if (configStep < 4) {
      setConfigStep(configStep + 1);
    }
  };

  if (!currentScene) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-7">{t('noScene')}</p>
        <Link href="/">
          <Button variant="outline">{t('goHome')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Stepper */}
      <div className="mb-8">
        <ConfigStepper
          steps={stepConfigs}
          currentStep={configStep}
          onStepChange={setConfigStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Step Content */}
      <div className="max-w-5xl mx-auto mb-8">
        {configStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-10 mb-1">{t('step1Title')}</h2>
              <p className="text-sm text-neutral-7">{t('step1Desc')}</p>
            </div>
            <StepScene
              switchSceneLabel={t('switchScene')}
              nextLabel={t('next') || 'Next'}
              onNext={handleNext}
            />
          </div>
        )}
        {configStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-10 mb-1">{t('step2Title')}</h2>
              <p className="text-sm text-neutral-7">{t('step2Desc')}</p>
            </div>
            <StepCompare
              nextLabel={t('next') || 'Next'}
              onNext={handleNext}
            />
          </div>
        )}
        {configStep === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-10 mb-1">{t('step3Title')}</h2>
              <p className="text-sm text-neutral-7">{t('step3Desc')}</p>
            </div>
            <StepConfigure
              errorTitle={tError('title')}
              errorDescription={tError('description')}
              reloadLabel={tError('reload')}
              nextLabel={t('next') || 'Next'}
              onNext={handleNext}
            />
          </div>
        )}
        {configStep === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-10 mb-1">{t('step4Title')}</h2>
              <p className="text-sm text-neutral-7">{t('step4Desc')}</p>
            </div>
            <StepPreview
              errorTitle={tError('title')}
              errorDescription={tError('description')}
              reloadLabel={tError('reload')}
            />
          </div>
        )}
      </div>

      {/* Advanced Tools */}
      <div className="max-w-5xl mx-auto">
        <AdvancedPanel
          label={t('advancedTools') || 'Advanced Tools'}
          apiDiscoveryLabel={t('apiDiscovery') || 'API Discovery'}
          configImportLabel={t('configImport') || 'Config Import'}
        />
      </div>
    </div>
  );
}

export default function ConfigurePage() {
  const t = useTranslations('configure');
  const tError = useTranslations('errorBoundary');

  return (
    <ErrorBoundary errorTitle={tError('title')} errorDescription={tError('description')} reloadLabel={tError('reload')}>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-neutral-7">{t('loading')}</div>}>
        <ConfigureContent />
      </Suspense>
    </ErrorBoundary>
  );
}
