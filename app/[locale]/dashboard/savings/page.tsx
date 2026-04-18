'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useUserStore } from '@/store/use-user-store';
import { EmptyState } from '@/components/shared/EmptyState';
import { PiggyBank } from 'lucide-react';

interface SavingsData {
  totalRequests: number;
  originalCost: number;
  actualCost: number;
  savedAmount: number;
  savedPercent: number;
  byIntent: {
    intent: string;
    requests: number;
    originalCost: number;
    actualCost: number;
  }[];
  byModel: {
    model: string;
    requests: number;
    percent: number;
  }[];
  lastMonth?: {
    savedAmount: number;
    savedPercent: number;
  };
}

export default function SavingsPage() {
  const [data, setData] = useState<SavingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const t = useTranslations('dashboard');
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    fetchSavings();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSavings = async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');

    try {
      // Fetch usage stats from API
      await useUserStore.getState().fetchUsage(user.id);

      const usage = useUserStore.getState().usage;

      if (usage) {
        // Build savings data from real API response
        const totalRequests = usage.totalRequests;
        const actualCost = usage.totalCost;
        const originalCost = actualCost / (1 - (usage.totalSaved / Math.max(usage.totalCost + usage.totalSaved, 0.01)));
        const savedAmount = usage.totalSaved;
        const savedPercent = originalCost > 0 ? Math.round((savedAmount / originalCost) * 100) : 0;

        // Build by-intent breakdown
        const byIntent = Object.entries(usage.byIntent || {}).map(([intent, info]) => ({
          intent,
          requests: info.requests,
          originalCost: info.cost * 1.5, // Estimate original cost
          actualCost: info.cost,
        }));

        // Build by-model breakdown
        const byProvider = Object.entries(usage.byProvider || {});
        const totalProviderRequests = byProvider.reduce((sum, [, info]) => sum + info.requests, 0);
        const byModel = byProvider.map(([provider, info]) => ({
          model: provider,
          requests: info.requests,
          percent: totalProviderRequests > 0 ? Math.round((info.requests / totalProviderRequests) * 100) : 0,
        }));

        setData({
          totalRequests,
          originalCost,
          actualCost,
          savedAmount,
          savedPercent,
          byIntent,
          byModel,
        });
      }
    } catch {
      setError(t('failedToLoadSavings'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-20">
          <div className="text-neutral-7">{t('loading')}</div>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20 text-semantic-error">{error}</div>
        </div>
      </DashboardShell>
    );
  }

  if (!data || data.totalRequests === 0) {
    return (
      <DashboardShell>
        <div className="max-w-7xl mx-auto">
          <div className="mt-8">
            <h1 className="text-3xl font-bold text-neutral-10">{t('savings')}</h1>
            <p className="text-neutral-7 mt-1">{t('savingsDetail')}</p>
          </div>
          <EmptyState
            icon={PiggyBank}
            title={t('noSavingsData')}
            description={t('savingsDescription')}
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-10">{t('savings')}</h1>
          <p className="text-neutral-7 mt-1">{t('savingsDetail')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <div className="text-neutral-7 text-sm mb-2">{t('totalRequestsCount')}</div>
            <div className="text-2xl font-bold text-neutral-10">{data.totalRequests.toLocaleString()}</div>
          </div>
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <div className="text-neutral-7 text-sm mb-2">{t('originalCost')}</div>
            <div className="text-2xl font-bold text-semantic-error">${data.originalCost.toFixed(2)}</div>
            <div className="text-xs text-neutral-6 mt-1">{t('allGpt4')}</div>
          </div>
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <div className="text-neutral-7 text-sm mb-2">{t('actualCost')}</div>
            <div className="text-2xl font-bold text-neutral-10">${data.actualCost.toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-6">
            <div className="text-semantic-success text-sm mb-2">{t('savedAmount')}</div>
            <div className="text-2xl font-bold text-semantic-success">${data.savedAmount.toFixed(2)}</div>
            <div className="text-sm text-green-300 mt-1">{t('saved', { percent: data.savedPercent })}</div>
          </div>
        </div>

        {/* Comparison with last month */}
        {data.lastMonth && (
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('vsLastMonthCompare')}</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-neutral-7 text-sm">{t('lastMonthSavings')}</div>
                <div className="text-xl font-bold text-neutral-10">${data.lastMonth.savedAmount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-neutral-7 text-sm">{t('monthGrowth')}</div>
                <div className="text-xl font-bold text-semantic-success">
                  +${(data.savedAmount - data.lastMonth.savedAmount).toFixed(2)}
                </div>
                <div className="text-sm text-green-300">
                  +{((data.savedAmount - data.lastMonth.savedAmount) / data.lastMonth.savedAmount * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* By Intent Table */}
        {data.byIntent.length > 0 && (
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <h2 className="text-xl font-bold text-neutral-10 mb-6">{t('byIntent')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left text-neutral-7 text-sm font-medium py-3">{t('intent')}</th>
                    <th className="text-right text-neutral-7 text-sm font-medium py-3">{t('requests')}</th>
                    <th className="text-right text-neutral-7 text-sm font-medium py-3">{t('originalCostShort')}</th>
                    <th className="text-right text-neutral-7 text-sm font-medium py-3">{t('actualCostShort')}</th>
                    <th className="text-right text-neutral-7 text-sm font-medium py-3">{t('savedShort')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byIntent.map((item, index) => {
                    const saved = item.originalCost - item.actualCost;
                    const percent = item.originalCost > 0 ? ((saved / item.originalCost) * 100).toFixed(0) : '0';
                    return (
                      <tr key={index} className="border-b border-border-subtle/50 hover:bg-surface-overlay/30">
                        <td className="py-4 text-neutral-10 capitalize">{item.intent}</td>
                        <td className="py-4 text-right text-neutral-10">{item.requests.toLocaleString()}</td>
                        <td className="py-4 text-right text-semantic-error">${item.originalCost.toFixed(2)}</td>
                        <td className="py-4 text-right text-neutral-10">${item.actualCost.toFixed(2)}</td>
                        <td className="py-4 text-right text-semantic-success">${saved.toFixed(2)} ({percent}%)</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By Model Distribution */}
        {data.byModel.length > 0 && (
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <h2 className="text-xl font-bold text-neutral-10 mb-6">{t('modelDistribution')}</h2>
            <div className="space-y-4">
              {data.byModel.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-10">{item.model}</span>
                    <span className="text-neutral-7">{item.requests.toLocaleString()} ({item.percent}%)</span>
                  </div>
                  <div className="h-4 bg-surface-overlay rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-primary to-brand-accent rounded-full"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
