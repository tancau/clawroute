'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/use-user-store';
import { useTranslations } from 'next-intl';
import { Layers } from 'lucide-react';

interface IntentClassificationChartProps {
  userId: string;
}

// Intent icons and colors
const intentConfig: Record<string, { icon: string; color: string }> = {
  simple: { icon: '📝', color: 'bg-blue-500' },
  coding: { icon: '💻', color: 'bg-purple-500' },
  reasoning: { icon: '🧠', color: 'bg-pink-500' },
  creative: { icon: '🎨', color: 'bg-orange-500' },
  translation: { icon: '🌐', color: 'bg-cyan-500' },
  analysis: { icon: '📊', color: 'bg-green-500' },
  chat: { icon: '💬', color: 'bg-indigo-500' },
};

export function IntentClassificationChart({ userId }: IntentClassificationChartProps) {
  const { usage, fetchUsage } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('dashboard');

  useEffect(() => {
    loadData();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true);
    await fetchUsage(userId, 30);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-surface-overlay rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-6 bg-surface-overlay rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Build intent data from byIntent
  const intentData = Object.entries(usage?.byIntent || {});
  const totalRequests = intentData.reduce((sum, [, info]) => sum + info.requests, 0);

  const data = intentData.length > 0
    ? intentData.map(([intent, info]) => ({
        intent,
        requests: info.requests,
        cost: info.cost,
        percent: totalRequests > 0 ? Math.round((info.requests / totalRequests) * 100) : 0,
      })).sort((a, b) => b.requests - a.requests)
    : generateMockIntentData();

  const maxRequests = Math.max(...data.map(d => d.requests), 1);

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2 mb-6">
        <Layers className="h-5 w-5 text-brand-secondary" />
        {t('byIntent')}
      </h3>

      {/* Horizontal bar chart */}
      <div className="space-y-4">
        {data.map((item, i) => {
          const config = intentConfig[item.intent.toLowerCase()] || { icon: '📋', color: 'bg-neutral-6' };
          const widthPercent = (item.requests / maxRequests) * 100;
          return (
            <div key={i} className="flex items-center gap-3">
              {/* Intent icon */}
              <div className="flex-shrink-0 w-8 text-center text-lg">
                {config.icon}
              </div>

              {/* Intent name */}
              <div className="flex-shrink-0 w-24 text-sm text-neutral-10 capitalize">
                {item.intent}
              </div>

              {/* Bar */}
              <div className="flex-1">
                <div className="h-6 bg-surface-overlay rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config.color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${widthPercent}%` }}
                  >
                    {widthPercent > 15 && (
                      <span className="text-xs text-white font-medium">
                        {item.requests}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Percent */}
              <div className="flex-shrink-0 text-sm text-neutral-7 w-12 text-right">
                {item.percent}%
              </div>

              {/* Cost */}
              <div className="flex-shrink-0 text-sm text-neutral-6 w-16 text-right">
                ${item.cost.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-border-subtle">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-neutral-10">{totalRequests || data.reduce((s, d) => s + d.requests, 0)}</div>
            <div className="text-xs text-neutral-7">{t('totalRequests')}</div>
          </div>
          <div>
            <div className="text-xl font-bold text-neutral-10">{data.length}</div>
            <div className="text-xs text-neutral-7">{t('intent')} types</div>
          </div>
          <div>
            <div className="text-xl font-bold text-semantic-success">
              {usage?.totalSaved?.toFixed(2) || '$0'}
            </div>
            <div className="text-xs text-neutral-7">{t('savedShort')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateMockIntentData() {
  return [
    { intent: 'simple', requests: 320, cost: 12.5, percent: 32 },
    { intent: 'coding', requests: 280, cost: 28.0, percent: 28 },
    { intent: 'reasoning', requests: 150, cost: 18.5, percent: 15 },
    { intent: 'chat', requests: 120, cost: 4.8, percent: 12 },
    { intent: 'creative', requests: 80, cost: 8.0, percent: 8 },
    { intent: 'translation', requests: 50, cost: 2.5, percent: 5 },
  ];
}