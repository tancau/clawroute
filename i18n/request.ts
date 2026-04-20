import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLanguage, isValidLanguage, LanguageCode } from '@/lib/i18n/config';

// Pre-import all message files
import en from '../messages/en.json';
import zh from '../messages/zh.json';
import zh_TW from '../messages/zh_TW.json';
import ja from '../messages/ja.json';
import ko from '../messages/ko.json';
import es from '../messages/es.json';
import fr from '../messages/fr.json';
import de from '../messages/de.json';
import pt from '../messages/pt.json';
import ru from '../messages/ru.json';
import ar from '../messages/ar.json';

const messages: Record<LanguageCode, unknown> = {
  en, zh, zh_TW, ja, ko, es, fr, de, pt, ru, ar
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('preferred-language')?.value;
  const locale: LanguageCode = localeCookie && isValidLanguage(localeCookie) 
    ? localeCookie 
    : defaultLanguage;

  return {
    locale,
    messages: messages[locale] as Record<string, string>,
  };
});
