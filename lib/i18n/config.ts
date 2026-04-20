export const languages = {
  en: { name: 'English', flag: '🇺🇸', direction: 'ltr' as const },
  zh: { name: '中文', flag: '🇨🇳', direction: 'ltr' as const },
  zh_TW: { name: '繁體中文', flag: '🇹🇼', direction: 'ltr' as const },
  ja: { name: '日本語', flag: '🇯🇵', direction: 'ltr' as const },
  ko: { name: '한국어', flag: '🇰🇷', direction: 'ltr' as const },
  es: { name: 'Español', flag: '🇪🇸', direction: 'ltr' as const },
  fr: { name: 'Français', flag: '🇫🇷', direction: 'ltr' as const },
  de: { name: 'Deutsch', flag: '🇩🇪', direction: 'ltr' as const },
  pt: { name: 'Português', flag: '🇧🇷', direction: 'ltr' as const },
  ru: { name: 'Русский', flag: '🇷🇺', direction: 'ltr' as const },
  ar: { name: 'العربية', flag: '🇸🇦', direction: 'rtl' as const },
} as const;

export type LanguageCode = keyof typeof languages;
export const defaultLanguage: LanguageCode = 'en';

// Supported locales for next-intl (URL path based)
export const locales = Object.keys(languages) as LanguageCode[];
export type Locale = LanguageCode;

// IP country to language mapping
export const countryToLanguage: Record<string, LanguageCode> = {
  CN: 'zh',
  TW: 'zh_TW',
  HK: 'zh_TW',
  MO: 'zh_TW',
  JP: 'ja',
  KR: 'ko',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  BR: 'pt',
  PT: 'pt',
  SA: 'ar',
  AE: 'ar',
  EG: 'ar',
  MA: 'ar',
  TN: 'ar',
  DZ: 'ar',
};

// Check if a language code is valid
export function isValidLanguage(lang: string): lang is LanguageCode {
  return lang in languages;
}

// Detect browser language from Accept-Language header
export function detectBrowserLanguage(acceptLanguage: string): LanguageCode | null {
  const acceptedLangs = acceptLanguage.split(',').map(l => {
    const parts = l.split(';');
    return parts[0]?.trim().toLowerCase() || '';
  }).filter(Boolean);
  
  for (const lang of acceptedLangs) {
    if (!lang) continue;
    // Chinese variants
    if (lang.startsWith('zh')) {
      if (lang.includes('tw') || lang.includes('hk') || lang.includes('mo')) {
        return 'zh_TW';
      }
      return 'zh';
    }
    // Japanese
    if (lang.startsWith('ja')) return 'ja';
    // Korean
    if (lang.startsWith('ko')) return 'ko';
    // Spanish
    if (lang.startsWith('es')) return 'es';
    // French
    if (lang.startsWith('fr')) return 'fr';
    // German
    if (lang.startsWith('de')) return 'de';
    // Portuguese
    if (lang.startsWith('pt')) return 'pt';
    // Arabic
    if (lang.startsWith('ar')) return 'ar';
    // English
    if (lang.startsWith('en')) return 'en';
  }
  
  return null;
}
