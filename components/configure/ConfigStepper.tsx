'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StepConfig {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
}

interface ConfigStepperProps {
  steps: StepConfig[];
  currentStep: number;
  onStepChange: (step: number) => void;
  completedSteps: number[];
}

export function ConfigStepper({ steps, currentStep, onStepChange, completedSteps }: ConfigStepperProps) {
  return (
    <div className="w-full" role="tablist" aria-label="Configuration steps">
      {/* Desktop: horizontal stepper */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = completedSteps.includes(stepNum);
          const isCurrent = currentStep === stepNum;
          const isAccessible = isCompleted || isCurrent || completedSteps.includes(stepNum - 1);
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => isAccessible && onStepChange(stepNum)}
                disabled={!isAccessible}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-fast',
                  isCurrent && 'bg-surface-overlay text-brand-primary',
                  isCompleted && !isCurrent && 'text-semantic-success hover:bg-surface-overlay/50',
                  !isCurrent && !isCompleted && 'text-neutral-7',
                  !isAccessible && 'opacity-50 cursor-not-allowed'
                )}
                role="tab"
                aria-selected={isCurrent}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-fast',
                  isCurrent && 'border-brand-primary bg-brand-primary/10',
                  isCompleted && !isCurrent && 'border-semantic-success bg-semantic-success/10',
                  !isCurrent && !isCompleted && 'border-neutral-6'
                )}>
                  {isCompleted && !isCurrent ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{step.label}</div>
                  {step.description && (
                    <div className="text-xs text-neutral-7">{step.description}</div>
                  )}
                </div>
              </button>
              {index < steps.length - 1 && (
                <div className={cn(
                  'flex-1 h-px mx-2',
                  isCompleted ? 'bg-semantic-success' : 'bg-neutral-6'
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: simplified step indicator */}
      <div className="md:hidden flex items-center justify-between px-4 py-3">
        <span className="text-sm text-neutral-7">
          Step {currentStep} / {steps.length}
        </span>
        <span className="text-sm font-medium text-neutral-10">
          {steps[currentStep - 1]?.label}
        </span>
        <div className="flex gap-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-colors duration-fast',
                index + 1 === currentStep ? 'bg-brand-primary' :
                completedSteps.includes(index + 1) ? 'bg-semantic-success' : 'bg-neutral-6'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
