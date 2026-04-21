'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProxyStatusIndicator } from '@/components/dashboard/ProxyStatusIndicator';
import { UsageOverview } from '@/components/dashboard/UsageOverview';
import { CreditsTrend } from '@/components/dashboard/CreditsTrend';
import { UsageChart } from '@/components/Dashboard/UsageChart';
import { CostTracker } from '@/components/Dashboard/CostTracker';
import { RecentRequests } from '@/components/Dashboard/RecentRequests';
import { TopModels } from '@/components/Dashboard/TopModels';
import { AdvancedPanel } from '@/components/configure/AdvancedPanel';
import { Activity, DollarSign, Zap, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from '@/components/error-boundary';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const t = useTranslations('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Detect hydration completion
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only redirect after hydration is complete
    if (isHydrated && !isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
    // Check if user needs onboarding
    if (isAuthenticated && typeof window !== 'undefined') {
      const onboardingDone = localStorage.getItem('hopllm-onboarding-done');
      if (!onboardingDone) {
        setShowOnboarding(true);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading skeleton until hydration completes
  if (!isHydrated || isLoading || !isAuthenticated || !user) {
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
    <>
      <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} />
      <DashboardShell>
      <ErrorBoundary
        errorTitle={t('errorTitle')}
        errorDescription={t('errorDescription')}
        reloadLabel={t('reload')}
      >
        <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-10">{t('title')}</h1>
          <p className="text-neutral-7 mt-1">{t('welcome')}, {user.name || user.email}</p>
        </div>

        {/* Proxy Status */}
        <ProxyStatusIndicator className="inline-flex" />

        {/* Quick Links */}
        <div className="flex gap-4 text-sm">
          <Link href="/docs" className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary/20 transition-colors">
            📖 Docs
          </Link>
          <Link href="/dashboard/stats" className="px-4 py-2 bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 transition-colors">
            📊 Statistics
          </Link>
          <Link href="/configure" className="px-4 py-2 bg-surface-overlay text-neutral-10 rounded-lg hover:bg-surface-raised transition-colors">
            ⚙️ Configure
          </Link>
        </div>

        {/* Layer 1: Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label={t('credits')}
            value={user.credits?.toLocaleString() || '0'}
            icon={Zap}
            format="number"
          />
          <StatCard
            label={t('monthlyRequests')}
            value="--"
            icon={Activity}
            format="number"
          />
          <StatCard
            label={t('monthlySavings')}
            value="--"
            icon={DollarSign}
            format="currency"
            trend={{ value: 12, direction: 'up', label: t('vsLastMonth') }}
          />
          <StatCard
            label={t('monthlyEarnings')}
            value="--"
            icon={TrendingUp}
            format="currency"
          />
        </div>

        {/* Layer 2: Usage Overview & Credits Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UsageOverview userId={user.id} />
          <CreditsTrend userId={user.id} />
        </div>

        {/* Layer 3: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UsageChart userId={user.id} days={7} />
          <CostTracker userId={user.id} />
        </div>

        {/* Layer 4: Recent Requests & Top Models */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentRequests userId={user.id} />
          <TopModels userId={user.id} />
        </div>

        {/* Layer 5: Advanced (collapsible) */}
        <div className="space-y-4">
          <AdvancedPanel
            label={t('keyManagement')}
            apiDiscoveryLabel={t('apiKeys')}
            configImportLabel={t('testPanel')}
          />
        </div>
        </div>
      </ErrorBoundary>
    </DashboardShell>
    </>
  );
}
