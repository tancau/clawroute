'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SceneSelector } from '@/components/SceneSelector';
import { TestimonialCard } from '@/components/TestimonialCard';
import { CodeBlock } from '@/components/CodeBlock';

export default function Home() {
  const t = useTranslations('home');

  const testimonials = [
    {
      quote: 'Wow, this actually saves me 70% on my OpenClaw bills!',
      author: 'Alex Chen',
      username: 'alexchen'
    },
    {
      quote: 'The smart routing is incredible. My trading bot now runs cheaper and faster.',
      author: 'Sarah Wang',
      username: 'sarahw'
    }
  ];

  const installCode = `# ${t('installCode.comment')}
# ${t('installCode.step1')}
# ${t('installCode.savings')}`;

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
            <a
              href="#scenes"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('cta.start')}
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
              {t('cta.templates')}
            </Link>
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

      {/* Scene Selector */}
      <section id="scenes" className="px-4 py-16">
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
      <section className="px-4 py-12 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-[#f8fafc]">{t('quickstart.title')}</h2>
          <CodeBlock code={installCode} language="bash" />
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
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#f8fafc]">{t('features.opensource.title')}</h3>
              <p className="text-[#94a3b8]">{t('features.opensource.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Spacer */}
      <div className="flex-1"></div>
    </div>
  );
}
