import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { defaultLanguage, isValidLanguage, detectBrowserLanguage, countryToLanguage, LanguageCode, languages } from './config';

/**
 * Get the current language based on detection priority:
 * 1. URL parameter (?lang=zh)
 * 2. User preference (for logged-in users)
 * 3. Cookie (preferred-language)
 * 4. Browser language (Accept-Language header)
 * 5. IP geolocation (x-vercel-ip-country header)
 * 6. Default language
 */
export async function getCurrentLanguage(): Promise<LanguageCode> {
  const cookieStore = await cookies();
  const headersList = await headers();
  
  // 1. Check cookie (set by middleware or language switcher)
  const cookieLang = cookieStore.get('preferred-language')?.value;
  if (cookieLang && isValidLanguage(cookieLang)) {
    return cookieLang;
  }
  
  // 2. Check browser language
  const acceptLanguage = headersList.get('accept-language') || '';
  const browserLang = detectBrowserLanguage(acceptLanguage);
  if (browserLang) {
    return browserLang;
  }
  
  // 3. Check IP geolocation
  const country = headersList.get('x-vercel-ip-country');
  if (country && country in countryToLanguage) {
    return countryToLanguage[country] as LanguageCode;
  }
  
  return defaultLanguage;
}

/**
 * Get language info (name, flag, direction)
 */
export function getLanguageInfo(code: LanguageCode) {
  return languages[code];
}

/**
 * Check if the language is RTL
 */
export function isRTL(code: LanguageCode): boolean {
  return languages[code].direction === 'rtl';
}
