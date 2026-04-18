'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface CostTrackerProps {
  userId: string;
}

interface SavingsData {
  totalSavedCents: number;
  totalSavedDollars: number;
  averageSavedPercent: number;
  daily: Array<{
    date: string;
    savedCents: number;
  }>;
}

export function CostTracker({ userId }: CostTrackerProps) {
  const [data, setData] = useState<SavingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const t = useTranslations('dashboard');

  useEffect(() => {
    fetchSavings();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSavings = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.getSavings(userId);

      if (result.data) {
        setData(result.data);
      }

      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError(t('failedToLoadSavings'));
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

  if (!data || data.totalSavedCents === 0) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-10 mb-4">{t('costSavings')}</h3>
        <div className="text-center py-8">
          <div className="text-4xl font-bold text-brand-primary mb-2">$0.00</div>
          <div className="text-neutral-7">{t('noSavingsData')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <h3 className="text-lg font-semibold text-neutral-10 mb-4">{t('costSavings')}</h3>

      <div className="text-center py-6 bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 rounded-lg mb-6">
        <div className="text-5xl font-bold text-brand-primary mb-2">
          ${data.totalSavedDollars.toFixed(2)}
        </div>
        <div className="text-neutral-7">
          {t('savedVsGpt4')}
          <span className="text-brand-accent font-semibold"> {data.averageSavedPercent}%</span>
        </div>
      </div>

      {data.daily.length > 0 && (
        <div>
          <div className="text-sm text-neutral-7 mb-3">{t('recentSavingsTrend')}</div>
          <div className="space-y-2">
            {data.daily.slice(0, 7).map((day, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-neutral-7">{day.date}</span>
                <span className="text-brand-accent">
                  ${(day.savedCents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-2 text-xs text-neutral-7">
          <span>💡</span>
          <span>{t('savingsDescription')}</span>
        </div>
      </div>
    </div>
  );
}
