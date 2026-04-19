'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PiggyBank, Settings, LogOut, Key, Plug, BarChart3 } from 'lucide-react';
import { useUserStore } from '@/store/use-user-store';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const t = useTranslations('dashboard');

  const navItems = [
    { href: '/dashboard', label: t('overview'), icon: LayoutDashboard },
    { href: '/dashboard/stats', label: 'Statistics', icon: BarChart3 },
    { href: '/dashboard/api-key', label: t('apiKeyNav'), icon: Key },
    { href: '/dashboard/providers', label: 'Providers', icon: Plug },
    { href: '/dashboard/savings', label: t('savings'), icon: PiggyBank },
    { href: '/dashboard/preferences', label: t('preferences'), icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border-subtle bg-surface-raised p-4 gap-1">
        {user && (
          <div className="mb-4 px-3 py-2">
            <p className="text-sm font-medium text-neutral-10 truncate">{user.name || user.email}</p>
            <p className="text-xs text-neutral-7">HopLLM</p>
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-fast',
                isActive(item.href)
                  ? 'text-brand-primary bg-brand-primary/10'
                  : 'text-neutral-7 hover:text-neutral-10 hover:bg-surface-overlay/50'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto">
          <button
            onClick={() => useUserStore.getState().logout()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-7 hover:text-semantic-error hover:bg-semantic-error/10 transition-colors duration-fast w-full"
          >
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Mobile top tabs */}
      <div className="md:hidden border-b border-border-subtle bg-surface-raised px-4 py-2 flex gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors duration-fast',
                isActive(item.href)
                  ? 'text-brand-primary bg-brand-primary/10'
                  : 'text-neutral-7 hover:text-neutral-10'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
