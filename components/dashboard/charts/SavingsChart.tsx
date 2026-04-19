'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/use-user-store';
import { useTranslations } from 'next-intl';
import { TrendingUp, DollarSign } from 'lucide-react';

interface SavingsChartProps {
  userId: string;
}

export function SavingsChart({ userId }: SavingsChartProps) {
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
        <div className="h-32 bg-surface-overlay rounded" />
      </div>
    );
  }

  const totalCost = usage?.totalCost || 0;
  const totalSaved = usage?.totalSaved || 0;
  const originalCost = totalCost + totalSaved;
  const savedPercent = originalCost > 0 ? Math.round((totalSaved / originalCost) * 100) : 0;

  // Generate comparison bars
  const comparisonData = [
    { label: 'GPT-4 Direct', cost: originalCost, color: 'bg-semantic-error' },
    { label: 'HopLLM', cost: totalCost, color: 'bg-gradient-to-r from-brand-primary to-brand-accent' },
  ];

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-semantic-success" />
          {t('costSavings')}
        </h3>
        <div className="flex items-center gap-1 text-semantic-success">
          <TrendingUp className="h-4 w-4" />
          <span className="font-bold">{savedPercent}%</span>
        </div>
      </div>

      {/* Comparison bars */}
      <div className="space-y-4 mb-6">
        {comparisonData.map((item, i) => {
          const maxCost = Math.max(originalCost, totalCost, 1);
          const widthPercent = (item.cost / maxCost) * 100;
          return (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-7">{item.label}</span>
                <span className="text-neutral-10 font-medium">${item.cost.toFixed(2)}</span>
              </div>
              <div className="h-8 bg-surface-overlay rounded-lg overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                  style={{ width: `${widthPercent}%` }}
                >
                  {widthPercent > 20 && (
                    <span className="text-xs text-white font-medium">
                      ${item.cost.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Savings highlight */}
      <div className="bg-gradient-to-r from-semantic-success/20 to-emerald-500/20 border border-semantic-success/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-7">{t('savedAmount')}</div>
            <div className="text-2xl font-bold text-semantic-success">${totalSaved.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-neutral-7">{t('vsLastMonth')}</div>
            <div className="text-xl font-bold text-semantic-success">+{savedPercent}%</div>
          </div>
        </div>
      </div>

      {/* Per-request savings breakdown */}
      <div className="mt-6 pt-4 border-t border-border-subtle">
        <div className="text-sm text-neutral-7 mb-3">{t('savingsDescription')}</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-surface-overlay rounded-lg">
            <div className="text-lg font-bold text-neutral-10">${(originalCost / Math.max(usage?.totalRequests || 1, 1)).toFixed(4)}</div>
            <div className="text-xs text-neutral-7">Cost per request (GPT-4)</div>
          </div>
          <div className="text-center p-3 bg-semantic-success/10 rounded-lg">
            <div className="text-lg font-bold text-semantic-success">${(totalCost / Math.max(usage?.totalRequests || 1, 1)).toFixed(4)}</div>
            <div className="text-xs text-neutral-7">Cost per request (HopLLM)</div>
          </div>
        </div>
      </div>
    </div>
  );
}