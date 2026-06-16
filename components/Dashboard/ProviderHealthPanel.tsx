'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  errorRate: number;
  successCount: number;
  errorCount: number;
  lastCheckAt: number;
  lastErrorAt: number | null;
  lastErrorMessage: string | null;
  consecutiveErrors: number;
  uptime5min: number;
  uptime1hour: number;
}

export function ProviderHealthPanel() {
  const t = useTranslations('providerHealth');
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000); // 30s 刷新
    return () => clearInterval(interval);
  }, []);

  async function loadHealth() {
    try {
      const token = api.getToken();
      const response = await fetch('/api/dashboard/health', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProviders(data.data?.providers || []);
        setOverallStatus(data.data?.overallStatus || 'healthy');
      }
    } catch {
      // ignore
    }
  }

  const statusIcon: Record<string, string> = {
    healthy: '🟢',
    degraded: '🟡',
    down: '🔴',
  };

  const statusBg: Record<string, string> = {
    healthy: 'bg-green-500/10 border-green-500/20',
    degraded: 'bg-yellow-500/10 border-yellow-500/20',
    down: 'bg-red-500/10 border-red-500/20',
  };

  const overallBg: Record<string, string> = {
    healthy: 'text-green-400',
    degraded: 'text-yellow-400',
    down: 'text-red-400',
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">{t('title')}</h2>
        <span className={`text-sm font-medium ${overallBg[overallStatus]}`}>
          {statusIcon[overallStatus]} {t(`overall_${overallStatus}`)}
        </span>
      </div>

      <div className="space-y-2">
        {providers.length === 0 ? (
          <div className="text-center py-6 text-[#64748b] text-sm">
            {t('noData')}
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.provider}
              className={`flex items-center justify-between p-3 rounded-lg border ${statusBg[provider.status]}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{statusIcon[provider.status]}</span>
                <div>
                  <div className="font-medium text-white capitalize text-sm">{provider.provider}</div>
                  {provider.lastErrorMessage && (
                    <div className="text-xs text-red-400 mt-0.5 truncate max-w-[200px]">
                      {provider.lastErrorMessage}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-center">
                  <div className={`${provider.latencyMs > 5000 ? 'text-orange-400' : 'text-green-400'}`}>
                    {provider.latencyMs > 0 ? `${provider.latencyMs}ms` : '-'}
                  </div>
                  <div className="text-[#475569]">{t('latency')}</div>
                </div>
                <div className="text-center">
                  <div className={`${provider.errorRate > 0.1 ? 'text-red-400' : 'text-green-400'}`}>
                    {provider.errorRate > 0 ? `${(provider.errorRate * 100).toFixed(1)}%` : '0%'}
                  </div>
                  <div className="text-[#475569]">{t('errorRate')}</div>
                </div>
                <div className="text-center">
                  <div className="text-white">
                    {(provider.uptime5min * 100).toFixed(0)}%
                  </div>
                  <div className="text-[#475569]">{t('uptime')}</div>
                </div>
                <div className="text-center">
                  <div className="text-[#94a3b8]">
                    {provider.successCount + provider.errorCount}
                  </div>
                  <div className="text-[#475569]">{t('requests')}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 text-xs text-[#475569] text-center">
        {t('autoRefresh')}
      </div>
    </div>
  );
}
