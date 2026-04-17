'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type AppType = 'browser' | 'desktop' | 'development' | 'other';
type Step = 1 | 2 | 3 | 4;

interface OnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

const APP_TYPES: { type: AppType; label: string; icon: string }[] = [
  { type: 'browser', label: '浏览器插件', icon: '🌐' },
  { type: 'desktop', label: '桌面应用', icon: '💻' },
  { type: 'development', label: '开发项目', icon: '👨‍💻' },
  { type: 'other', label: '其他工具', icon: '🔧' },
];

const CONFIG_GUIDES: Record<AppType, { title: string; code: string }> = {
  browser: {
    title: '浏览器插件配置',
    code: `// 在插件设置中修改 API endpoint
API Base URL: https://api.clawrouter.ai/v1
API Key: 你的专属 Key`,
  },
  desktop: {
    title: '桌面应用配置',
    code: `# 设置环境变量
export OPENAI_API_BASE=https://api.clawrouter.ai/v1
export OPENAI_API_KEY=你的专属Key`,
  },
  development: {
    title: '开发项目集成',
    code: `# Python 示例
import openai

openai.api_base = "https://api.clawrouter.ai/v1"
openai.api_key = "你的专属Key"

response = openai.ChatCompletion.create(
    model="auto",  # 智能路由
    messages=[{"role": "user", "content": "Hello!"}]
)

# Node.js 示例
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  basePath: "https://api.clawrouter.ai/v1",
  apiKey: "你的专属Key",
});`,
  },
  other: {
    title: '其他工具配置',
    code: `# 通用配置
API Endpoint: https://api.clawrouter.ai/v1
API Key: 你的专属Key

# 支持的 API 格式：
# - OpenAI 兼容 API
# - Anthropic 兼容 API`,
  },
};

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState<Step>(1);
  const [appType, setAppType] = useState<AppType | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Generate or fetch API key
    const storedKey = localStorage.getItem('clawrouter_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      // Generate mock key
      const newKey = 'sk-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setApiKey(newKey);
      localStorage.setItem('clawrouter_api_key', newKey);
    }
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    if (!testMessage.trim()) return;

    setIsTesting(true);
    setTestResponse('');

    const result = await api.chat([{ role: 'user', content: testMessage }]);

    setIsTesting(false);

    if (result.data) {
      setTestResponse(result.data.choices?.[0]?.message?.content || 'No response');
      localStorage.setItem('clawrouter_onboarding_complete', 'true');
    } else {
      setTestResponse(`Error: ${result.error?.message || 'Unknown error'}`);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('clawrouter_onboarding_complete', 'true');
    onSkip?.();
  };

  const handleNext = () => {
    if (step < 4) {
      setStep((step + 1) as Step);
    } else {
      localStorage.setItem('clawrouter_onboarding_complete', 'true');
      onComplete?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#1e293b]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">欢迎来到 ClawRouter 🎉</h2>
            <button onClick={handleSkip} className="text-[#94a3b8] hover:text-white">
              跳过
            </button>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-gradient-to-r from-[#00c9ff] to-[#92fe9d]' : 'bg-[#1e293b]'}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Choose App Type */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">选择你的应用类型</h3>
              <p className="text-[#94a3b8]">我们将为你提供对应的配置指南</p>

              <div className="grid grid-cols-2 gap-4 mt-6">
                {APP_TYPES.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => {
                      setAppType(item.type);
                      handleNext();
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      appType === item.type
                        ? 'border-[#00c9ff] bg-[#00c9ff]/10'
                        : 'border-[#1e293b] hover:border-[#334155]'
                    }`}
                  >
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="text-white font-medium">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Get API Key */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">你的专属 API Key</h3>
              <p className="text-[#94a3b8]">复制并保存到安全的地方</p>

              <div className="bg-[#1e293b] rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-green-400 text-sm break-all">{apiKey}</code>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1 bg-[#334155] text-white rounded hover:bg-[#475569] transition-colors"
                  >
                    {copied ? '已复制 ✅' : '复制'}
                  </button>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mt-4">
                <div className="text-yellow-400 text-sm">⚠️ 重要提示</div>
                <div className="text-yellow-300 text-sm mt-1">
                  请妥善保管你的 API Key，不要分享给他人
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                下一步
              </button>
            </div>
          )}

          {/* Step 3: Configuration Guide */}
          {step === 3 && appType && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">{CONFIG_GUIDES[appType].title}</h3>
              <p className="text-[#94a3b8]">按照以下步骤配置你的应用</p>

              <div className="bg-[#1e293b] rounded-lg p-4 mt-4 overflow-x-auto">
                <pre className="text-sm text-[#94a3b8] whitespace-pre-wrap">{CONFIG_GUIDES[appType].code}</pre>
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                测试一下
              </button>
            </div>
          )}

          {/* Step 4: Test */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">发送第一条消息</h3>
              <p className="text-[#94a3b8]">体验智能路由的魅力</p>

              <div className="mt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                    placeholder="输入你的问题..."
                    className="flex-1 px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff]"
                  />
                  <button
                    onClick={handleTest}
                    disabled={isTesting || !testMessage.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isTesting ? '发送中...' : '发送'}
                  </button>
                </div>
              </div>

              {testResponse && (
                <div className="bg-[#1e293b] rounded-lg p-4 mt-4">
                  <div className="text-[#94a3b8] text-sm mb-2">响应</div>
                  <div className="text-white whitespace-pre-wrap">{testResponse}</div>
                </div>
              )}

              <button
                onClick={handleNext}
                className="w-full mt-4 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
              >
                开始使用 ✨
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to check if onboarding should be shown
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const isComplete = localStorage.getItem('clawrouter_onboarding_complete');
    if (!isComplete) {
      setShowOnboarding(true);
    }
  }, []);

  return { showOnboarding, setShowOnboarding };
}
