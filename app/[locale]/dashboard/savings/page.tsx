'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SavingsData {
  totalRequests: number;
  originalCost: number;
  actualCost: number;
  savedAmount: number;
  savedPercent: number;
  byIntent: {
    intent: string;
    requests: number;
    originalCost: number;
    actualCost: number;
  }[];
  byModel: {
    model: string;
    requests: number;
    percent: number;
  }[];
  lastMonth?: {
    savedAmount: number;
    savedPercent: number;
  };
}

// Mock data
const mockData: SavingsData = {
  totalRequests: 10234,
  originalCost: 156.78,
  actualCost: 18.45,
  savedAmount: 138.33,
  savedPercent: 88,
  byIntent: [
    { intent: 'coding', requests: 5200, originalCost: 78.0, actualCost: 5.2 },
    { intent: 'casual_chat', requests: 3100, originalCost: 46.5, actualCost: 3.1 },
    { intent: 'analysis', requests: 1200, originalCost: 18.0, actualCost: 6.2 },
    { intent: 'translation', requests: 734, originalCost: 11.0, actualCost: 2.5 },
    { intent: 'creative', requests: 500, originalCost: 7.5, actualCost: 1.5 },
  ],
  byModel: [
    { model: 'Qwen-Free', requests: 6652, percent: 65 },
    { model: 'Gemma-Free', requests: 2047, percent: 20 },
    { model: 'GPT-4o-mini', requests: 1023, percent: 10 },
    { model: 'DeepSeek', requests: 512, percent: 5 },
  ],
  lastMonth: {
    savedAmount: 125.50,
    savedPercent: 82,
  },
};

export default function SavingsPage() {
  const [data] = useState<SavingsData>(mockData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">💰 省钱报告</h1>
            <p className="text-[#94a3b8] mt-1">本月成本优化详情</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors"
          >
            返回控制台
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <div className="text-[#94a3b8] text-sm mb-2">总请求数</div>
            <div className="text-2xl font-bold text-white">{data.totalRequests.toLocaleString()}</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <div className="text-[#94a3b8] text-sm mb-2">原始成本</div>
            <div className="text-2xl font-bold text-red-400">${data.originalCost.toFixed(2)}</div>
            <div className="text-xs text-[#64748b] mt-1">全部使用 GPT-4</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <div className="text-[#94a3b8] text-sm mb-2">实际成本</div>
            <div className="text-2xl font-bold text-white">${data.actualCost.toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-6">
            <div className="text-green-400 text-sm mb-2">节省金额</div>
            <div className="text-2xl font-bold text-green-400">${data.savedAmount.toFixed(2)}</div>
            <div className="text-sm text-green-300 mt-1">节省 {data.savedPercent}%</div>
          </div>
        </div>

        {/* Comparison with last month */}
        {data.lastMonth && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">📈 与上月对比</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-[#94a3b8] text-sm">上月节省</div>
                <div className="text-xl font-bold text-white">${data.lastMonth.savedAmount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[#94a3b8] text-sm">本月增长</div>
                <div className="text-xl font-bold text-green-400">
                  +${(data.savedAmount - data.lastMonth.savedAmount).toFixed(2)}
                </div>
                <div className="text-sm text-green-300">
                  +{((data.savedAmount - data.lastMonth.savedAmount) / data.lastMonth.savedAmount * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* By Intent Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">📊 按意图分类</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left text-[#94a3b8] text-sm font-medium py-3">意图</th>
                  <th className="text-right text-[#94a3b8] text-sm font-medium py-3">请求数</th>
                  <th className="text-right text-[#94a3b8] text-sm font-medium py-3">原成本</th>
                  <th className="text-right text-[#94a3b8] text-sm font-medium py-3">实际成本</th>
                  <th className="text-right text-[#94a3b8] text-sm font-medium py-3">节省</th>
                </tr>
              </thead>
              <tbody>
                {data.byIntent.map((item, index) => {
                  const saved = item.originalCost - item.actualCost;
                  const percent = ((saved / item.originalCost) * 100).toFixed(0);
                  return (
                    <tr key={index} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30">
                      <td className="py-4 text-white capitalize">{item.intent}</td>
                      <td className="py-4 text-right text-white">{item.requests.toLocaleString()}</td>
                      <td className="py-4 text-right text-red-400">${item.originalCost.toFixed(2)}</td>
                      <td className="py-4 text-right text-white">${item.actualCost.toFixed(2)}</td>
                      <td className="py-4 text-right text-green-400">${saved.toFixed(2)} ({percent}%)</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Model Distribution */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">🤖 模型使用分布</h2>
          <div className="space-y-4">
            {data.byModel.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white">{item.model}</span>
                  <span className="text-[#94a3b8]">{item.requests.toLocaleString()} ({item.percent}%)</span>
                </div>
                <div className="h-4 bg-[#1e293b] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] rounded-full"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
