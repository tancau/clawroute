'use client';

import Link from 'next/link';
import { SceneSelector } from '@/components/SceneSelector';
import { TestimonialCard } from '@/components/TestimonialCard';
import { CodeBlock } from '@/components/CodeBlock';
import { useTranslations } from 'next-intl';

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

  const installCode = `# 配置你的 OpenClaw 路由
# 选择场景 → 一键生成 models.yaml
# 节省 60-80% 成本！`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="px-4 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{t('heroTitle')}</span>
          </h1>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            {t('heroSubtitle')}
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            {t('heroDescription')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#scenes"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('startConfig')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 px-8 py-4 border border-border text-foreground font-semibold rounded-xl hover:border-primary/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {t('browseTemplates')}
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-foreground">{t('testimonialsTitle')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((tm, i) => (
              <TestimonialCard key={i} {...tm} />
            ))}
          </div>
        </div>
      </section>

      {/* Scene Selector */}
      <section id="scenes" className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              {t('heading')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('subheading')}
            </p>
          </div>
          <SceneSelector />
        </div>
      </section>

      {/* Code Block */}
      <section className="px-4 py-12 bg-surface">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-foreground">{t('quickStartTitle')}</h2>
          <CodeBlock code={installCode} language="bash" />
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">{t('featuresTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{t('featureSavingTitle')}</h3>
              <p className="text-muted-foreground">{t('featureSavingDesc')}</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-secondary to-secondary-accent flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{t('featureOOTBTitle')}</h3>
              <p className="text-muted-foreground">{t('featureOOTBDesc')}</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{t('featureOSTitle')}</h3>
              <p className="text-muted-foreground">{t('featureOSDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Spacer */}
      <div className="flex-1"></div>
    </div>
  );
}
