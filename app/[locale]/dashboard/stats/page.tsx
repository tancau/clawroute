'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RequestTrendChart } from '@/components/dashboard/charts/RequestTrendChart';
import { SavingsChart } from '@/components/dashboard/charts/SavingsChart';
import { ModelDistributionChart } from '@/components/dashboard/charts/ModelDistributionChart';
import { IntentClassificationChart } from '@/components/dashboard/charts/IntentClassificationChart';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from '@/components/error-boundary';

export default function StatsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const t = useTranslations('dashboard');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <DashboardShell>
      <ErrorBoundary
        errorTitle={t('errorTitle')}
        errorDescription={t('errorDescription')}
        reloadLabel={t('reload')}
      >
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-neutral-10">{t('usageOverview')}</h1>
            <p className="text-neutral-7 mt-1">
              {t('usageTrendDays', { days: 30 })} · {t('savingsDetail')}
            </p>
          </div>

          {/* Request Trend */}
          <RequestTrendChart userId={user.id} />

          {/* Savings & Model Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SavingsChart userId={user.id} />
            <ModelDistributionChart userId={user.id} />
          </div>

          {/* Intent Classification */}
          <IntentClassificationChart userId={user.id} />

          {/* Additional insights */}
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-10 mb-4">
              💡 {t('optimizationGoal')}
            </h3>
            <p className="text-neutral-7 text-sm mb-6">
              {t('optimizationGoalDesc')}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-surface-overlay rounded-lg hover:bg-brand-primary/10 transition-colors cursor-pointer group">
                <div className="text-lg font-bold text-neutral-10 group-hover:text-brand-primary">
                  {t('costFirst')}
                </div>
                <div className="text-sm text-neutral-7">
                  {t('costFirstDesc')}
                </div>
              </div>
              <div className="p-4 bg-surface-overlay rounded-lg hover:bg-brand-accent/10 transition-colors cursor-pointer group">
                <div className="text-lg font-bold text-neutral-10 group-hover:text-brand-accent">
                  {t('qualityFirst')}
                </div>
                <div className="text-sm text-neutral-7">
                  {t('qualityFirstDesc')}
                </div>
              </div>
              <div className="p-4 bg-surface-overlay rounded-lg hover:bg-brand-secondary/10 transition-colors cursor-pointer group">
                <div className="text-lg font-bold text-neutral-10 group-hover:text-brand-secondary">
                  {t('speedFirst')}
                </div>
                <div className="text-sm text-neutral-7">
                  {t('speedFirstDesc')}
                </div>
              </div>
              <div className="p-4 bg-surface-overlay rounded-lg hover:bg-neutral-10/10 transition-colors cursor-pointer group">
                <div className="text-lg font-bold text-neutral-10 group-hover:text-brand-primary">
                  {t('balanced')}
                </div>
                <div className="text-sm text-neutral-7">
                  {t('balancedDesc')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </DashboardShell>
  );
}