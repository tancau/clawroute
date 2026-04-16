'use client';

import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import type { Locale } from '@/lib/types';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const currentLocale = useLocale() as Locale;
  const setLocale = useAppStore((s) => s.setLocale);

  const handleSwitch = async (newLocale: Locale) => {
    setLocale(newLocale);
    // Store locale in cookie so server can read it on next request
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    // Reload to apply new locale from server
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={currentLocale === 'zh' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => handleSwitch('zh')}
      >
        {t('zh')}
      </Button>
      <Button
        variant={currentLocale === 'en' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => handleSwitch('en')}
      >
        {t('en')}
      </Button>
    </div>
  );
}
