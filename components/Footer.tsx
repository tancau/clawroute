import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t py-4 text-center text-xs text-muted-foreground">
      <p>{t('openSource')}</p>
    </footer>
  );
}
