'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface EarningsSummaryData {
  userId: string;
  summary: {
    totalEarningsCents: number;
    currentPeriodEarningsCents: number;
    pendingEarningsCents: number;
    totalEarningsDollars: number;
    currentPeriodEarningsDollars: number;
    pendingEarningsDollars: number;
    lastUpdated: number;
  };
  byProvider: Record<string, {
    totalEarningCents: number;
    totalEarningsDollars: number;
    totalUsageTokens: number;
    totalCalls: number;
  }>;
  trend: Array<{
    period: string;
    totalEarningCents: number;
    totalEarningsDollars: number;
  }>;
}

interface EarningsHistoryData {
  userId: string;
  history: Array<{
    period: string;
    provider: string;
    totalEarningCents: number;
    totalEarningsDollars: number;
    totalUsageTokens: number;
    totalCalls: number;
  }>;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10b981',
  anthropic: '#f59e0b',
  google: '#6366f1',
  deepseek: '#06b6d4',
  qwen: '#a855f7',
  openrouter: '#ec4899',
  litellm: '#64748b',
  grok: '#eab308',
  mistral: '#818cf8',
  llama: '#f43f5e',
};

export default function EarningsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useUserStore();

  const [summary, setSummary] = useState<EarningsSummaryData | null>(null);
  const [history, setHistory] = useState<EarningsHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'providers'>('overview');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    (async () => {
      try {
        const [summaryRes, historyRes] = await Promise.all([
          fetch(`${API_BASE}/v1/billing/earnings/${user.id}/summary`),
          fetch(`${API_BASE}/v1/billing/earnings/${user.id}/history?limit=12`),
        ]);
        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (historyRes.ok) setHistory(await historyRes.json());
        setError(null);
      } catch {
        setError('无法获取收益数据');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const handleRetry = () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const [summaryRes, historyRes] = await Promise.all([
          fetch(`${API_BASE}/v1/billing/earnings/${user.id}/summary`),
          fetch(`${API_BASE}/v1/billing/earnings/${user.id}/history?limit=12`),
        ]);
        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (historyRes.ok) setHistory(await historyRes.json());
        setError(null);
      } catch {
        setError('无法获取收益数据');
      } finally {
        setIsLoading(false);
      }
    })();
  };

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  const totalEarnings = summary?.summary.totalEarningsDollars || 0;
  const currentPeriodEarnings = summary?.summary.currentPeriodEarningsDollars || 0;
  const pendingEarnings = summary?.summary.pendingEarningsDollars || 0;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">💰 收益中心</h1>
            <p className="text-[#94a3b8] mt-1">查看和管理您的 Key 贡献收益</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors"
          >
            ← 返回仪表盘
          </button>
        </div>

        {/* Earnings Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
            <div className="text-sm text-green-400 mb-2">总收益</div>
            <div className="text-4xl font-bold text-white">${totalEarnings.toFixed(2)}</div>
            <div className="text-sm text-[#94a3b8] mt-2">
              累计全部周期收益
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/20 rounded-xl p-6">
            <div className="text-sm text-blue-400 mb-2">本周期收益</div>
            <div className="text-4xl font-bold text-white">${currentPeriodEarnings.toFixed(2)}</div>
            <div className="text-sm text-[#94a3b8] mt-2">
              {new Date().toISOString().slice(0, 7)} 周期
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
            <div className="text-sm text-amber-400 mb-2">待结算收益</div>
            <div className="text-4xl font-bold text-white">${pendingEarnings.toFixed(2)}</div>
            <div className="text-sm text-[#94a3b8] mt-2">
              待周期结束后结算
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['overview', 'history', 'providers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#00c9ff] text-[#0f172a]'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#334155]'
              }`}
            >
              {tab === 'overview' ? '收益概览' : tab === 'history' ? '历史记录' : '按 Provider'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-24 bg-[#1e293b] rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-8 text-center">
            <div className="text-[#64748b] mb-4">{error}</div>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155]"
            >
              重试
            </button>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Earnings Trend Chart (simple bar chart) */}
                <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">收益趋势</h3>
                  {summary && summary.trend.length > 0 ? (
                    <div className="flex items-end gap-2 h-48">
                      {[...summary.trend].reverse().map(item => {
                        const maxEarning = Math.max(...summary.trend.map(t => t.totalEarningCents), 1);
                        const height = Math.max(4, (item.totalEarningCents / maxEarning) * 100);
                        return (
                          <div key={item.period} className="flex-1 flex flex-col items-center gap-1">
                            <div className="text-xs text-[#64748b]">
                              ${item.totalEarningsDollars.toFixed(2)}
                            </div>
                            <div
                              className="w-full bg-gradient-to-t from-[#00c9ff] to-[#92fe9d] rounded-t-sm min-h-[4px]"
                              style={{ height: `${height}%` }}
                            />
                            <div className="text-xs text-[#64748b] truncate">
                              {item.period.slice(5)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#64748b]">
                      暂无收益趋势数据
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      {summary?.trend.length || 0}
                    </div>
                    <div className="text-sm text-[#64748b] mt-1">收益周期</div>
                  </div>
                  <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      {summary ? Object.keys(summary.byProvider).length : 0}
                    </div>
                    <div className="text-sm text-[#64748b] mt-1">贡献 Provider</div>
                  </div>
                  <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {totalEarnings > 0 ? `${((currentPeriodEarnings / totalEarnings) * 100).toFixed(0)}%` : '--'}
                    </div>
                    <div className="text-sm text-[#64748b] mt-1">本周期占比</div>
                  </div>
                  <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">
                      {pendingEarnings > 0 ? '待结算' : '已结清'}
                    </div>
                    <div className="text-sm text-[#64748b] mt-1">结算状态</div>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">收益历史</h3>
                {history && history.history.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#64748b] border-b border-[#1e293b]">
                          <th className="text-left py-3 px-2">周期</th>
                          <th className="text-left py-3 px-2">Provider</th>
                          <th className="text-right py-3 px-2">调用次数</th>
                          <th className="text-right py-3 px-2">Tokens</th>
                          <th className="text-right py-3 px-2">收益</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.history.map((item, i) => (
                          <tr key={`${item.period}-${item.provider}-${i}`} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30">
                            <td className="py-3 px-2 text-white">{item.period}</td>
                            <td className="py-3 px-2">
                              <span className="capitalize text-white">{item.provider}</span>
                            </td>
                            <td className="py-3 px-2 text-right text-white">
                              {item.totalCalls.toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right text-[#94a3b8]">
                              {item.totalUsageTokens.toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right text-green-400 font-medium">
                              ${item.totalEarningsDollars.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#64748b]">
                    暂无收益历史记录
                  </div>
                )}
              </div>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">按 Provider 分组</h3>
                {summary && Object.keys(summary.byProvider).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(summary.byProvider)
                      .sort(([, a], [, b]) => b.totalEarningCents - a.totalEarningCents)
                      .map(([provider, data]) => {
                        const maxEarning = Math.max(
                          ...Object.values(summary.byProvider).map(d => d.totalEarningCents),
                          1
                        );
                        const barWidth = (data.totalEarningCents / maxEarning) * 100;
                        const color = PROVIDER_COLORS[provider] || '#64748b';

                        return (
                          <div key={provider} className="p-4 bg-[#1e293b] rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-medium text-white capitalize">{provider}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-[#94a3b8]">
                                  {data.totalCalls} 次调用
                                </span>
                                <span className="font-medium text-green-400">
                                  ${data.totalEarningsDollars.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-[#0f172a] rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${barWidth}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#64748b]">
                    暂无 Provider 收益数据
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Withdraw Section */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">提现</h3>
              <p className="text-sm text-[#64748b] mt-1">
                可提现余额: ${pendingEarnings.toFixed(2)}（最低 $10.00）
              </p>
            </div>
            <button
              disabled={pendingEarnings < 10}
              className="px-6 py-2 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              title={pendingEarnings < 10 ? '待结算收益不足 $10.00，暂不可提现' : '申请提现'}
            >
              申请提现
            </button>
          </div>
          <p className="text-xs text-[#475569] mt-2">
            * 提现功能即将上线，目前为展示状态
          </p>
        </div>
      </div>
    </div>
  );
}
