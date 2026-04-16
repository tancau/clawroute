'use client';

import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-border mt-auto">
      <div className="container mx-auto flex h-12 items-center justify-between px-4 text-xs text-muted-foreground">
        <span>{t('dataUpdated')}：2026-04-16</span>
        <span className="gradient-text font-semibold">ClawRoute - {t('openSource')}</span>
      </div>
    </footer>
  );
}
