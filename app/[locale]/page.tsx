'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SceneSelector } from '@/components/SceneSelector';
import { CodeBlock } from '@/components/CodeBlock';
import { CostCalculator } from '@/components/CostCalculator';

export default function Home() {
  const t = useTranslations('home');

  const quickStartCode = `# ${t('codeComment')}
${t('codeLine1')}
${t('codeLine2')}
${t('codeLine3')}`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="px-4 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-[#2a2d3a] bg-[#0f172a]/50 text-sm text-[#94a3b8]">
            <span className="w-2 h-2 rounded-full bg-[#00c9ff] animate-pulse" />
            OpenAI-compatible API &middot; Zero migration cost
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] bg-clip-text text-transparent">
              {t('heroHighlight')}
            </span>
            <br />
            <span className="text-[#f8fafc]">{t('heroTitle')}</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#94a3b8] mb-4 max-w-2xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>
          <p className="text-sm text-[#64748b] mb-10 max-w-xl mx-auto">
            {t('heroDescription')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#scenes"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('startProxy')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 px-8 py-4 border border-[#2a2d3a] text-[#f8fafc] font-semibold rounded-xl hover:border-[#00c9ff]/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {t('browseTemplates')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features - implemented capabilities */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#f8fafc]">{t('featuresTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Smart Routing */}
            <div className="p-6 rounded-xl border border-[#1e293b] bg-[#0f172a]/50 hover:border-[#00c9ff]/30 transition-colors">
              <div className="w-10 h-10 mb-4 rounded-lg bg-gradient-to-br from-[#00c9ff] to-[#92fe9d] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#0f172a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#f8fafc]">{t('featureRoutingTitle')}</h3>
              <p className="text-sm text-[#94a3b8] leading-relaxed">{t('featureRoutingDesc')}</p>
            </div>
            {/* Streaming + Retry */}
            <div className="p-6 rounded-xl border border-[#1e293b] bg-[#0f172a]/50 hover:border-[#6366f1]/30 transition-colors">
              <div className="w-10 h-10 mb-4 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#f8fafc]">{t('featureStreamingTitle')}</h3>
              <p className="text-sm text-[#94a3b8] leading-relaxed">{t('featureStreamingDesc')}</p>
            </div>
            {/* Precise Billing + Key Pool */}
            <div className="p-6 rounded-xl border border-[#1e293b] bg-[#0f172a]/50 hover:border-[#92fe9d]/30 transition-colors">
              <div className="w-10 h-10 mb-4 rounded-lg bg-gradient-to-br from-[#92fe9d] to-[#00c9ff] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#0f172a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#f8fafc]">{t('featureBillingTitle')}</h3>
              <p className="text-sm text-[#94a3b8] leading-relaxed">{t('featureBillingDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Scene Selector */}
      <section id="scenes" className="px-4 py-16 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-[#f8fafc]">{t('heading')}</h2>
            <p className="text-lg text-[#94a3b8]">{t('subheading')}</p>
          </div>
          <SceneSelector />
        </div>
      </section>

      {/* Quick Start Code */}
      <section className="px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-[#f8fafc]">{t('quickStartTitle')}</h2>
          <CodeBlock code={quickStartCode} language="python" />
        </div>
      </section>

      {/* Cost Calculator */}
      <section className="px-4 py-16 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <CostCalculator />
        </div>
      </section>

      <div className="flex-1" />
    </div>
  );
}
