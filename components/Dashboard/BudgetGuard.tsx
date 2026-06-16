'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

interface BudgetStatusData {
  currentSpendUsd: number;
  monthlyLimitUsd: number;
  usagePercent: number;
  projectedSpendUsd: number;
  daysRemaining: number;
  dailyAvgSpendUsd: number;
  status: 'normal' | 'warning' | 'downgraded' | 'blocked';
  modelTier: 'full' | 'cheap' | 'free';
  nextThreshold: number;
}

interface BudgetConfigData {
  monthlyLimitUsd: number;
  warningThreshold: number;
  downgradeThreshold: number;
  blockThreshold: number;
  downgradeToFree: boolean;
  notifyOnWarning: boolean;
}

export function BudgetGuard() {
  const t = useTranslations('budgetGuard');
  const [status, setStatus] = useState<BudgetStatusData | null>(null);
  const [config, setConfig] = useState<BudgetConfigData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editLimit, setEditLimit] = useState('0');

  useEffect(() => {
    loadBudget();
  }, []);

  async function loadBudget() {
    try {
      const token = api.getToken();
      const response = await fetch('/api/dashboard/budget', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        setConfig(data.config);
        setEditLimit(String(data.config.monthlyLimitUsd || 0));
      }
    } catch {
      // ignore
    }
  }

  async function saveBudget() {
    try {
      const token = api.getToken();
      const response = await fetch('/api/dashboard/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          monthlyLimitUsd: parseFloat(editLimit) || 0,
        }),
      });
      if (response.ok) {
        setIsEditing(false);
        await loadBudget();
      }
    } catch {
      // ignore
    }
  }

  if (!status || !config) return null;

  const statusColors: Record<string, string> = {
    normal: 'text-green-400',
    warning: 'text-yellow-400',
    downgraded: 'text-orange-400',
    blocked: 'text-red-400',
  };

  const statusBg: Record<string, string> = {
    normal: 'bg-green-500/20',
    warning: 'bg-yellow-500/20',
    downgraded: 'bg-orange-500/20',
    blocked: 'bg-red-500/20',
  };

  const progressColor = status.usagePercent >= 100 ? 'bg-red-500'
    : status.usagePercent >= 90 ? 'bg-orange-500'
    : status.usagePercent >= 80 ? 'bg-yellow-500'
    : 'bg-green-500';

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{t('title')}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBg[status.status]} ${statusColors[status.status]}`}>
          {t(`status_${status.status}`)}
        </span>
      </div>

      {/* 预算进度条 */}
      {status.monthlyLimitUsd > 0 ? (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#94a3b8]">${status.currentSpendUsd.toFixed(2)} {t('spent')}</span>
            <span className="text-[#94a3b8]">${status.monthlyLimitUsd.toFixed(2)} {t('limit')}</span>
          </div>
          <div className="w-full h-3 bg-[#1e293b] rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(status.usagePercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#64748b] mt-1">
            <span>{status.usagePercent.toFixed(1)}%</span>
            <span>{t('projected')}: ${status.projectedSpendUsd.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-[#1e293b] rounded-lg text-center">
          <p className="text-[#94a3b8] text-sm">{t('noBudgetSet')}</p>
          <p className="text-[#64748b] text-xs mt-1">{t('setBudgetHint')}</p>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#1e293b] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">${status.dailyAvgSpendUsd.toFixed(2)}</div>
          <div className="text-xs text-[#64748b]">{t('dailyAvg')}</div>
        </div>
        <div className="bg-[#1e293b] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">{status.daysRemaining}</div>
          <div className="text-xs text-[#64748b]">{t('daysLeft')}</div>
        </div>
        <div className="bg-[#1e293b] rounded-lg p-3 text-center">
          <div className={`text-lg font-bold ${statusColors[status.status]}`}>
            {status.modelTier === 'full' ? 'Full' : status.modelTier === 'cheap' ? 'Cheap' : 'Free'}
          </div>
          <div className="text-xs text-[#64748b]">{t('modelTier')}</div>
        </div>
      </div>

      {/* 预算设置 */}
      {isEditing ? (
        <div className="flex gap-2">
          <input
            type="number"
            value={editLimit}
            onChange={(e) => setEditLimit(e.target.value)}
            placeholder="0 = unlimited"
            className="flex-1 px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#00c9ff]"
            step="0.01"
            min="0"
          />
          <button
            onClick={saveBudget}
            className="px-4 py-2 bg-[#00c9ff] text-[#0f172a] font-medium rounded-lg hover:opacity-90"
          >
            {t('save')}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 bg-[#334155] text-white rounded-lg hover:opacity-90"
          >
            {t('cancel')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full py-2 bg-[#1e293b] border border-[#334155] text-[#94a3b8] rounded-lg hover:text-white hover:border-[#00c9ff] transition-colors text-sm"
        >
          {status.monthlyLimitUsd > 0
            ? t('editBudget')
            : t('setBudget')
          }
        </button>
      )}
    </div>
  );
}
