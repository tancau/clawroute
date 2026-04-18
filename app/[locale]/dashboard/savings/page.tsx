'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

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

// Mock data
const mockData: SavingsData = {
  totalRequests: 10234,
  originalCost: 156.78,
  actualCost: 18.45,
  savedAmount: 138.33,
  savedPercent: 88,
  byIntent: [
    { intent: 'coding', requests: 5200, originalCost: 78.0, actualCost: 5.2 },
    { intent: 'casual_chat', requests: 3100, originalCost: 46.5, actualCost: 3.1 },
    { intent: 'analysis', requests: 1200, originalCost: 18.0, actualCost: 6.2 },
    { intent: 'translation', requests: 734, originalCost: 11.0, actualCost: 2.5 },
    { intent: 'creative', requests: 500, originalCost: 7.5, actualCost: 1.5 },
  ],
  byModel: [
    { model: 'Qwen-Free', requests: 6652, percent: 65 },
    { model: 'Gemma-Free', requests: 2047, percent: 20 },
    { model: 'GPT-4o-mini', requests: 1023, percent: 10 },
    { model: 'DeepSeek', requests: 512, percent: 5 },
  ],
  lastMonth: {
    savedAmount: 125.50,
    savedPercent: 82,
  },
};

export default function SavingsPage() {
  const [data] = useState<SavingsData>(mockData);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('dashboard');

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-10">{t('loading')}</div>
      </div>
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
                  const percent = ((saved / item.originalCost) * 100).toFixed(0);
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

        {/* By Model Distribution */}
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
      </div>
    </DashboardShell>
  );
}
