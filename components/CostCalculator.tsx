'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';

interface CostCalculatorProps {
  defaultMonthlyCalls?: number;
  defaultAvgTokensPerCall?: number;
}

export function CostCalculator({
  defaultMonthlyCalls = 10000,
  defaultAvgTokensPerCall = 5000
}: CostCalculatorProps) {
  const t = useTranslations('calculator');
  
  const [monthlyCalls, setMonthlyCalls] = useState(defaultMonthlyCalls);
  const [avgTokens, setAvgTokens] = useState(defaultAvgTokensPerCall);
  
  // Assume average cost of $0.01 per 1K tokens with expensive models
  const naiveCostPer1K = 0.01;
  // With smart routing, average drops to $0.003 per 1K tokens
  
  const calculations = useMemo(() => {
    const totalTokens = monthlyCalls * avgTokens;
    
    // Naive approach: all expensive models
    const naiveMonthly = (totalTokens / 1000) * naiveCostPer1K;
    
    // Smart routing: 70% savings
    const smartMonthly = naiveMonthly * 0.3;
    
    const savings = naiveMonthly - smartMonthly;
    const savingsPercent = Math.round((savings / naiveMonthly) * 100);
    
    return {
      totalTokens,
      naiveMonthly,
      smartMonthly,
      savings,
      savingsPercent
    };
  }, [monthlyCalls, avgTokens]);
  
  const presets = [
    { label: '个人使用', calls: 5000, tokens: 2000 },
    { label: '小型项目', calls: 20000, tokens: 3000 },
    { label: '中型项目', calls: 100000, tokens: 5000 },
    { label: '大型项目', calls: 500000, tokens: 8000 },
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
            className="px-3 py-1.5 text-sm rounded-lg bg-[#0a0a0a] text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#00c9ff]/50 border border-[#2a2d3a] transition-colors"
          >
            {preset.label}
          </button>
        ))}
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
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#94a3b8]">
              ${calculations.naiveMonthly.toFixed(2)}
            </div>
            <div className="text-sm text-[#94a3b8]">{t('withoutClawroute')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00c9ff]">
              ${calculations.smartMonthly.toFixed(2)}
            </div>
            <div className="text-sm text-[#94a3b8]">{t('withClawroute')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] bg-clip-text text-transparent">
              {calculations.savingsPercent}%
            </div>
            <div className="text-sm text-[#94a3b8]">{t('savings')}</div>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-4xl font-bold text-[#92fe9d] mb-2">
            ${calculations.savings.toFixed(2)}/{t('month')}
          </div>
          <div className="text-[#94a3b8]">
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
