import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLanguage, isValidLanguage, detectBrowserLanguage, countryToLanguage, LanguageCode } from './lib/i18n/config';

// Language detection middleware - runs before next-intl
function languageDetectionMiddleware(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  
  // Skip static files, API routes, and internal paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/fonts')
  ) {
    return null;
  }
  
  // 1. Check URL parameter (?lang=zh) - highest priority
  const urlLang = request.nextUrl.searchParams.get('lang');
  if (urlLang && isValidLanguage(urlLang)) {
    const response = NextResponse.next();
    response.cookies.set('preferred-language', urlLang, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }
  
  // Check if the path already starts with a valid locale
  const pathLocale = pathname.split('/')[1];
  if (pathLocale && isValidLanguage(pathLocale)) {
    // Path has a valid locale, update cookie and continue
    const response = NextResponse.next();
    response.cookies.set('preferred-language', pathLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }
  
  // 2. Check cookie for existing preference
  const cookieLang = request.cookies.get('preferred-language')?.value;
  if (cookieLang && isValidLanguage(cookieLang)) {
    // Let next-intl handle the redirect to the locale path
    return null;
  }
  
  // 3. Detect browser language
  const acceptLanguage = request.headers.get('accept-language') || '';
  const browserLang = detectBrowserLanguage(acceptLanguage);
  
  // 4. Check IP geolocation (Vercel header)
  const country = request.headers.get('x-vercel-ip-country');
  const geoLang = country && country in countryToLanguage 
    ? (countryToLanguage as Record<string, LanguageCode>)[country] 
    : null;
  
  // Select detected language
  const detectedLang: LanguageCode = browserLang || geoLang || defaultLanguage;
  
  // Set cookie for future requests and let next-intl handle the redirect
  const response = NextResponse.next();
  response.cookies.set('preferred-language', detectedLang, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });
  
  return response;
}

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales: locales,
  defaultLocale: defaultLanguage,
  localePrefix: 'always',
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Handle CORS for API routes
  if (pathname.startsWith('/api')) {
    // Handle OPTIONS preflight request
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      const allowedOrigins = [
        'https://hopllm.com',
        'https://www.hopllm.com',
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
      ].filter(Boolean) as string[];
      
      const origin = request.headers.get('origin');
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
        response.headers.set('Access-Control-Max-Age', '86400');
      }
      return response;
    }
    
    // For other API requests, add CORS headers to response
    const response = NextResponse.next();
    const allowedOrigins = [
      'https://hopllm.com',
      'https://www.hopllm.com',
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
    ].filter(Boolean) as string[];
    
    const origin = request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    }
    return response;
  }
  
  // Run language detection first
  const detectionResponse = languageDetectionMiddleware(request);
  
  // If detection middleware returned a response with a cookie, 
  // we still need to run intl middleware for redirect
  if (detectionResponse) {
    // Clone the request headers to pass to intl middleware
    const response = intlMiddleware(request);
    
    // Copy cookies from detection response
    detectionResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie);
    });
    
    return response;
  }
  
  // Otherwise, just run intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
