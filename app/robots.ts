import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/api-key',
          '/dashboard/preferences',
          '/auth/login',
          '/auth/register',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/api-key',
          '/dashboard/preferences',
        ],
      },
    ],
    sitemap: 'https://hopllm.com/sitemap.xml',
    host: 'https://hopllm.com',
  }
}
