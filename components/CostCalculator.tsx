'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import scenesData from '@/data/scenes.json';

interface CostCalculatorProps {
  defaultMonthlyCalls?: number;
  defaultAvgTokensPerCall?: number;
}

// 解析 "60-80%" 格式的节省率区间，返回中点
function parseSavingMidpoint(range: string): number {
  const m = range.match(/(\d+)-(\d+)/);
  const lo = m?.[1];
  const hi = m?.[2];
  return lo && hi ? (parseInt(lo, 10) + parseInt(hi, 10)) / 2 : 50;
}

export function CostCalculator({
  defaultMonthlyCalls = 10000,
  defaultAvgTokensPerCall = 5000
}: CostCalculatorProps) {
  const t = useTranslations('calculator');

  const [monthlyCalls, setMonthlyCalls] = useState(defaultMonthlyCalls);
  const [avgTokens, setAvgTokens] = useState(defaultAvgTokensPerCall);
  const [selectedScene, setSelectedScene] = useState('average');

  // 基准：用户不使用 HopLLM 时倾向选昂贵模型（GPT-4o 输入+输出加权混合 ~$10/1M）
  // 该值为 OpenAI 官方定价的代表性混合值，仅用于换算美元金额
  const baselineCostPer1M = 10.0;

  // 节省率来自 data/scenes.json 各场景的 estimatedSaving（真实场景化数据）
  const scenes = scenesData.scenes;
  const blendedSavings = useMemo(() => {
    const mids = scenes.map((s) => parseSavingMidpoint(s.estimatedSaving));
    return mids.reduce((a, b) => a + b, 0) / (mids.length || 1);
  }, [scenes]);

  const savingsPercent = useMemo(() => {
    if (selectedScene === 'average') return blendedSavings;
    const scene = scenes.find((s) => s.id === selectedScene);
    return scene ? parseSavingMidpoint(scene.estimatedSaving) : blendedSavings;
  }, [selectedScene, scenes, blendedSavings]);

  const calculations = useMemo(() => {
    const totalTokens = monthlyCalls * avgTokens;

    // Naive: 全部走昂贵基准模型
    const naiveMonthly = (totalTokens / 1_000_000) * baselineCostPer1M;

    // Smart: 按场景节省率换算（非极端最便宜对比，反映真实路由混合）
    const smartMonthly = naiveMonthly * (1 - savingsPercent / 100);

    const savings = naiveMonthly - smartMonthly;
    const savingsPercentRounded = naiveMonthly > 0 ? Math.round(savingsPercent) : 0;

    return {
      totalTokens,
      naiveMonthly,
      smartMonthly,
      savings,
      savingsPercent: savingsPercentRounded,
    };
  }, [monthlyCalls, avgTokens, savingsPercent]);

  const presets = [
    { label: t('presetPersonal'), calls: 5000, tokens: 2000 },
    { label: t('presetSmall'), calls: 20000, tokens: 3000 },
    { label: t('presetMedium'), calls: 100000, tokens: 5000 },
    { label: t('presetLarge'), calls: 500000, tokens: 8000 },
  ];

  return (
    <div className="bg-[#1a1d29] rounded-2xl p-6 border border-[#2a2d3a]">
      <h3 className="text-xl font-bold text-[#f8fafc] mb-6">{t('title')}</h3>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              setMonthlyCalls(preset.calls);
              setAvgTokens(preset.tokens);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#0a0a0a] text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#00c9ff]/50 border border-[#2a2d3a] transition-colors whitespace-nowrap flex-shrink-0"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Scene selector — 节省率按场景动态变化 */}
      <div className="mb-6">
        <label className="block text-sm text-[#94a3b8] mb-2">Scenario</label>
        <select
          value={selectedScene}
          onChange={(e) => setSelectedScene(e.target.value)}
          className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2d3a] rounded-xl text-[#f8fafc] focus:border-[#00c9ff] focus:outline-none"
        >
          <option value="average">Average (all scenarios)</option>
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.icon} {scene.name} ({scene.estimatedSaving})
            </option>
          ))}
        </select>
      </div>

      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm text-[#94a3b8] mb-2">
            {t('monthlyCalls')}
          </label>
          <input
            type="number"
            value={monthlyCalls}
            onChange={(e) => setMonthlyCalls(Number(e.target.value))}
            className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2d3a] rounded-xl text-[#f8fafc] focus:border-[#00c9ff] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-[#94a3b8] mb-2">
            {t('avgTokens')}
          </label>
          <input
            type="number"
            value={avgTokens}
            onChange={(e) => setAvgTokens(Number(e.target.value))}
            className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2d3a] rounded-xl text-[#f8fafc] focus:border-[#00c9ff] focus:outline-none"
          />
        </div>
      </div>

      {/* Results */}
      <div className="bg-[#0a0a0a] rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#94a3b8]">
              ${calculations.naiveMonthly.toFixed(2)}
            </div>
            <div className="text-sm text-[#94a3b8] whitespace-nowrap">{t('withoutHopllm')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00c9ff]">
              ${calculations.smartMonthly.toFixed(2)}
            </div>
            <div className="text-sm text-[#94a3b8] whitespace-nowrap">{t('withHopllm')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] bg-clip-text text-transparent">
              {calculations.savingsPercent}%
            </div>
            <div className="text-sm text-[#94a3b8] whitespace-nowrap">{t('savings')}</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-4xl font-bold text-[#92fe9d] mb-2">
            ${calculations.savings.toFixed(2)}/{t('month')}
          </div>
          <div className="text-[#94a3b8] whitespace-nowrap">
            {t('annualSavings')}: ${(calculations.savings * 12).toFixed(0)}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 text-center">
        <a
          href="#scenes"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          {t('cta')}
        </a>
      </div>
    </div>
  );
}
