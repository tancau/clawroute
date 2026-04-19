'use client';

import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/use-user-store';
import { useTranslations } from 'next-intl';
import { Activity, TrendingUp, Calendar } from 'lucide-react';

interface UsageOverviewProps {
  userId: string;
}

interface DailyUsage {
  date: string;
  requests: number;
  credits: number;
}

export function UsageOverview({ userId }: UsageOverviewProps) {
  const { fetchUsage, usage } = useUserStore();
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('dashboard');

  useEffect(() => {
    loadUsage();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsage = async () => {
    setIsLoading(true);
    await fetchUsage(userId, 30);
    // Generate mock daily data based on usage (in real app, this would come from API)
    const today = new Date();
    const mockDaily = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        requests: Math.floor(Math.random() * 50 + 10),
        credits: Math.floor(Math.random() * 100 + 20),
      };
    }).reverse();
    setDailyData(mockDaily);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface-overlay rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-surface-overlay rounded" />
            <div className="h-20 bg-surface-overlay rounded" />
            <div className="h-20 bg-surface-overlay rounded" />
          </div>
        </div>
      </div>
    );
  }

  const todayRequests = dailyData[dailyData.length - 1]?.requests || 0;
  const weekRequests = dailyData.reduce((sum, d) => sum + d.requests, 0);
  const monthRequests = usage?.totalRequests || 0;

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-primary" />
          {t('usageOverview')}
        </h3>
        <button
          onClick={loadUsage}
          className="text-xs text-neutral-7 hover:text-neutral-10 transition-colors"
        >
          {t('refresh')}
        </button>
      </div>

      {/* Request counts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-surface-overlay rounded-lg">
          <Calendar className="h-4 w-4 text-neutral-7 mx-auto mb-2" />
          <div className="text-2xl font-bold text-neutral-10">{todayRequests}</div>
          <div className="text-xs text-neutral-7">Today</div>
        </div>
        <div className="text-center p-4 bg-surface-overlay rounded-lg">
          <TrendingUp className="h-4 w-4 text-brand-accent mx-auto mb-2" />
          <div className="text-2xl font-bold text-neutral-10">{weekRequests}</div>
          <div className="text-xs text-neutral-7">This Week</div>
        </div>
        <div className="text-center p-4 bg-brand-primary/10 rounded-lg">
          <Activity className="h-4 w-4 text-brand-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-brand-primary">{monthRequests.toLocaleString()}</div>
          <div className="text-xs text-neutral-7">This Month</div>
        </div>
      </div>

      {/* Mini trend chart */}
      <div className="relative h-24">
        <div className="absolute inset-0 flex items-end gap-1">
          {dailyData.map((day, i) => {
            const maxRequests = Math.max(...dailyData.map(d => d.requests), 1);
            const heightPercent = (day.requests / maxRequests) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-brand-primary to-brand-accent rounded-t-sm transition-all duration-300"
                style={{ height: `${heightPercent}%` }}
                title={`${day.date}: ${day.requests} requests`}
              />
            );
          })}
        </div>
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-neutral-7 transform translate-y-4">
          {dailyData.map((day, i) => (
            <span key={i} className="flex-1 text-center">{day.date}</span>
          ))}
        </div>
      </div>
    </div>
  );
}