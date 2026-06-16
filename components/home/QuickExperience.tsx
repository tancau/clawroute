'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Zap, Play, CheckCircle2, TrendingDown, Clock, Target } from 'lucide-react';

// Demo API Key for testing
const DEMO_API_KEY = 'hopllm-demo-free-2024';

// Preset prompts for quick testing
const PRESET_PROMPTS = [
  { id: 'translate', labelKey: 'presetTranslate', prompt: '请把这句话翻译成英文：人工智能正在改变我们的生活方式' },
  { id: 'code', labelKey: 'presetCode', prompt: '写一个 Python 函数，计算斐波那契数列的第 n 项' },
  { id: 'chat', labelKey: 'presetChat', prompt: '你好，今天天气怎么样？' },
  { id: 'analysis', labelKey: 'presetAnalysis', prompt: '分析一下为什么电动车市场在快速增长' },
];

interface RoutingResult {
  intent: string;
  model: string;
  provider: string;
  latencyMs: number;
  savedPercent: number;
  gpt4Cost: number;
  actualCost: number;
  response: string;
}

export function QuickExperience() {
  const t = useTranslations('quickExperience');
  const [apiKey, setApiKey] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(PRESET_PROMPTS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RoutingResult | null>(null);
  const [error, setError] = useState('');

  const handleTest = async () => {
    setIsLoading(true);
    setError('');
    setResult(null);

    const startTime = Date.now();
    const keyToUse = apiKey.trim() || DEMO_API_KEY;

    try {
      // Simulate API call with demo response
      // In production, this would call the actual API
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      const latencyMs = Date.now() - startTime;
      
      // Determine routing based on prompt type
      let routing: RoutingResult;
      
      if (selectedPrompt.id === 'translate' || selectedPrompt.id === 'chat') {
        // Simple tasks -> cheap model
        routing = {
          intent: selectedPrompt.id === 'translate' ? 'translation' : 'casual_chat',
          model: 'deepseek/deepseek-chat',
          provider: 'deepseek',
          latencyMs,
          savedPercent: 99.5,
          gpt4Cost: 0.03,
          actualCost: 0.00015,
          response: selectedPrompt.id === 'translate' 
            ? 'Artificial intelligence is changing our way of life.'
            : '你好！作为 AI 助手我没有实时天气数据，建议你查看天气应用获取当地天气信息。',
        };
      } else if (selectedPrompt.id === 'code') {
        // Coding task -> balanced model
        routing = {
          intent: 'coding',
          model: 'qwen/qwen-2.5-coder-32b',
          provider: 'openrouter',
          latencyMs,
          savedPercent: 95,
          gpt4Cost: 0.06,
          actualCost: 0.003,
          response: `def fibonacci(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# 更高效的迭代版本
def fibonacci_iterative(n):
    if n <= 0:
        return 0
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a`,
        };
      } else {
        // Analysis -> stronger model
        routing = {
          intent: 'analysis',
          model: 'claude-3-haiku',
          provider: 'anthropic',
          latencyMs,
          savedPercent: 85,
          gpt4Cost: 0.045,
          actualCost: 0.00675,
          response: '电动车市场快速增长的主要原因包括：\n1. 政策支持：各国推出补贴和碳排放法规\n2. 技术进步：电池成本下降，续航提升\n3. 消费观念转变：环保意识增强\n4. 基础设施完善：充电网络扩张\n5. 成本优势：长期使用成本低于燃油车',
        };
      }

      setResult(routing);
    } catch (err) {
      setError(t('errorOccurred'));
    }

    setIsLoading(false);
  };

  return (
    <section className="px-4 py-16 bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00c9ff]/10 border border-[#00c9ff]/30 text-[#00c9ff] text-sm mb-4">
            <Zap className="w-4 h-4" />
            {t('badge')}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {t('title')}
          </h2>
          <p className="text-[#94a3b8] text-sm">
            {t('subtitle')}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 sm:p-8">
          {/* API Key Input */}
          <div className="mb-6">
            <label className="block text-sm text-[#94a3b8] mb-2">
              {t('apiKeyLabel')} <span className="text-[#64748b]">({t('optional')})</span>
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('apiKeyPlaceholder')}
              className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
            />
            {!apiKey && (
              <p className="text-xs text-[#00c9ff] mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {t('demoKeyHint')}
              </p>
            )}
          </div>

          {/* Preset Prompts */}
          <div className="mb-6">
            <label className="block text-sm text-[#94a3b8] mb-2">
              {t('selectPrompt')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPrompt(preset)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedPrompt.id === preset.id
                      ? 'bg-[#00c9ff] text-[#0f172a] font-medium'
                      : 'bg-[#0f172a] text-[#94a3b8] hover:text-white hover:border-[#00c9ff]/50 border border-[#334155]'
                  }`}
                >
                  {t(preset.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Prompt Preview */}
          <div className="mb-6 p-4 bg-[#0f172a] rounded-lg border border-[#334155]">
            <div className="text-xs text-[#64748b] mb-1">{t('promptPreview')}</div>
            <div className="text-white text-sm">{selectedPrompt.prompt}</div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleTest}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-[#0f172a]/30 border-t-[#0f172a] rounded-full animate-spin" />
                {t('processing')}
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                {t('startTest')}
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 space-y-4">
              {/* Big Savings Display */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-xl p-6 text-center">
                <div className="text-4xl sm:text-5xl font-bold text-green-400 mb-2">
                  {t('savedPrefix')} {result.savedPercent}% {t('savedSuffix')}
                </div>
                <div className="text-sm text-[#94a3b8]">
                  {t('costComparison')}: GPT-4 ${result.gpt4Cost.toFixed(3)} → {t('actual')}: ${result.actualCost.toFixed(3)}
                </div>
              </div>

              {/* Routing Details */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-[#0f172a] rounded-lg p-4 border border-[#334155]">
                  <div className="flex items-center gap-2 text-[#00c9ff] mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-sm">{t('intentDetection')}</span>
                  </div>
                  <div className="text-white font-medium capitalize">{result.intent}</div>
                </div>
                <div className="bg-[#0f172a] rounded-lg p-4 border border-[#334155]">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">{t('selectedModel')}</span>
                  </div>
                  <div className="text-white font-medium">{result.model}</div>
                </div>
                <div className="bg-[#0f172a] rounded-lg p-4 border border-[#334155]">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{t('latency')}</span>
                  </div>
                  <div className="text-white font-medium">{result.latencyMs}ms</div>
                </div>
              </div>

              {/* Response Preview */}
              <div className="bg-[#0f172a] rounded-lg p-4 border border-[#334155]">
                <div className="text-xs text-[#64748b] mb-2">{t('responsePreview')}</div>
                <div className="text-white text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {result.response}
                </div>
              </div>

              {/* CTA */}
              <div className="text-center pt-4">
                <p className="text-[#94a3b8] text-sm mb-4">{t('ctaHint')}</p>
                <a
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#00c9ff] text-[#0f172a] font-semibold rounded-lg hover:bg-[#00c9ff]/90 transition-colors"
                >
                  {t('getApiKey')}
                  <TrendingDown className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}