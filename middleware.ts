import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLanguage, isValidLanguage, detectBrowserLanguage, countryToLanguage, LanguageCode } from './lib/i18n/config';

// ==================== 安全头 / CSP（单一真相源） ====================
//
// CSP nonce（Step 2）：
// - 每个请求生成唯一 nonce，script-src 使用 'nonce-<v>' 'strict-dynamic'，
//   生产环境移除 'unsafe-inline'（仅保留 dev 的 'unsafe-eval' 供热更新）。
// - Next.js 在 SSR 阶段从 **请求头** 的 Content-Security-Policy 中解析 nonce，
//   自动给框架脚本/内联样式打上 nonce，无需手工逐个添加。
// - 自定义内联脚本（见 app/layout.tsx 主题引导脚本）需通过 headers() 读取
//   x-nonce 后手动写入 nonce 属性。
// - nonce 依赖动态渲染：使用 nonce 后所有页面强制 dynamic rendering。

function generateNonce(): string {
  // crypto.randomUUID 在 Next.js 运行时（Node/Edge）均可用
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // 旧浏览器（不支持 strict-dynamic）回退用主机白名单；现代浏览器会忽略此项
    'https://challenges.cloudflare.com',
    ...(isDev ? ["'unsafe-eval'"] : []), // dev: React Fast Refresh / 错误栈需要
  ].join(' ');

  // 生产用 nonce；dev 保留 'unsafe-inline' 以兼容 HMR 注入的样式
  const styleSrc = [
    "'self'",
    ...(isDev ? ["'unsafe-inline'"] : [`'nonce-${nonce}'`]),
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    'connect-src \'self\' https://api.openai.com https://api.anthropic.com https://*.supabase.co https://challenges.cloudflare.com',
    'frame-src https://challenges.cloudflare.com',
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ]
    .join('; ')
    .trim();
}

// 通过 Next.js 的 x-middleware-override-headers 机制把请求头覆盖传递给应用。
// 这正是 NextResponse.next({ request: { headers } }) 内部使用的方式，
// 这里手动合并以保留 next-intl 中间件自身可能设置的覆盖项（不破坏其行为）。
function propagateRequestHeader(response: NextResponse, name: string, value: string): void {
  const headerName = name.toLowerCase();
  const existing = response.headers.get('x-middleware-override-headers') || '';
  const names = existing
    ? existing.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  if (!names.includes(headerName)) {
    names.push(headerName);
  }
  response.headers.set('x-middleware-override-headers', names.join(','));
  response.headers.set(`x-middleware-request-${headerName}`, value);
}

function addSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  const csp = buildCsp(nonce);
  response.headers.set('Content-Security-Policy', csp);
  // 让 Next.js 在 SSR 时从请求头 CSP 中提取 nonce 并自动应用到框架脚本，
  // 同时让 server component 通过 headers().get('x-nonce') 读取 nonce。
  propagateRequestHeader(response, 'x-nonce', nonce);
  propagateRequestHeader(response, 'content-security-policy', csp);

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // X-XSS-Protection 已废弃且可引入漏洞（OWASP 建议停用），不再设置
  return response;
}

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

  // Handle CORS for API routes（API 不渲染 HTML，无需 nonce/CSP）
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

  // 页面请求：生成 per-request nonce
  const nonce = generateNonce();

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

    // Add security headers (with nonce)
    return addSecurityHeaders(response, nonce);
  }

  // Otherwise, just run intl middleware
  const response = intlMiddleware(request);
  return addSecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
