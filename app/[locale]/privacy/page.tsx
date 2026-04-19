import { useTranslations } from 'next-intl';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - HopLLM',
  description: 'HopLLM privacy policy. Learn how we protect your data and API keys.',
};

export default function PrivacyPage() {
  const t = useTranslations('privacy');

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 gradient-text">{t('title')}</h1>
        
        <div className="space-y-6">
          <section className="card-glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-3">{t('section1Title')}</h2>
            <p className="text-neutral-7 leading-relaxed">{t('section1Content')}</p>
          </section>

          <section className="card-glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-3">{t('section2Title')}</h2>
            <p className="text-neutral-7 leading-relaxed">{t('section2Content')}</p>
          </section>

          <section className="card-glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-3">{t('section3Title')}</h2>
            <p className="text-neutral-7 leading-relaxed">{t('section3Content')}</p>
          </section>

          <section className="card-glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-3">{t('section4Title')}</h2>
            <p className="text-neutral-7 leading-relaxed">{t('section4Content')}</p>
          </section>

          <section className="card-glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-3">{t('section5Title')}</h2>
            <p className="text-neutral-7 leading-relaxed">{t('section5Content')}</p>
          </section>

          <section className="card-glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-3">{t('section6Title')}</h2>
            <p className="text-neutral-7 leading-relaxed">{t('section6Content')}</p>
          </section>

          <div className="text-center text-sm text-neutral-6 mt-8">
            <p>{t('lastUpdated')}</p>
            <p className="mt-2">{t('contactUs')}: <a href="mailto:privacy@hopllm.com" className="text-brand-primary hover:underline">privacy@hopllm.com</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}