import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';

interface HeroSectionProps {
  heroHighlight: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  browseTemplates: string;
  getApiKey?: string;
}

export function HeroSection({
  heroHighlight,
  heroTitle,
  heroSubtitle,
  heroDescription,
  browseTemplates,
  getApiKey = 'Get Your API Key',
}: HeroSectionProps) {
  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-border-default bg-surface-overlay/50 text-sm text-neutral-7">
          <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
          OpenAI-compatible API &middot; Zero migration cost
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
          <span className="gradient-text">
            {heroHighlight}
          </span>
          <br />
          <span className="text-neutral-10">{heroTitle}</span>
        </h1>
        <p className="text-lg sm:text-xl text-neutral-7 mb-4 max-w-2xl mx-auto leading-relaxed">
          {heroSubtitle}
        </p>
        <p className="text-sm text-neutral-8 mb-10 max-w-xl mx-auto">
          {heroDescription}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-primary text-neutral-1 font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            {getApiKey}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 px-8 py-4 border border-border-default text-neutral-10 font-semibold rounded-xl hover:border-brand-primary/50 transition-colors duration-fast"
          >
            <ShoppingBag className="w-5 h-5" />
            {browseTemplates}
          </Link>
        </div>
      </div>
    </section>
  );
}
