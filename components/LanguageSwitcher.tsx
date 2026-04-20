'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { languages, LanguageCode, isValidLanguage } from '@/lib/i18n/config';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as LanguageCode;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (lang: LanguageCode) => {
    // Set cookie
    document.cookie = `preferred-language=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    document.cookie = `locale=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    
    // Update URL path if it contains a locale
    const pathSegments = pathname.split('/').filter(Boolean);
    const firstSegment = pathSegments[0];
    if (firstSegment && isValidLanguage(firstSegment)) {
      pathSegments[0] = lang;
      router.push('/' + pathSegments.join('/'));
    } else {
      // Reload to apply new locale
      window.location.reload();
    }
    
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-8 px-2"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="text-sm">{languages[currentLocale]?.flag}</span>
        <span className="hidden sm:inline text-xs">{languages[currentLocale]?.name}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          role="listbox"
        >
          {Object.entries(languages).map(([code, lang]) => (
            <button
              key={code}
              onClick={() => changeLanguage(code as LanguageCode)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors text-sm ${
                code === currentLocale
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : ''
              }`}
              role="option"
              aria-selected={code === currentLocale}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {code === currentLocale && (
                <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
