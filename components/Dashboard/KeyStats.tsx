'use client';

import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '@/store/use-user-store';

interface KeyStatData {
  id: string;
  provider: string;
  keyPreview: string;
  tier: string;
  isActive: boolean;
  totalCalls: number;
  totalEarnings: number;
  lastUsedAt: number | null;
  createdAt: number;
  usageTrend: Array<{ date: string; calls: number }>;
}


const PROVIDER_COLORS: Record<string, string> = {
  openai: 'from-green-400 to-emerald-600',
  anthropic: 'from-orange-400 to-amber-600',
  google: 'from-blue-400 to-indigo-600',
  deepseek: 'from-cyan-400 to-teal-600',
  qwen: 'from-purple-400 to-violet-600',
  openrouter: 'from-pink-400 to-rose-600',
  litellm: 'from-gray-400 to-slate-600',
  grok: 'from-yellow-400 to-orange-600',
  mistral: 'from-indigo-400 to-blue-600',
  llama: 'from-red-400 to-pink-600',
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: '免费池', color: 'bg-gray-500/20 text-gray-400' },
  paid: { label: '付费池', color: 'bg-blue-500/20 text-blue-400' },
  enterprise: { label: '企业池', color: 'bg-purple-500/20 text-purple-400' },
} as const;

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatCents(cents: number): string {
  if (cents === 0) return '$0.00';
  if (cents < 100) return `$0.${cents.toString().padStart(2, '0')}`;
  return `$${(cents / 100).toFixed(2)}`;
}

function timeAgo(timestamp: number | null): string {
  if (!timestamp) return '从未使用';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}个月前`;
}

interface KeyStatsProps {
  userId: string;
}

export function KeyStats({ userId }: KeyStatsProps) {
  const { keys, fetchKeys, fetchEarnings } = useUserStore();
  const [keyStats, setKeyStats] = useState<Map<string, KeyStatData>>(new Map());
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      fetchKeys(userId);
      fetchEarnings(userId);
    }
  }, [userId, fetchKeys, fetchEarnings]);

  // 从 store keys 构建 stats
  useEffect(() => {
    const statsMap = new Map<string, KeyStatData>();
    for (const key of keys) {
      statsMap.set(key.id, {
        id: key.id,
        provider: key.provider,
        keyPreview: key.keyPreview,
        tier: 'free', // 从 key 数据推断
        isActive: key.isActive,
        totalCalls: key.totalUsage || 0,
        totalEarnings: key.totalEarnings || 0,
        lastUsedAt: key.lastUsedAt || null,
        createdAt: key.createdAt,
        usageTrend: [], // 后端暂不提供
      });
    }
    setKeyStats(statsMap);
  }, [keys]);

  const totalEarnings = keys.reduce((sum, k) => sum + (k.totalEarnings || 0), 0);
  const totalCalls = keys.reduce((sum, k) => sum + (k.totalUsage || 0), 0);
  const activeKeys = keys.filter(k => k.isActive).length;

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Key 贡献统计</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[#94a3b8]">{activeKeys} 活跃</span>
          <span className="text-[#94a3b8]">{formatNumber(totalCalls)} 调用</span>
          <span className="text-green-400 font-medium">{formatCents(totalEarnings)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {keys.length === 0 ? (
          <div className="text-center py-8 text-[#64748b]">
            还没有贡献任何 API Key
            <br />
            <span className="text-sm">贡献闲置 Key 开始赚取收益</span>
          </div>
        ) : (
          keys.map((key) => {
            const stats = keyStats.get(key.id);
            const gradient = PROVIDER_COLORS[key.provider] || 'from-gray-400 to-slate-600';
            const tierInfo = TIER_LABELS[stats?.tier || 'free'] ?? TIER_LABELS['free']!;

            return (
              <div
                key={key.id}
                className={`p-4 rounded-lg ${
                  key.isActive ? 'bg-[#1e293b]' : 'bg-[#1e293b] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm`}>
                      {key.provider.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white capitalize">{key.provider}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierInfo.color}`}>
                          {tierInfo.label}
                        </span>
                        {!key.isActive && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                            已暂停
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#64748b] font-mono">{key.keyPreview}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-[#64748b]">使用次数</div>
                      <div className="font-medium text-white">
                        {formatNumber(stats?.totalCalls || 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#64748b]">贡献收益</div>
                      <div className="font-medium text-green-400">
                        {formatCents(stats?.totalEarnings || 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#64748b]">最后使用</div>
                      <div className="text-sm text-[#94a3b8]">
                        {timeAgo(stats?.lastUsedAt || null)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 简单使用条 */}
                {(stats?.totalCalls || 0) > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-[#0f172a] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full bg-gradient-to-r ${gradient}`}
                        style={{ width: `${Math.min(100, ((stats?.totalCalls || 0) / Math.max(1, totalCalls)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
