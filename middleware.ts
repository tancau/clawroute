import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
});
 
export const config = {
  // 匹配所有路径，排除 api、_next、static 等
  matcher: ['/', '/(zh|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
