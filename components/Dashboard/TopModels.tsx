'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/store/use-user-store';

interface TopModelsProps {
  userId: string;
}

export function TopModels({ userId }: TopModelsProps) {
  const { topModels, fetchTopModels, isLoading } = useUserStore();

  // Fetch on mount
  useEffect(() => {
    if (!topModels.length) {
      fetchTopModels(userId);
    }
  }, [userId, topModels.length, fetchTopModels]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  // Get top model for highlighting
  const topModel = topModels[0];

  if (!topModels.length && isLoading) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">🏆 热门模型</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="w-6 h-6 bg-[#1e293b] rounded"></div>
              <div className="h-4 bg-[#1e293b] rounded flex-1"></div>
              <div className="h-4 bg-[#1e293b] rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!topModels.length) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">🏆 热门模型</h2>
        <p className="text-[#94a3b8] text-center py-8">暂无模型使用记录</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">🏆 热门模型</h2>
        <button
          onClick={() => fetchTopModels(userId)}
          className="text-[#94a3b8] hover:text-white transition-colors text-sm"
        >
          🔄 刷新
        </button>
      </div>
      
      <div className="space-y-3">
        {topModels.map((model, index) => {
          const isTop = index === 0;
          const percentage = topModel?.requests ? Math.round((model.requests / topModel.requests) * 100) : 0;
          
          return (
            <div key={model.model} className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-sm ${
                    isTop ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#1e293b] text-[#94a3b8]'
                  }`}>
                    {index + 1}
                  </span>
                  <span className={`font-medium ${isTop ? 'text-white' : 'text-[#94a3b8]'}`}>
                    {model.model}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[#94a3b8] text-sm">{model.requests} 次</span>
                  <span className="text-green-400 text-sm ml-2">
                    ${(model.totalCostDollars || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isTop ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-[#334155]'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#64748b] mt-1">
                <span>{formatTokens(model.totalTokens)} tokens</span>
                <span>{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}