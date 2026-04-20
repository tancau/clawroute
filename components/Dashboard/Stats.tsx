'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/use-user-store';

interface StatsProps {
  userId: string;
}

export function Stats({ userId }: StatsProps) {
  const t = useTranslations('stats');
  const { data, earnings, fetchDashboard, fetchUsage, fetchEarnings, isLoading } = useUserStore();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      fetchDashboard(userId);
      fetchUsage(userId);
      fetchEarnings(userId);
    }
  }, [userId, fetchDashboard, fetchUsage, fetchEarnings]);

  const handleRefresh = () => {
    fetchDashboard(userId);
    fetchUsage(userId);
    fetchEarnings(userId);
  };

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-[#1e293b] rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-[#1e293b] rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: t('totalRequests'),
      value: data?.usage.requests?.toLocaleString() || '0',
      icon: '📊',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: t('usageCost'),
      value: `$${(data?.usage.costDollars || 0).toFixed(2)}`,
      icon: '💸',
      color: 'from-orange-500 to-yellow-500',
    },
    {
      label: t('savedAmount'),
      value: `$${(data?.usage.savedDollars || 0).toFixed(2)}`,
      icon: '💰',
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: t('totalEarnings'),
      value: `$${(earnings?.totalDollars || 0).toFixed(2)}`,
      icon: '🤑',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">📊 {t('realtimeStats')}</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-3 py-1.5 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors text-sm disabled:opacity-50"
        >
          🔄 {t('refresh')}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 hover:border-[#334155] transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl`}>
              {stat.icon}
            </div>
            <span className="text-[#94a3b8] text-sm">{stat.label}</span>
          </div>
          <div className="text-2xl font-bold text-white">{stat.value}</div>
        </div>
      ))}
      </div>
    </div>
  );
}
