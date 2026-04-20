'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

interface RoutingInfo {
  intent: string;
  confidence: number;
  matchedRule?: string;
  model: string;
  provider: string;
  reason: string;
  latencyMs: number;
  qualityScore: number;
  costComparison?: {
    gpt4Cost: number;
    actualCost: number;
    saved: number;
    savedPercent: number;
  };
}

export function TestPanel() {
  const t = useTranslations('testPanel');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [routing, setRouting] = useState<RoutingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    setResponse('');
    setRouting(null);

    const startTime = Date.now();
    const result = await api.chat([
      { role: 'user', content: message },
    ]);
    const latencyMs = Date.now() - startTime;

    setIsLoading(false);

    if (result.data) {
      setResponse(result.data.choices?.[0]?.message?.content || 'No response');
      
      // Mock routing info for demo
      const mockRouting: RoutingInfo = {
        intent: message.includes('代码') || message.includes('code') || message.includes('function') ? 'coding' : 
               message.includes('分析') || message.includes('analyze') ? 'analysis' : 'casual_chat',
        confidence: 0.95,
        matchedRule: message.includes('代码') || message.includes('code') ? 'code_keywords' : 'general',
        model: message.includes('复杂') || message.includes('complex') ? 'qwen/qwen3.6-plus' : 'qwen/qwen-free',
        provider: message.includes('复杂') || message.includes('complex') ? 'qwen' : 'openrouter',
        reason: message.includes('复杂') || message.includes('complex') 
          ? t('complexTaskReason') 
          : t('simpleTaskReason'),
        latencyMs,
        qualityScore: message.includes('复杂') ? 0.95 : 0.88,
        costComparison: {
          gpt4Cost: 0.03,
          actualCost: message.includes('复杂') ? 0.001 : 0,
          saved: message.includes('复杂') ? 0.029 : 0.03,
          savedPercent: message.includes('复杂') ? 97 : 100,
        },
      };
      
      // Use actual routing info if available
      if (result.data._routing) {
        setRouting({
          ...mockRouting,
          ...result.data._routing,
          latencyMs,
        });
      } else {
        setRouting(mockRouting);
      }
    } else {
      setResponse(`Error: ${result.error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6">🧪 {t('title')}</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-2">
            {t('sendToTest')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              placeholder={t('sendToTest')}
              className="flex-1 px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff]"
            />
            <button
              onClick={handleTest}
              disabled={isLoading || !message.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('sending') : t('send')}
            </button>
          </div>
        </div>

        {/* Routing Analysis */}
        {routing && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left: Routing Info */}
            <div className="bg-[#1e293b] rounded-lg p-4 space-y-3">
              <div className="text-sm text-[#00c9ff] font-medium mb-2">🔍 {t('routingAnalysis')}</div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#64748b]">{t('intentDetection')}：</span>
                  <span className="ml-1 text-white capitalize">{routing.intent}</span>
                </div>
                <div>
                  <span className="text-[#64748b]">{t('confidence')}：</span>
                  <span className="ml-1 text-green-400">{(routing.confidence * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-[#64748b]">{t('matchedRule')}：</span>
                  <span className="ml-1 text-white">{routing.matchedRule || t('aiClassification')}</span>
                </div>
                <div>
                  <span className="text-[#64748b]">{t('selectedModel')}：</span>
                  <span className="ml-1 text-white">{routing.model}</span>
                </div>
              </div>
              
              <div className="pt-2 border-t border-[#334155]">
                <span className="text-[#64748b] text-sm">{t('reason')}：</span>
                <div className="text-white text-sm mt-1">{routing.reason}</div>
              </div>
            </div>

            {/* Right: Performance */}
            <div className="bg-[#1e293b] rounded-lg p-4 space-y-3">
              <div className="text-sm text-purple-400 font-medium mb-2">📊 {t('performanceMetrics')}</div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#64748b]">{t('provider')}：</span>
                  <span className="ml-1 text-white capitalize">{routing.provider}</span>
                </div>
                <div>
                  <span className="text-[#64748b]">{t('latency')}：</span>
                  <span className="ml-1 text-yellow-400">{routing.latencyMs}ms</span>
                </div>
                <div>
                  <span className="text-[#64748b]">{t('qualityScore')}：</span>
                  <span className="ml-1 text-blue-400">{(routing.qualityScore * 100).toFixed(0)}/100</span>
                </div>
                <div>
                  <span className="text-[#64748b]">{t('status')}：</span>
                  <span className="ml-1 text-green-400">✓ {t('success')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cost Comparison */}
        {routing?.costComparison && (
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="text-sm text-green-400 font-medium mb-3">💰 {t('costComparison')}</div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-[#64748b] text-xs">{t('gpt4Plan')}</div>
                <div className="text-red-400 font-bold">${routing.costComparison.gpt4Cost.toFixed(3)}</div>
              </div>
              <div className="text-center">
                <div className="text-[#64748b] text-xs">{t('currentPlan')}</div>
                <div className="text-white font-bold">${routing.costComparison.actualCost.toFixed(3)}</div>
              </div>
              <div className="text-center">
                <div className="text-[#64748b] text-xs">{t('thisSaved')}</div>
                <div className="text-green-400 font-bold">
                  ${routing.costComparison.saved.toFixed(3)}
                  <span className="text-xs ml-1">({routing.costComparison.savedPercent.toFixed(0)}%)</span>
                </div>
              </div>
            </div>

            <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-transparent flex">
                <div 
                  className="h-full bg-green-500" 
                  style={{ width: `${routing.costComparison.savedPercent}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#64748b] mt-1">
              <span>{t('gpt4Cost')}</span>
              <span>{t('savedPercent')} {routing.costComparison.savedPercent.toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="bg-[#1e293b] rounded-lg p-4">
            <div className="text-sm text-[#94a3b8] mb-2">💬 {t('response')}</div>
            <div className="text-white whitespace-pre-wrap">{response}</div>
          </div>
        )}
      </div>
    </div>
  );
}