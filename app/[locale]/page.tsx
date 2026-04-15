import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { SceneSelector } from '@/components/SceneSelector';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';

export default function Home() {
  const t = useTranslations('home');
  const tNav = useTranslations('template');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {t('heading')}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t('subheading')}
        </p>
      </div>
      <SceneSelector />
      <div className="mt-8">
        <Link href="/templates">
          <Button variant="outline" className="gap-2">
            <Store className="h-4 w-4" />
            {tNav('title')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
