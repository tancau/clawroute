'use client';

import { useState, useEffect } from 'react';

interface ProviderStatusData {
  name: string;
  availableKeys: number;
  totalKeys: number;
  avgLatencyMs: number;
  successRate: number;
  successRatePercent: number;
  lastError?: string;
  lastErrorAt?: number;
  isHealthy: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  deepseek: 'DeepSeek',
  qwen: 'Qwen (阿里)',
  grok: 'Grok (xAI)',
  mistral: 'Mistral',
  llama: 'Meta Llama',
  openrouter: 'OpenRouter',
  litellm: 'LiteLLM Proxy',
};

function getSuccessRateColor(rate: number): string {
  if (rate >= 0.95) return 'text-green-400';
  if (rate >= 0.80) return 'text-yellow-400';
  return 'text-red-400';
}

function getSuccessRateBg(rate: number): string {
  if (rate >= 0.95) return 'bg-green-500/20';
  if (rate >= 0.80) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
}

function getHealthBadge(isHealthy: boolean) {
  return isHealthy ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      健康
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      异常
    </span>
  );
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProviderStatus() {
  const [providers, setProviders] = useState<ProviderStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviderStatus();
    // 每 60 秒刷新
    const interval = setInterval(fetchProviderStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchProviderStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/v1/providers/status`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setProviders(data.providers || []);
      setError(null);
    } catch (err) {
      setError('无法获取 Provider 状态');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Provider 状态</h2>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-16 bg-[#1e293b] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Provider 状态</h2>
        <div className="text-center py-8 text-[#64748b]">{error}</div>
        <button
          onClick={fetchProviderStatus}
          className="w-full py-2 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  const healthyCount = providers.filter(p => p.isHealthy).length;
  const totalKeys = providers.reduce((sum, p) => sum + p.availableKeys, 0);

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Provider 状态</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-400">{healthyCount}/{providers.length} 健康</span>
          <span className="text-[#94a3b8]">{totalKeys} Keys 可用</span>
        </div>
      </div>

      <div className="space-y-2">
        {providers.length === 0 ? (
          <div className="text-center py-8 text-[#64748b]">暂无 Provider 数据</div>
        ) : (
          providers.map(provider => (
            <div
              key={provider.name}
              className={`p-4 rounded-lg border ${
                provider.isHealthy
                  ? 'bg-[#1e293b] border-transparent'
                  : 'bg-[#1e293b] border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">
                    {PROVIDER_LABELS[provider.name] || provider.name}
                  </span>
                  {getHealthBadge(provider.isHealthy)}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <span className="text-[#64748b]">Keys </span>
                    <span className="text-white font-medium">
                      {provider.availableKeys}/{provider.totalKeys}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#64748b]">请求 </span>
                    <span className="text-white font-medium">
                      {provider.totalRequests.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#64748b]">成功率</span>
                  <span className={`font-medium ${getSuccessRateColor(provider.successRate)}`}>
                    {provider.successRatePercent}%
                  </span>
                  <div className={`px-2 py-0.5 rounded text-xs ${getSuccessRateBg(provider.successRate)}`}>
                    {provider.successRate >= 0.95 ? '优秀' : provider.successRate >= 0.80 ? '良好' : '警告'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#64748b]">延迟</span>
                  <span className={`font-medium ${
                    provider.avgLatencyMs < 500 ? 'text-green-400' :
                    provider.avgLatencyMs < 1500 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {provider.avgLatencyMs > 0 ? `${provider.avgLatencyMs}ms` : '--'}
                  </span>
                </div>
                {provider.lastError && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748b]">最后错误</span>
                    <span className="text-red-400 text-xs truncate max-w-[200px]">
                      {provider.lastError}
                    </span>
                    <span className="text-[#475569] text-xs">
                      {formatTime(provider.lastErrorAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
