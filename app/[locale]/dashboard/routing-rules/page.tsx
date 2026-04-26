'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RoutingRulesEditor } from '@/app/[locale]/dashboard/RoutingRulesEditor';
import { Skeleton } from '@/components/ui/skeleton';

export default function RoutingRulesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useUserStore();
  const t = useTranslations('dashboard');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router, isHydrated]);

  if (!isHydrated || authLoading || !isAuthenticated) {
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-10">
            {t('routingRules') || 'Routing Rules'}
          </h1>
          <p className="text-neutral-7 mt-1">
            {t('routingRulesDesc') || 'Manage intent routing rules and priorities'}
          </p>
        </div>

        {/* Routing Rules Editor */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <RoutingRulesEditor />
        </div>
      </div>
    </DashboardShell>
  );
}
