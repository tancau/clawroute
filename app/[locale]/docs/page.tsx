'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { 
  Zap, Book, HelpCircle, PlayCircle, ChevronDown, ChevronUp, 
  Copy, Check, ExternalLink, Code, Terminal, Settings, Key
} from 'lucide-react';

export default function DocsPage() {
  const locale = useLocale();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const copyCode = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeExamples = [
    {
      language: 'python',
      code: `# Python OpenAI SDK
from openai import OpenAI

# Just change the base_url
client = OpenAI(
    base_url="https://hopllm.com/v1",
    api_key="your-hopllm-api-key"
)

# Use model="auto" for smart routing
response = client.chat.completions.create(
    model="auto",  # Smart routing!
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)`,
    },
    {
      language: 'javascript',
      code: `// JavaScript / Node.js
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://hopllm.com/v1',
  apiKey: 'your-hopllm-api-key'
});

// Smart routing with model="auto"
const response = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.choices[0].message.content);`,
    },
    {
      language: 'curl',
      code: `# curl
curl https://hopllm.com/v1/chat/completions \\
  -H "Authorization: Bearer your-hopllm-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
    },
  ];

  const faqs = locale === 'zh' ? [
    {
      question: '什么是智能路由？',
      answer: '智能路由会分析您的请求意图，自动选择最适合的模型。简单任务用低成本模型，复杂任务用高质量模型，帮您节省最多 80% 的成本。',
    },
    {
      question: 'model="auto" 是什么意思？',
      answer: '设置 model="auto" 后，HopLLM 会自动分析您的请求内容，判断任务类型（如编码、翻译、推理等），然后选择最优模型。您也可以指定具体模型，如 model="gpt-4o"。',
    },
    {
      question: '如何获取 API Key？',
      answer: '注册登录后，进入 Dashboard → API Key 页面即可查看您的 API Key。您也可以在此页面重新生成密钥。',
    },
    {
      question: '支持哪些模型？',
      answer: '我们支持 OpenAI、Claude、Gemini、DeepSeek、Qwen 等主流模型。智能路由会根据您的任务自动选择最合适的模型。',
    },
    {
      question: '如何计费？',
      answer: '按实际使用的模型计费，价格与各模型官方价格一致。智能路由帮您选择更经济的模型，每请求可节省 30-80%。',
    },
    {
      question: '可以使用自己的 API Key 吗？',
      answer: '可以！在 Dashboard → Providers 页面添加您自己的 API Key。这样您可以直接使用自己的配额，完全控制成本。',
    },
  ] : [
    {
      question: 'What is smart routing?',
      answer: 'Smart routing analyzes your request intent and automatically selects the best model. Simple tasks use low-cost models, complex tasks use high-quality models, saving you up to 80% on costs.',
    },
    {
      question: 'What does model="auto" mean?',
      answer: 'With model="auto", HopLLM automatically analyzes your request content, determines the task type (coding, translation, reasoning, etc.), and selects the optimal model. You can also specify a model, e.g., model="gpt-4o".',
    },
    {
      question: 'How do I get an API key?',
      answer: 'After registering and logging in, go to Dashboard → API Key to view your API key. You can also regenerate your key from this page.',
    },
    {
      question: 'Which models are supported?',
      answer: 'We support OpenAI, Claude, Gemini, DeepSeek, Qwen, and other mainstream models. Smart routing automatically selects the best model for your task.',
    },
    {
      question: 'How does billing work?',
      answer: 'You are billed based on the actual model used, at official model prices. Smart routing helps you choose more economical models, saving 30-80% per request.',
    },
    {
      question: 'Can I use my own API keys?',
      answer: 'Yes! Go to Dashboard → Providers to add your own API keys. This way you can use your own quotas and fully control costs.',
    },
  ];

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-primary/10 to-surface-base border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/20 rounded-full text-brand-primary text-sm mb-6">
            <Book className="h-4 w-4" />
            Documentation
          </div>
          <h1 className="text-4xl font-bold text-neutral-10 mb-4">
            {locale === 'zh' ? '快速开始' : 'Quick Start Guide'}
          </h1>
          <p className="text-lg text-neutral-7 max-w-2xl mx-auto">
            {locale === 'zh'
              ? '只需 3 分钟，让您的 AI 应用更智能、更省钱'
              : 'Get started in 3 minutes and make your AI apps smarter and cheaper'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Quick Start Steps */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-10 mb-8 flex items-center gap-2">
            <Zap className="h-6 w-6 text-brand-primary" />
            {locale === 'zh' ? '三步开始' : 'Three Steps to Start'}
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2">
                    <Key className="h-5 w-5 text-brand-primary" />
                    {locale === 'zh' ? '获取 API Key' : 'Get Your API Key'}
                  </h3>
                  <p className="text-neutral-7 mt-2 mb-4">
                    {locale === 'zh'
                      ? '注册账号后，进入 Dashboard 获取您的 API Key。'
                      : 'After registering, go to Dashboard to get your API key.'}
                  </p>
                  <a
                    href="/dashboard/api-key"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                  >
                    {locale === 'zh' ? '获取 API Key' : 'Get API Key'}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-brand-accent" />
                    {locale === 'zh' ? '修改 base_url' : 'Change base_url'}
                  </h3>
                  <p className="text-neutral-7 mt-2">
                    {locale === 'zh'
                      ? '将您的 OpenAI SDK base_url 改为 https://hopllm.com/v1'
                      : 'Change your OpenAI SDK base_url to https://hopllm.com/v1'}
                  </p>
                  <div className="mt-4 p-3 bg-surface-overlay rounded-lg font-mono text-sm text-neutral-10">
                    base_url=&quot;https://hopllm.com/v1&quot;
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2">
                    <Code className="h-5 w-5 text-brand-secondary" />
                    {locale === 'zh' ? '使用 model="auto"' : 'Use model="auto"'}
                  </h3>
                  <p className="text-neutral-7 mt-2">
                    {locale === 'zh'
                      ? '设置 model="auto" 启用智能路由，自动选择最优模型。'
                      : 'Set model="auto" to enable smart routing and automatically select the best model.'}
                  </p>
                  <div className="mt-4 p-3 bg-surface-overlay rounded-lg font-mono text-sm text-neutral-10">
                    model=&quot;auto&quot; {/* Smart routing! */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-10 mb-8 flex items-center gap-2">
            <Terminal className="h-6 w-6 text-brand-accent" />
            {locale === 'zh' ? '代码示例' : 'Code Examples'}
          </h2>

          <div className="space-y-6">
            {codeExamples.map((example, i) => (
              <div key={i} className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-surface-overlay border-b border-border-subtle">
                  <span className="text-sm text-neutral-7 font-mono">{example.language}</span>
                  <button
                    onClick={() => copyCode(example.code, i)}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-neutral-7 hover:text-neutral-10 transition-colors"
                  >
                    {copiedIndex === i ? (
                      <>
                        <Check className="h-4 w-4 text-semantic-success" />
                        <span className="text-semantic-success">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-sm text-neutral-10 font-mono">
                  <code>{example.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Video Demo */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-10 mb-8 flex items-center gap-2">
            <PlayCircle className="h-6 w-6 text-brand-primary" />
            {locale === 'zh' ? '视频演示' : 'Video Demo'}
          </h2>

          <div className="bg-surface-raised border border-border-subtle rounded-xl p-8 text-center">
            <div className="w-full aspect-video bg-surface-overlay rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <PlayCircle className="h-16 w-16 text-brand-primary mx-auto mb-4 opacity-50" />
                <p className="text-neutral-7">
                  {locale === 'zh' ? '视频演示即将上线' : 'Video demo coming soon'}
                </p>
              </div>
            </div>
            <p className="text-neutral-7 text-sm">
              {locale === 'zh'
                ? '观看 5 分钟快速入门视频，了解如何使用 HopLLM 智能路由'
                : 'Watch a 5-minute quick start video to learn how to use HopLLM smart routing'}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-10 mb-8 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-brand-secondary" />
            {locale === 'zh' ? '常见问题' : 'FAQ'}
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-overlay/50 transition-colors"
                >
                  <span className="font-medium text-neutral-10">{faq.question}</span>
                  {expandedFaq === i ? (
                    <ChevronUp className="h-5 w-5 text-neutral-7" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-neutral-7" />
                  )}
                </button>
                {expandedFaq === i && (
                  <div className="px-6 pb-4 text-neutral-7 border-t border-border-subtle pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 border border-brand-primary/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-neutral-10 mb-4">
            {locale === 'zh' ? '准备好开始了吗？' : 'Ready to get started?'}
          </h2>
          <p className="text-neutral-7 mb-6">
            {locale === 'zh'
              ? '立即注册，获取您的 API Key，开始使用智能路由'
              : 'Sign up now to get your API key and start using smart routing'}
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/dashboard/api-key"
              className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors font-medium"
            >
              {locale === 'zh' ? '获取 API Key' : 'Get API Key'}
            </a>
            <a
              href="/configure"
              className="px-6 py-3 bg-surface-raised text-neutral-10 rounded-lg hover:bg-surface-overlay transition-colors font-medium border border-border-subtle"
            >
              {locale === 'zh' ? '配置代理' : 'Configure Proxy'}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}