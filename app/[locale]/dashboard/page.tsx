'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { UsageChart } from '@/components/Dashboard/UsageChart';
import { CostTracker } from '@/components/Dashboard/CostTracker';
import { RecentRequests } from '@/components/Dashboard/RecentRequests';
import { TopModels } from '@/components/Dashboard/TopModels';
import { AdvancedPanel } from '@/components/configure/AdvancedPanel';
import { Activity, DollarSign, Zap, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();

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
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-10">Dashboard</h1>
          <p className="text-neutral-7 mt-1">Welcome back, {user.name || user.email}</p>
        </div>

        {/* Layer 1: Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Credits"
            value={user.credits?.toLocaleString() || '0'}
            icon={Zap}
            format="number"
          />
          <StatCard
            label="Monthly Requests"
            value="--"
            icon={Activity}
            format="number"
          />
          <StatCard
            label="Monthly Savings"
            value="--"
            icon={DollarSign}
            format="currency"
            trend={{ value: 12, direction: 'up', label: 'vs last month' }}
          />
          <StatCard
            label="Monthly Earnings"
            value="--"
            icon={TrendingUp}
            format="currency"
          />
        </div>

        {/* Layer 1: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UsageChart userId={user.id} days={7} />
          <CostTracker userId={user.id} />
        </div>

        {/* Layer 2: Recent Requests & Top Models */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentRequests userId={user.id} />
          <TopModels userId={user.id} />
        </div>

        {/* Layer 3: Advanced (collapsible) */}
        <div className="space-y-4">
          <AdvancedPanel
            label="Key Management"
            apiDiscoveryLabel="API Keys"
            configImportLabel="Test Panel"
          />
        </div>
      </div>
    </DashboardShell>
  );
}
