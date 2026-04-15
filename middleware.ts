import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  // 不在 URL 中显示默认语言前缀
  localePrefix: {
    mode: 'as-needed',
    prefixes: {
      zh: '/zh',
      en: '/en'
    }
  }
});
 
export const config = {
  // 匹配所有路径，排除 api、_next、static 等
  matcher: ['/', '/(zh|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
