'use client';

import { useEffect } from 'react';

import { useUserStore } from '@/store/use-user-store';

interface RecentRequestsProps {
  userId: string;
}

export function RecentRequests({ userId }: RecentRequestsProps) {
  const { recentRequests, fetchRecentRequests, isLoading } = useUserStore();

  // Fetch on mount
  useEffect(() => {
    if (!recentRequests.length) {
      fetchRecentRequests(userId);
    }
  }, [userId, recentRequests.length, fetchRecentRequests]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  if (!recentRequests.length && isLoading) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">📋 最近请求</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-4 bg-[#1e293b] rounded w-20"></div>
              <div className="h-4 bg-[#1e293b] rounded w-24"></div>
              <div className="h-4 bg-[#1e293b] rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!recentRequests.length) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">📋 最近请求</h2>
        <p className="text-[#94a3b8] text-center py-8">暂无请求记录</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">📋 最近请求</h2>
        <button
          onClick={() => fetchRecentRequests(userId)}
          className="text-[#94a3b8] hover:text-white transition-colors text-sm"
        >
          🔄 刷新
        </button>
      </div>
      <div className="space-y-3">
        {recentRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between py-2 border-b border-[#1e293b] last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-[#94a3b8] text-sm">{formatTime(request.timestamp)}</span>
              <span className="text-white font-medium">{request.model}</span>
              <span className="px-2 py-0.5 text-xs bg-[#1e293b] text-[#94a3b8] rounded">
                {request.provider}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[#94a3b8] text-sm">
                {formatTokens(request.totalTokens)} tokens
              </div>
              <div className="text-green-400 text-sm">
                ${request.costDollars.toFixed(4)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}