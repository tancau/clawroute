'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MobileNav } from '@/components/layout/MobileNav';
import { useUserStore } from '@/store/use-user-store';
import { useState } from 'react';

export function Header() {
  const t = useTranslations('app');
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, isAuthenticated, logout } = useUserStore();

  const navItems = [
    { href: '/configure', label: tNav('configure') },
    { href: '/templates', label: tNav('templates') },
    { href: '/dashboard', label: tNav('dashboard') },
  ];

  const isActive = (href: string) => pathname?.includes(href);

  return (
    <>
      <header className="border-b border-border-subtle sticky top-0 z-50 glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight gradient-text">{t('title')}</span>
              <span className="text-xs text-neutral-7 hidden lg:inline">
                {t('subtitle')}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors duration-fast ${
                    isActive(item.href)
                      ? 'text-neutral-10 bg-surface-overlay'
                      : 'text-neutral-7 hover:text-neutral-10 hover:bg-surface-overlay/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            
            {/* Auth buttons */}
            {isAuthenticated && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-all duration-fast text-sm"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline">{user.name || user.email}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle text-neutral-7 hover:text-neutral-10 hover:border-brand-primary/50 transition-all duration-fast text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">{tNav('logout')}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle text-neutral-7 hover:text-neutral-10 hover:border-brand-primary/50 transition-all duration-fast text-sm"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{tNav('login')}</span>
                </Link>
                <Link
                  href="/auth/register"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition-all duration-fast text-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">{tNav('register')}</span>
                </Link>
              </>
            )}
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-neutral-7 hover:text-neutral-10 hover:bg-surface-overlay transition-colors duration-fast"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        navItems={navItems}
        isActive={isActive}
      />
    </>
  );
}
