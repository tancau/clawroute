import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['zh', 'en'],
  defaultLocale: 'en',
});
 
export const config = {
  matcher: ['/', '/(zh|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
