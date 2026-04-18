'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface UsageChartProps {
  userId: string;
  days?: number;
}

interface DailyUsage {
  date: string;
  requests: number;
  costCents: number;
  savedCents: number;
}

export function UsageChart({ userId, days = 7 }: UsageChartProps) {
  const [data, setData] = useState<DailyUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const t = useTranslations('dashboard');

  useEffect(() => {
    fetchUsage();
  }, [userId, days]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsage = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.getSavings(userId);

      if (result.data) {
        const daily = (result.data.daily || []) as Array<Partial<DailyUsage>>;
        setData(daily.slice(0, days).map(d => ({
          date: d.date || '',
          requests: d.requests || 0,
          costCents: d.costCents || 0,
          savedCents: d.savedCents || 0,
        })));
      }

      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError(t('failedToLoadUsage'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <div className="text-center text-neutral-7">{t('loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <div className="text-center text-semantic-error">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-10 mb-4">{t('usageTrend')}</h3>
        <div className="text-center text-neutral-7">{t('noUsageData')}</div>
      </div>
    );
  }

  const maxRequests = Math.max(...data.map(d => d.requests), 1);

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <h3 className="text-lg font-semibold text-neutral-10 mb-4">{t('usageTrendDays', { days })}</h3>

      <div className="space-y-2">
        {data.map((day, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="text-sm text-neutral-7 w-20">{day.date}</div>

            <div className="flex-1">
              <div className="relative h-6 bg-surface-overlay rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-primary to-brand-accent rounded"
                  style={{ width: `${(day.requests / maxRequests) * 100}%` }}
                />
                <div className="absolute inset-y-0 left-2 flex items-center text-xs text-neutral-10">
                  {day.requests} {t('times')}
                </div>
              </div>
            </div>

            <div className="text-sm text-neutral-7 w-16 text-right">
              ${(day.costCents / 100).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border-subtle flex justify-between text-sm">
        <div className="text-neutral-7">
          {t('totalRequests')}: <span className="text-neutral-10 font-semibold">
            {data.reduce((sum, d) => sum + d.requests, 0)}
          </span> {t('times')}
        </div>
        <div className="text-neutral-7">
          {t('totalCost')}: <span className="text-neutral-10 font-semibold">
            ${(data.reduce((sum, d) => sum + d.costCents, 0) / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
