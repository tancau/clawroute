import { useTranslations } from 'next-intl';
import { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Globe, Zap, Shield, Coins, Cpu } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About HopLLM - Smart Routing API Proxy',
  description: 'Learn about HopLLM (智跳), the intelligent routing API proxy that helps you save 80% on AI API costs. Discover our mission, technology, and team.',
  keywords: ['HopLLM', '智跳', 'AI routing', 'API proxy', 'cost savings', 'OpenAI alternative', 'LLM optimization'],
  openGraph: {
    title: 'About HopLLM - Smart Routing API Proxy',
    description: 'Learn about HopLLM, the intelligent routing API proxy that saves you 80% on AI API costs.',
    url: 'https://hopllm.com/about',
    siteName: 'HopLLM',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About HopLLM - Smart Routing API Proxy',
    description: 'Learn about HopLLM, the intelligent routing API proxy that saves you 80% on AI API costs.',
  },
};

const techStack = [
  { name: 'Next.js 14', desc: 'Modern React framework with App Router' },
  { name: 'TypeScript', desc: 'Type-safe development' },
  { name: 'Tailwind CSS', desc: 'Utility-first styling' },
  { name: 'Vercel', desc: 'Edge deployment platform' },
  { name: 'PostgreSQL', desc: 'Reliable data storage' },
];

const features = [
  { icon: Zap, titleKey: 'feature1Title', descKey: 'feature1Desc' },
  { icon: Shield, titleKey: 'feature2Title', descKey: 'feature2Desc' },
  { icon: Coins, titleKey: 'feature3Title', descKey: 'feature3Desc' },
  { icon: Cpu, titleKey: 'feature4Title', descKey: 'feature4Desc' },
];

export default function AboutPage() {
  const t = useTranslations('about');

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{t('heroTitle')}</span>
          </h1>
          <p className="text-xl text-neutral-7 mb-6">{t('heroSubtitle')}</p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-3xl font-bold gradient-text">HopLLM</span>
            <span className="text-xl text-neutral-7">{t('brandZh')}</span>
          </div>
        </div>

        {/* Mission Section */}
        <section className="mb-12">
          <div className="card-glass p-6 rounded-xl">
            <h2 className="text-2xl font-bold mb-4 gradient-text">{t('missionTitle')}</h2>
            <p className="text-neutral-8 leading-relaxed mb-4">{t('missionDesc')}</p>
            <p className="text-neutral-7 leading-relaxed">{t('missionDetail')}</p>
          </div>
        </section>

        {/* Vision Section */}
        <section className="mb-12">
          <div className="card-glass p-6 rounded-xl">
            <h2 className="text-2xl font-bold mb-4 gradient-text">{t('visionTitle')}</h2>
            <p className="text-neutral-8 leading-relaxed">{t('visionDesc')}</p>
          </div>
        </section>

        {/* Core Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center gradient-text">{t('featuresTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <div key={idx} className="card-glass p-5 rounded-xl flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-neutral-7">{t(feature.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team/Founder Section */}
        <section className="mb-12">
          <div className="card-glass p-6 rounded-xl">
            <h2 className="text-2xl font-bold mb-4 gradient-text">{t('teamTitle')}</h2>
            <p className="text-neutral-8 leading-relaxed mb-4">{t('teamDesc')}</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-bold">
                TC
              </div>
              <div>
                <p className="font-semibold">{t('founderName')}</p>
                <p className="text-sm text-neutral-7">{t('founderRole')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center gradient-text">{t('techTitle')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {techStack.map((tech, idx) => (
              <div key={idx} className="card-glass p-4 rounded-lg text-center">
                <p className="font-semibold text-sm">{tech.name}</p>
                <p className="text-xs text-neutral-7">{tech.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Links Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center gradient-text">{t('linksTitle')}</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://github.com/tancau/clawroute"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle hover:border-brand-primary/50 hover:bg-surface-overlay transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href="mailto:contact@hopllm.com"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle hover:border-brand-primary/50 hover:bg-surface-overlay transition-all"
            >
              <Mail className="w-5 h-5" />
              <span>{t('contactEmail')}</span>
            </a>
            <Link
              href="/docs"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle hover:border-brand-primary/50 hover:bg-surface-overlay transition-all"
            >
              <Globe className="w-5 h-5" />
              <span>{t('docsLink')}</span>
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="card-glass p-8 rounded-xl">
            <h2 className="text-2xl font-bold mb-4">{t('ctaTitle')}</h2>
            <p className="text-neutral-7 mb-6">{t('ctaDesc')}</p>
            <Link
              href="/auth/register"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold hover:opacity-90 transition-opacity"
            >
              {t('ctaButton')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}