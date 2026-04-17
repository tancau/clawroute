'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface UsageChartProps {
  userId: string;
  days?: number;
}

interface DailyUsage {
  date: string;
  requests: number;
  costCents: number;
  savedCents: number;
}

export function UsageChart({ userId, days = 7 }: UsageChartProps) {
  const [data, setData] = useState<DailyUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsage();
  }, [userId, days]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsage = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.getSavings(userId);

      if (result.data) {
        // 只显示最近 N 天
        setData(result.data.daily.slice(0, days));
      }

      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError('Failed to load usage data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <div className="text-center text-[#94a3b8]">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <div className="text-center text-red-400">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📊 使用趋势</h3>
        <div className="text-center text-[#94a3b8]">暂无使用数据</div>
      </div>
    );
  }

  // 计算最大值用于缩放
  const maxRequests = Math.max(...data.map(d => d.requests), 1);

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📊 使用趋势（最近 {days} 天）</h3>

      <div className="space-y-2">
        {data.map((day, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="text-sm text-[#94a3b8] w-20">{day.date}</div>
            
            {/* 请求量条 */}
            <div className="flex-1">
              <div className="relative h-6 bg-[#1e293b] rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] rounded"
                  style={{ width: `${(day.requests / maxRequests) * 100}%` }}
                />
                <div className="absolute inset-y-0 left-2 flex items-center text-xs text-white">
                  {day.requests} 次
                </div>
              </div>
            </div>

            {/* 成本 */}
            <div className="text-sm text-[#94a3b8] w-16 text-right">
              ${(day.costCents / 100).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[#1e293b] flex justify-between text-sm">
        <div className="text-[#94a3b8]">
          总请求: <span className="text-white font-semibold">
            {data.reduce((sum, d) => sum + d.requests, 0)}
          </span> 次
        </div>
        <div className="text-[#94a3b8]">
          总成本: <span className="text-white font-semibold">
            ${(data.reduce((sum, d) => sum + d.costCents, 0) / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}