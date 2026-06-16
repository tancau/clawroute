'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Key, Sparkles, Info } from 'lucide-react';

// Demo API Key for new users
const DEMO_API_KEY = 'hopllm-demo-free-2024';

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
  const [apiKey, setApiKey] = useState('');
  const [useDemoKey, setUseDemoKey] = useState(true);
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
    const keyToUse = useDemoKey ? DEMO_API_KEY : apiKey;
    
    // For demo, simulate the API call
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
    
    const result = await api.chat([
      { role: 'user', content: message },
    ], keyToUse);
    const latencyMs = Date.now() - startTime;

    setIsLoading(false);

    if (result.data || useDemoKey) {
      // Demo mode always succeeds with mock data
      const demoResponse = useDemoKey 
        ? getDemoResponse(message)
        : result.data?.choices?.[0]?.message?.content || 'No response';
      
      setResponse(demoResponse);
      
      // Mock routing info for demo
      const mockRouting: RoutingInfo = {
        intent: message.includes('代码') || message.includes('code') || message.includes('function') ? 'coding' : 
               message.includes('分析') || message.includes('analyze') ? 'analysis' : 'casual_chat',
        confidence: 0.95,
        matchedRule: message.includes('代码') || message.includes('code') ? 'code_keywords' : 'general',
        model: message.includes('复杂') || message.includes('complex') ? 'qwen/qwen3-coder' : 'qwen/qwen3-coder-free',
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
      if (result.data?._routing) {
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

  // Generate demo response based on message type
  const getDemoResponse = (msg: string): string => {
    if (msg.includes('代码') || msg.includes('code') || msg.includes('function')) {
      return `def example_function():
    """这是一个示例函数"""
    return "Hello from HopLLM!"

# 智能路由选择了性价比最优的模型来处理您的请求`;
    }
    if (msg.includes('翻译') || msg.includes('translate')) {
      return 'Translation: This is a demo response showing how HopLLM routes your request to the optimal model.';
    }
    if (msg.includes('分析') || msg.includes('analyze')) {
      return '分析结果：HopLLM 智能路由系统已识别此请求为分析类任务，自动选择了适合的模型进行处理。相比直接使用 GPT-4，本次请求节省了 97% 的成本。';
    }
    return `您好！这是 HopLLM 的 Demo 响应。

智能路由已识别您的请求类型，并自动选择了最优模型：
- 意图分类：${msg.includes('代码') ? '编码任务' : '日常对话'}
- 选择模型：免费模型（节省 100% 成本）
- 响应延迟：约 500ms

注册获取您的 API Key，解锁完整功能！`;
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        🧪 {t('title')}
        {useDemoKey && (
          <span className="px-2 py-0.5 bg-[#00c9ff]/10 text-[#00c9ff] text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Demo Mode
          </span>
        )}
      </h2>

      {/* API Key Section */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUseDemoKey(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              useDemoKey 
                ? 'bg-[#00c9ff] text-[#0f172a] font-medium' 
                : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {t('useDemoKey')}
          </button>
          <button
            onClick={() => setUseDemoKey(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              !useDemoKey 
                ? 'bg-[#00c9ff] text-[#0f172a] font-medium' 
                : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            {t('useMyKey')}
          </button>
        </div>

        {!useDemoKey && (
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('apiKeyPlaceholder')}
            className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff]"
          />
        )}

        {useDemoKey && (
          <div className="flex items-start gap-2 p-3 bg-[#1e293b] rounded-lg text-sm">
            <Info className="w-4 h-4 text-[#00c9ff] mt-0.5" />
            <div className="text-[#94a3b8]">
              <span className="text-[#00c9ff]">{t('demoKeyHint')}</span>
            </div>
          </div>
        )}
      </div>

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

        {/* Cost Comparison - Big Savings Display */}
        {routing?.costComparison && (
          <div className="space-y-4">
            {/* Hero Savings Display */}
            <div className="bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 border-2 border-green-500/50 rounded-xl p-6 text-center relative overflow-hidden">
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 animate-pulse" />
              
              <div className="relative">
                <div className="text-sm text-green-300 mb-2 flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-ping" />
                  {t('costComparison')}
                </div>
                
                <div className="text-5xl sm:text-6xl font-bold text-green-400 mb-3 animate-[pulse_2s_ease-in-out_infinite]">
                  {t('savedPrefix')} {routing.costComparison.savedPercent.toFixed(0)}%{t('savedSuffix')}
                </div>
                
                <div className="text-lg text-white/80 mb-4">
                  {t('savedAmount')}: <span className="text-green-300 font-semibold">${routing.costComparison.saved.toFixed(4)}</span>
                </div>
                
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400/70">GPT-4</span>
                    <span className="text-red-400 font-medium">${routing.costComparison.gpt4Cost.toFixed(3)}</span>
                  </div>
                  <div className="text-[#64748b]">→</div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400/70">{t('currentPlan')}</span>
                    <span className="text-green-400 font-medium">${routing.costComparison.actualCost.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Button */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  // In real app, this would open a feedback modal or form
                  alert(t('feedbackMessage'));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#94a3b8] hover:text-[#00c9ff] hover:border-[#00c9ff]/50 transition-colors"
              >
                <span>🤔</span>
                <span>{t('feedbackButton')}</span>
              </button>
              <button
                onClick={() => {
                  // Copy routing info for sharing
                  const info = `Intent: ${routing.intent}\nModel: ${routing.model}\nSaved: ${routing.costComparison?.savedPercent ?? 0}%`;
                  navigator.clipboard.writeText(info);
                  alert(t('copiedMessage'));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#94a3b8] hover:text-[#00c9ff] hover:border-[#00c9ff]/50 transition-colors"
              >
                <span>📋</span>
                <span>{t('shareButton')}</span>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-[#1e293b] rounded-lg p-4">
              <div className="h-4 bg-[#334155] rounded-full overflow-hidden relative">
                {/* Red portion (GPT-4 cost) */}
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 to-red-400"
                  style={{ width: '100%' }}
                />
                {/* Green portion (savings) */}
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${routing.costComparison.savedPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-red-400">{t('gpt4Cost')}: ${routing.costComparison.gpt4Cost.toFixed(3)}</span>
                <span className="text-green-400 font-medium">{t('savedPercent')} {routing.costComparison.savedPercent.toFixed(0)}%</span>
              </div>
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