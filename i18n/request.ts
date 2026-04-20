import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLanguage, isValidLanguage, LanguageCode } from '@/lib/i18n/config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('preferred-language')?.value;

  const locale: LanguageCode = localeCookie && isValidLanguage(localeCookie)
    ? localeCookie
    : defaultLanguage;

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
