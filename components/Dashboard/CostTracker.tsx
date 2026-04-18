'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface CostTrackerProps {
  userId: string;
}

interface SavingsData {
  totalSavedCents: number;
  totalSavedDollars: number;
  averageSavedPercent: number;
  daily: Array<{
    date: string;
    savedCents: number;
  }>;
}

export function CostTracker({ userId }: CostTrackerProps) {
  const [data, setData] = useState<SavingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSavings();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSavings = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.getSavings(userId);

      if (result.data) {
        setData(result.data);
      }

      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError('Failed to load savings data');
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

  if (!data || data.totalSavedCents === 0) {
    return (
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">💰 成本节省</h3>
        <div className="text-center py-8">
          <div className="text-4xl font-bold text-[#00c9ff] mb-2">$0.00</div>
          <div className="text-[#94a3b8]">还没有节省数据，开始使用吧！</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">💰 成本节省</h3>

      {/* 大数字展示 */}
      <div className="text-center py-6 bg-gradient-to-r from-[#00c9ff]/10 to-[#92fe9d]/10 rounded-lg mb-6">
        <div className="text-5xl font-bold text-[#00c9ff] mb-2">
          ${data.totalSavedDollars.toFixed(2)}
        </div>
        <div className="text-[#94a3b8]">
          相比使用 GPT-4 节省了 
          <span className="text-[#92fe9d] font-semibold">{data.averageSavedPercent}%</span>
        </div>
      </div>

      {/* 节省趋势 */}
      {data.daily.length > 0 && (
        <div>
          <div className="text-sm text-[#94a3b8] mb-3">最近节省趋势</div>
          <div className="space-y-2">
            {data.daily.slice(0, 7).map((day, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-[#94a3b8]">{day.date}</span>
                <span className="text-[#92fe9d]">
                  ${(day.savedCents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 提示 */}
      <div className="mt-4 pt-4 border-t border-[#1e293b]">
        <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
          <span>💡</span>
          <span>
            智能路由为您选择了更经济的模型，每次请求都在省钱！
          </span>
        </div>
      </div>
    </div>
  );
}