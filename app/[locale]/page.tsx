'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/use-user-store';
import { SceneSelector } from '@/components/SceneSelector';
import { TestimonialCard } from '@/components/TestimonialCard';
import { CodeBlock } from '@/components/CodeBlock';
import { CostCalculator } from '@/components/CostCalculator';

export default function Home() {
  const t = useTranslations('home');
  const { isAuthenticated } = useUserStore();

  const testimonials = [
    {
      quote: '从月费 $200 降到 $30，智能路由太省了！',
      author: 'Alex Chen',
      username: 'alexchen'
    },
    {
      quote: '同一个 API，自动选最优模型，成本降了 80%',
      author: 'Sarah Wang',
      username: 'sarahw'
    }
  ];

  const installCode = `# ${t('installCode.comment')}
# ${t('installCode.step1')}
export OPENAI_API_BASE=https://api.clawrouter.ai/v1

# ${t('installCode.savings')}`;

  const howItWorks = [
    { step: 1, title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc'), icon: '📤' },
    { step: 2, title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc'), icon: '🧠' },
    { step: 3, title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc'), icon: '🎯' },
    { step: 4, title: t('howItWorks.step4.title'), desc: t('howItWorks.step4.desc'), icon: '✨' },
  ];

  const supportedProviders = [
    { name: 'OpenAI', models: 'GPT-5.4, GPT-4o', icon: '🟢' },
    { name: 'Anthropic', models: 'Claude 4.7, Sonnet 4.6', icon: '🟣' },
    { name: 'Google', models: 'Gemini 2.5 Pro/Flash', icon: '🔵' },
    { name: 'DeepSeek', models: 'Chat, Reasoner', icon: '🟡' },
    { name: 'Qwen', models: 'Qwen3-Max, Plus, Flash', icon: '🟠' },
    { name: '免费模型', models: 'Gemma, Llama, Qwen-Free', icon: '🆓' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="px-4 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] bg-clip-text text-transparent">{t('hero.highlight')}</span>
          </h1>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-[#f8fafc]">
            {t('hero.title')}
          </h2>
          <p className="text-xl text-[#94a3b8] mb-10 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                进入控制台
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  {t('cta.start')}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-8 py-4 border border-[#2a2d3a] text-[#f8fafc] font-semibold rounded-xl hover:border-[#00c9ff]/50 transition-colors"
                >
                  登录
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-[#f8fafc]">{t('testimonials.title')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#f8fafc]">{t('howItWorks.title')}</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#00c9ff] to-[#92fe9d] flex items-center justify-center text-3xl">
                  {item.icon}
                </div>
                <div className="text-sm text-[#00c9ff] mb-2">Step {item.step}</div>
                <h3 className="text-lg font-semibold mb-2 text-[#f8fafc]">{item.title}</h3>
                <p className="text-sm text-[#94a3b8]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Models */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-[#f8fafc]">支持的模型</h2>
          <p className="text-lg text-center text-[#94a3b8] mb-12">50+ 模型，智能路由自动选择最优方案</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {supportedProviders.map((provider) => (
              <div key={provider.name} className="p-4 rounded-xl bg-[#1a1a2e] border border-[#2a2d3a] text-center hover:border-[#00c9ff]/50 transition-colors">
                <div className="text-2xl mb-2">{provider.icon}</div>
                <div className="font-semibold text-[#f8fafc] text-sm mb-1">{provider.name}</div>
                <div className="text-xs text-[#94a3b8]">{provider.models}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scene Selector */}
      <section id="scenes" className="px-4 py-16 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-[#f8fafc]">
              {t('sceneSection.title')}
            </h2>
            <p className="text-lg text-[#94a3b8]">
              {t('sceneSection.subtitle')}
            </p>
          </div>
          <SceneSelector />
        </div>
      </section>

      {/* Code Block */}
      <section className="px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-[#f8fafc]">{t('quickstart.title')}</h2>
          <CodeBlock code={installCode} language="bash" />
        </div>
      </section>

      {/* Cost Calculator */}
      <section className="px-4 py-16 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <CostCalculator />
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#f8fafc]">{t('features.title')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#00c9ff] to-[#92fe9d] flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#f8fafc]">{t('features.savings.title')}</h3>
              <p className="text-[#94a3b8]">{t('features.savings.desc')}</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#f8fafc]">{t('features.easy.title')}</h3>
              <p className="text-[#94a3b8]">{t('features.easy.desc')}</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#92fe9d] to-[#00c9ff] flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#f8fafc]">精准匹配</h3>
              <p className="text-[#94a3b8]">分析任务复杂度，自动选择能力匹配的模型</p>
            </div>
          </div>
        </div>
      </section>

      {/* Spacer */}
      <div className="flex-1"></div>
    </div>
  );
}
