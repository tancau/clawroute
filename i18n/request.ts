import { getRequestConfig } from 'next-intl/server';
 
export default getRequestConfig(async ({ requestLocale }) => {
  // 从请求中获取 locale，默认为 'zh'
  let locale = await requestLocale;
  
  // 确保 locale 有效
  if (!locale || !['zh', 'en'].includes(locale)) {
    locale = 'zh';
  }
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
