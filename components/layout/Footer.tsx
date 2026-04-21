'use client';

import Link from 'next/link';
import { BookOpen, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-border-subtle mt-auto">
      <div className="container mx-auto px-4 py-6">
        {/* Main footer content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-7">{t('dataUpdated')}: 2026-04-19</span>
            <span className="gradient-text font-semibold text-sm">HopLLM (智跳) - {t('openSource')}</span>
          </div>

          {/* Right section - Links */}
          <div className="flex items-center gap-4">
            {/* Navigation links */}
            <div className="flex items-center gap-3 text-xs">
              <Link
                href="/about"
                className="text-neutral-7 hover:text-neutral-10 transition-colors duration-fast"
              >
                {t('about')}
              </Link>
              <span className="text-neutral-6">|</span>
              <Link
                href="/privacy"
                className="text-neutral-7 hover:text-neutral-10 transition-colors duration-fast"
              >
                {t('privacy')}
              </Link>
              <span className="text-neutral-6">|</span>
              <Link
                href="/terms"
                className="text-neutral-7 hover:text-neutral-10 transition-colors duration-fast"
              >
                {t('terms')}
              </Link>
              <span className="text-neutral-6">|</span>
              <a
                href="https://t.me/tancauQ"
                className="text-neutral-7 hover:text-neutral-10 transition-colors duration-fast"
              >
                {t('contact')}
              </a>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-4 bg-border-subtle" />

            {/* Icon links */}
            <div className="flex items-center gap-3">
              <a
                href="https://t.me/tancauQ"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-7 hover:text-neutral-10 transition-colors duration-fast"
                aria-label={t('telegram')}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
              <a
                href="/docs"
                className="text-neutral-7 hover:text-neutral-10 transition-colors duration-fast"
                aria-label={t('docs')}
              >
                <BookOpen className="h-4 w-4" />
              </a>
              <a
                href="https://t.me/tancauQ"
                className="text-neutral-7 hover:text-neutral-10 transition-colors duration-fast"
                aria-label={t('contact')}
              >
                <Send className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-4 border-t border-border-subtle/50 text-center">
          <p className="text-xs text-neutral-6">
            © {new Date().getFullYear()} HopLLM (智跳). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}