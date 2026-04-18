'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/store/use-user-store';
import { useTranslations } from 'next-intl';

interface TopModelsProps {
  userId: string;
}

export function TopModels({ userId }: TopModelsProps) {
  const { topModels, fetchTopModels, isLoading } = useUserStore();
  const t = useTranslations('dashboard');

  useEffect(() => {
    if (!topModels.length) {
      fetchTopModels(userId);
    }
  }, [userId, topModels.length, fetchTopModels]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const topModel = topModels[0];

  if (!topModels.length && isLoading) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('topModels')}</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="w-6 h-6 bg-surface-overlay rounded"></div>
              <div className="h-4 bg-surface-overlay rounded flex-1"></div>
              <div className="h-4 bg-surface-overlay rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!topModels.length) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('topModels')}</h2>
        <p className="text-neutral-7 text-center py-8">{t('noModelData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-neutral-10">{t('topModels')}</h2>
        <button
          onClick={() => fetchTopModels(userId)}
          className="text-neutral-7 hover:text-neutral-10 transition-colors text-sm"
        >
          {t('refresh')}
        </button>
      </div>

      <div className="space-y-3">
        {topModels.map((model, index) => {
          const isTop = index === 0;
          const percentage = topModel?.requests ? Math.round((model.requests / topModel.requests) * 100) : 0;

          return (
            <div key={model.model} className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-sm ${
                    isTop ? 'bg-yellow-500/20 text-yellow-400' : 'bg-surface-overlay text-neutral-7'
                  }`}>
                    {index + 1}
                  </span>
                  <span className={`font-medium ${isTop ? 'text-neutral-10' : 'text-neutral-7'}`}>
                    {model.model}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-7 text-sm">{model.requests} {t('times')}</span>
                  <span className="text-semantic-success text-sm ml-2">
                    ${(model.totalCostDollars || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isTop ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-neutral-6'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-neutral-6 mt-1">
                <span>{formatTokens(model.totalTokens)} {t('tokens')}</span>
                <span>{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
