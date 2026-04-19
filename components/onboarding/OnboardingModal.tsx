'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Key, Settings, Zap, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Type-safe translation keys
type OnboardingKeys = 'step1Title' | 'step1Desc' | 'step1Button' | 'step2Title' | 'step2Desc' | 'step2Button' | 'step3Title' | 'step3Desc' | 'step3Button';

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { id: 'providers', icon: Settings },
  { id: 'apiKey', icon: Key },
  { id: 'test', icon: Zap },
];

export function OnboardingModal({ open, onOpenChange }: OnboardingModalProps) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);

  // Load completed steps from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hopllm-onboarding');
      if (saved) {
        setCompleted(JSON.parse(saved));
      }
    }
  }, []);

  // Save completed steps
  const markComplete = (stepId: string) => {
    const newCompleted = [...completed, stepId];
    setCompleted(newCompleted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hopllm-onboarding', JSON.stringify(newCompleted));
    }
  };

  const handleNext = () => {
    const step = steps[currentStep];
    if (step) {
      markComplete(step.id);
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Close modal when done
      onOpenChange(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hopllm-onboarding-done', 'true');
      }
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hopllm-onboarding-done', 'true');
    }
  };

  const handleAction = () => {
    const step = steps[currentStep];
    if (!step) return;
    switch (step.id) {
      case 'providers':
        router.push('/dashboard/providers');
        break;
      case 'apiKey':
        router.push('/dashboard/api-key');
        break;
      case 'test':
        router.push('/dashboard');
        break;
    }
    handleNext();
  };

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData?.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="gradient-text text-center">
            {t('welcomeTitle')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('welcomeDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {steps.map((step, idx) => {
            const StepIconLocal = step.icon;
            return (
              <div
                key={step.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  idx === currentStep
                    ? 'bg-gradient-to-br from-brand-primary to-brand-accent text-white'
                    : completed.includes(step.id)
                    ? 'bg-brand-primary/20 text-brand-primary'
                    : 'bg-surface-overlay text-neutral-6'
                }`}
              >
                {completed.includes(step.id) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <StepIconLocal className="h-4 w-4" />
                )}
              </div>
            );
          })}
        </div>

        {/* Current step content */}
        <div className="card-glass p-4 rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 flex items-center justify-center">
              {StepIcon && <StepIcon className="w-5 h-5 text-brand-primary" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {t(`step${currentStep + 1}Title` as OnboardingKeys)}
              </h3>
              <p className="text-xs text-neutral-7">
                {t(`step${currentStep + 1}Desc` as OnboardingKeys)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress status */}
        <div className="flex items-center gap-2 mb-4 text-xs text-neutral-6">
          {completed.includes('providers') && (
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-brand-primary" />
              {t('providersConfigured')}
            </span>
          )}
          {completed.includes('apiKey') && (
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-brand-primary" />
              {t('apiKeyReady')}
            </span>
          )}
          {completed.includes('test') && (
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-brand-primary" />
              {t('firstRequestMade')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <button
            onClick={handleSkip}
            className="text-sm text-neutral-6 hover:text-neutral-7 transition-colors"
          >
            {t('skip')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg border border-border-subtle hover:bg-surface-overlay transition-colors text-sm"
            >
              {currentStep === steps.length - 1 ? t('done') : t('next')}
            </button>
            <button
              onClick={handleAction}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold hover:opacity-90 transition-opacity text-sm"
            >
              {t(`step${currentStep + 1}Button` as OnboardingKeys)}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}