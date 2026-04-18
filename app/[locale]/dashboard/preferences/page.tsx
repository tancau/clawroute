'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type OptimizationGoal = 'cost' | 'quality' | 'speed' | 'balanced';

interface Preferences {
  optimizationGoal: OptimizationGoal;
  modelPreferences: {
    coding: 'free' | 'paid';
    reasoning: 'free' | 'paid';
    translation: 'free' | 'paid';
    creative: 'free' | 'paid';
  };
  budget: {
    maxPerRequest: number;
    dailyLimit: number;
    autoDowngrade: boolean;
  };
  excludedModels: string[];
}

const AVAILABLE_MODELS = [
  { id: 'gpt-5.4', name: 'GPT-5.4', cost: 'paid' },
  { id: 'gpt-4o', name: 'GPT-4o', cost: 'paid' },
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', cost: 'paid' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', cost: 'paid' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', cost: 'paid' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', cost: 'paid' },
  { id: 'qwen3-max', name: 'Qwen3 Max', cost: 'paid' },
  { id: 'qwen-free', name: 'Qwen Free', cost: 'free' },
  { id: 'gemma-free', name: 'Gemma Free', cost: 'free' },
  { id: 'llama-free', name: 'Llama Free', cost: 'free' },
];

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>({
    optimizationGoal: 'cost',
    modelPreferences: {
      coding: 'free',
      reasoning: 'paid',
      translation: 'free',
      creative: 'paid',
    },
    budget: {
      maxPerRequest: 0.01,
      dailyLimit: 1.0,
      autoDowngrade: true,
    },
    excludedModels: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load preferences from localStorage
    const stored = localStorage.getItem('clawrouter_preferences');
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse preferences:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save to localStorage
    localStorage.setItem('clawrouter_preferences', JSON.stringify(preferences));
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleExcludedModel = (modelId: string) => {
    setPreferences((prev) => ({
      ...prev,
      excludedModels: prev.excludedModels.includes(modelId)
        ? prev.excludedModels.filter((id) => id !== modelId)
        : [...prev.excludedModels, modelId],
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">⚙️ 偏好设置</h1>
            <p className="text-[#94a3b8] mt-1">自定义你的智能路由策略</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors"
          >
            返回控制台
          </Link>
        </div>

        {/* Optimization Goal */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">🎯 优化目标</h2>
          <p className="text-[#94a3b8] text-sm mb-4">选择系统优化的主要方向</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'cost', label: '成本优先', desc: '最大化省钱', icon: '💰' },
              { value: 'quality', label: '质量优先', desc: '使用高质量模型', icon: '⭐' },
              { value: 'speed', label: '速度优先', desc: '最低延迟', icon: '⚡' },
              { value: 'balanced', label: '平衡模式', desc: '综合考虑', icon: '⚖️' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setPreferences((prev) => ({ ...prev, optimizationGoal: item.value as OptimizationGoal }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  preferences.optimizationGoal === item.value
                    ? 'border-[#00c9ff] bg-[#00c9ff]/10'
                    : 'border-[#1e293b] hover:border-[#334155]'
                }`}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-white font-medium">{item.label}</div>
                <div className="text-xs text-[#94a3b8] mt-1">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Model Preferences */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">🤖 模型偏好</h2>
          <p className="text-[#94a3b8] text-sm mb-4">为不同任务类型设置模型偏好</p>

          <div className="space-y-4">
            {[
              { key: 'coding', label: '编码任务', icon: '💻' },
              { key: 'reasoning', label: '复杂推理', icon: '🧠' },
              { key: 'translation', label: '翻译任务', icon: '🌐' },
              { key: 'creative', label: '创意写作', icon: '✨' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-[#1e293b] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-white">{item.label}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        modelPreferences: { ...prev.modelPreferences, [item.key]: 'free' },
                      }))
                    }
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      preferences.modelPreferences[item.key as keyof typeof preferences.modelPreferences] === 'free'
                        ? 'bg-green-500 text-white'
                        : 'bg-[#334155] text-[#94a3b8]'
                    }`}
                  >
                    优先免费
                  </button>
                  <button
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        modelPreferences: { ...prev.modelPreferences, [item.key]: 'paid' },
                      }))
                    }
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      preferences.modelPreferences[item.key as keyof typeof preferences.modelPreferences] === 'paid'
                        ? 'bg-purple-500 text-white'
                        : 'bg-[#334155] text-[#94a3b8]'
                    }`}
                  >
                    允许付费
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Control */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">💵 预算控制</h2>
          <p className="text-[#94a3b8] text-sm mb-4">设置成本上限，防止超支</p>

          <div className="space-y-6">
            <div>
              <label className="block text-white text-sm mb-2">单次请求上限 ($)</label>
              <input
                type="number"
                step="0.001"
                value={preferences.budget.maxPerRequest}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, maxPerRequest: parseFloat(e.target.value) || 0 },
                  }))
                }
                className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#00c9ff]"
              />
              <div className="text-xs text-[#64748b] mt-1">超过此金额的请求将被降级</div>
            </div>

            <div>
              <label className="block text-white text-sm mb-2">每日预算 ($)</label>
              <input
                type="number"
                step="0.1"
                value={preferences.budget.dailyLimit}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, dailyLimit: parseFloat(e.target.value) || 0 },
                  }))
                }
                className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#00c9ff]"
              />
              <div className="text-xs text-[#64748b] mt-1">每日总成本上限</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#1e293b] rounded-lg">
              <div>
                <div className="text-white">超预算自动降级</div>
                <div className="text-sm text-[#94a3b8]">当超过预算时，自动切换到免费模型</div>
              </div>
              <button
                onClick={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, autoDowngrade: !prev.budget.autoDowngrade },
                  }))
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.budget.autoDowngrade ? 'bg-green-500' : 'bg-[#334155]'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.budget.autoDowngrade ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Excluded Models */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">🚫 排除模型</h2>
          <p className="text-[#94a3b8] text-sm mb-4">选择不想使用的模型</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => toggleExcludedModel(model.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  preferences.excludedModels.includes(model.id)
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-[#1e293b] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">{model.name}</span>
                  {preferences.excludedModels.includes(model.id) && (
                    <span className="text-red-400 text-xs">已排除</span>
                  )}
                </div>
                <div className="text-xs text-[#64748b] mt-1">
                  {model.cost === 'free' ? '🆓 免费' : '💰 付费'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? '保存中...' : saved ? '已保存 ✅' : '保存设置'}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors"
          >
            取消
          </Link>
        </div>
      </div>
    </div>
  );
}
