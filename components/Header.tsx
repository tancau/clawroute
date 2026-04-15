'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function Header() {
  const t = useTranslations('app');
  const tHeader = useTranslations('header');

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">{t('title')}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {t('subtitle')}
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/tancau/clawroute"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tHeader('github')}
          </a>
        </div>
      </div>
    </header>
  );
}
