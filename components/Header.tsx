'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Header() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const nextLocale = locale === 'zh' ? 'en' : 'zh';
    // Remove current locale prefix and add new one
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    router.push(`/${nextLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`);
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">ClawRoute</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {locale === 'zh' ? 'OpenClaw 智能路由配置生成器' : 'OpenClaw Smart Routing Config Generator'}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleLocale}>
            {locale === 'zh' ? 'EN' : '中文'}
          </Button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
