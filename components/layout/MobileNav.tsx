'use client';

import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NavItem {
  href: string;
  label: string;
}

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: NavItem[];
  isActive: (href: string) => boolean;
}

export function MobileNav({ open, onOpenChange, navItems, isActive }: MobileNavProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle className="gradient-text text-xl">ClawRoute</DialogTitle>
        </DialogHeader>
        <nav className="flex flex-col gap-1 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              className={`px-4 py-3 rounded-lg text-sm transition-colors duration-fast ${
                isActive(item.href)
                  ? 'text-neutral-10 bg-surface-overlay'
                  : 'text-neutral-7 hover:text-neutral-10 hover:bg-surface-overlay/50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border-subtle">
          <LanguageSwitcher />
          <ThemeToggle />
          <a
            href="https://github.com/tancau/clawroute"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle text-neutral-7 hover:text-neutral-10 transition-colors duration-fast text-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
