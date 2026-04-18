'use client';

import { SceneSelector } from '@/components/SceneSelector';
import { Section } from '@/components/layout/Section';
import { useTranslations } from 'next-intl';

export function SceneSection() {
  const t = useTranslations('home');

  return (
    <Section
      id="scenes"
      variant="alternate"
      title={t('heading')}
      description={t('subheading')}
    >
      <SceneSelector />
    </Section>
  );
}
