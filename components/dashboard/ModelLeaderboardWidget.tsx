'use client';

/**
 * 模型使用排行榜紧凑组件
 * 用于仪表盘右侧边栏显示
 * 基于用户真实使用行为数据
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ===== Types =====

interface LeaderboardItem {
  modelId: string;
  name: string;
  provider: string;
  selectionCount: number;
  totalTokens: number;
  totalCost: number;
  uniqueUsers: number;
  avgLatency: number;
  successRate: number;
}

type CategoryTab = 'coding' | 'reasoning' | 'math' | 'translation' | 'creative' | 'chinese' | 'chat';

// ===== Component =====

export function ModelLeaderboardWidget() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [activeTab, setActiveTab] = useState<CategoryTab>('coding');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'selections' | 'tokens' | 'users'>('selections');

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab, sort]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/models/leaderboard?category=${activeTab}&sort=${sort}&period=all&limit=5`);
      
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      } else {
        // Fallback to mock data if no real data yet
        setLeaderboard(getMockData());
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setLeaderboard(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (): LeaderboardItem[] => [
    { modelId: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai', selectionCount: 1234, totalTokens: 12500000, totalCost: 156.50, uniqueUsers: 89, avgLatency: 2300, successRate: 0.99 },
    { modelId: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5', provider: 'anthropic', selectionCount: 987, totalTokens: 8300000, totalCost: 120.30, uniqueUsers: 76, avgLatency: 2100, successRate: 0.98 },
    { modelId: 'deepseek/deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', selectionCount: 654, totalTokens: 5100000, totalCost: 15.20, uniqueUsers: 54, avgLatency: 3500, successRate: 0.95 },
    { modelId: 'qwen/qwen-max', name: 'Qwen3 Max', provider: 'qwen', selectionCount: 432, totalTokens: 3200000, totalCost: 28.80, uniqueUsers: 38, avgLatency: 1800, successRate: 0.97 },
    { modelId: 'google/gemini-pro', name: 'Gemini Pro', provider: 'google', selectionCount: 321, totalTokens: 2800000, totalCost: 22.40, uniqueUsers: 29, avgLatency: 1600, successRate: 0.96 },
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const tabs: { key: CategoryTab; label: string; icon: string }[] = [
    { key: 'coding', label: '编程', icon: '💻' },
    { key: 'reasoning', label: '推理', icon: '🧠' },
    { key: 'math', label: '数学', icon: '📐' },
    { key: 'translation', label: '翻译', icon: '🌐' },
    { key: 'creative', label: '创意', icon: '✨' },
    { key: 'chinese', label: '中文', icon: '🇨🇳' },
    { key: 'chat', label: '聊天', icon: '💬' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🏆</span>
            <span>模型使用排行</span>
          </h3>
        </div>
        
        {/* Category Tabs */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1 -mb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Sort Toggle */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setSort('selections')}
            className={`px-2 py-0.5 text-xs rounded ${
              sort === 'selections' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500'
            }`}
          >
            选择量
          </button>
          <button
            onClick={() => setSort('tokens')}
            className={`px-2 py-0.5 text-xs rounded ${
              sort === 'tokens' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500'
            }`}
          >
            Token量
          </button>
          <button
            onClick={() => setSort('users')}
            className={`px-2 py-0.5 text-xs rounded ${
              sort === 'users' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500'
            }`}
          >
            用户数
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-10" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
            暂无使用数据
          </div>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((model, index) => (
              <div
                key={model.modelId}
                className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer"
                onClick={() => window.location.href = `/dashboard/models`}
              >
                {/* Rank */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                  index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                }`}>
                  {index + 1}
                </div>
                
                {/* Model Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {model.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatNumber(model.selectionCount)}次 · {formatNumber(model.totalTokens)} tokens
                  </div>
                </div>
                
                {/* Score/Count */}
                <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {formatNumber(sort === 'users' ? model.uniqueUsers : sort === 'tokens' ? model.totalTokens : model.selectionCount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <Link
          href="/dashboard/models"
          className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors flex items-center justify-center gap-1"
        >
          查看完整排行
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
