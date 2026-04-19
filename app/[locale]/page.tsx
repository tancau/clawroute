import { useTranslations } from 'next-intl';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { SceneSection } from '@/components/home/SceneSection';
import { QuickStartSection } from '@/components/home/QuickStartSection';
import { CostSection } from '@/components/home/CostSection';

export default function Home() {
  const t = useTranslations('home');

  const quickStartCode = `# ${t('codeComment')}
${t('codeLine1')}
${t('codeLine2')}
${t('codeLine3')}`;

  return (
    <div className="min-h-screen flex flex-col">
      <HeroSection
        heroHighlight={t('heroHighlight')}
        heroTitle={t('heroTitle')}
        heroSubtitle={t('heroSubtitle')}
        heroDescription={t('heroDescription')}
        browseTemplates={t('browseTemplates')}
        getApiKey={t('getApiKey')}
      />

      <FeaturesSection
        featuresTitle={t('featuresTitle')}
        featureRoutingTitle={t('featureRoutingTitle')}
        featureRoutingDesc={t('featureRoutingDesc')}
        featureStreamingTitle={t('featureStreamingTitle')}
        featureStreamingDesc={t('featureStreamingDesc')}
        featureBillingTitle={t('featureBillingTitle')}
        featureBillingDesc={t('featureBillingDesc')}
      />

      <SceneSection />

      <QuickStartSection
        quickStartTitle={t('quickStartTitle')}
        code={quickStartCode}
      />

      <CostSection />

      <div className="flex-1" />
    </div>
  );
}
