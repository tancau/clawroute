'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/store/use-user-store';
import { useTranslations } from 'next-intl';

interface RecentRequestsProps {
  userId: string;
}

export function RecentRequests({ userId }: RecentRequestsProps) {
  const { recentRequests, fetchRecentRequests, isLoading } = useUserStore();
  const t = useTranslations('dashboard');

  useEffect(() => {
    if (!recentRequests.length) {
      fetchRecentRequests(userId);
    }
  }, [userId, recentRequests.length, fetchRecentRequests]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('minutesAgo')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t('hoursAgo')}`;
    return date.toLocaleDateString();
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  if (!recentRequests.length && isLoading) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('recentRequests')}</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-4 bg-surface-overlay rounded w-20"></div>
              <div className="h-4 bg-surface-overlay rounded w-24"></div>
              <div className="h-4 bg-surface-overlay rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!recentRequests.length) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('recentRequests')}</h2>
        <p className="text-neutral-7 text-center py-8">{t('noRequests')}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-neutral-10">{t('recentRequests')}</h2>
        <button
          onClick={() => fetchRecentRequests(userId)}
          className="text-neutral-7 hover:text-neutral-10 transition-colors text-sm"
        >
          {t('refresh')}
        </button>
      </div>
      <div className="space-y-3">
        {recentRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-neutral-7 text-sm">{formatTime(request.timestamp)}</span>
              <span className="text-neutral-10 font-medium">{request.model}</span>
              <span className="px-2 py-0.5 text-xs bg-surface-overlay text-neutral-7 rounded">
                {request.provider}
              </span>
            </div>
            <div className="text-right">
              <div className="text-neutral-7 text-sm">
                {formatTokens(request.totalTokens)} {t('tokens')}
              </div>
              <div className="text-semantic-success text-sm">
                ${request.costDollars.toFixed(4)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
