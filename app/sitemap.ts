import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://hopllm.com'

  const routes = [
    { path: '', priority: 1.0, changefreq: 'daily' as const },
    { path: '/about', priority: 0.8, changefreq: 'monthly' as const },
    { path: '/privacy', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/terms', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/docs', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/configure', priority: 0.9, changefreq: 'daily' as const },
    { path: '/templates', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/dashboard', priority: 0.7, changefreq: 'daily' as const },
    { path: '/dashboard/models', priority: 0.6, changefreq: 'weekly' as const },
    { path: '/dashboard/providers', priority: 0.6, changefreq: 'weekly' as const },
    { path: '/dashboard/routing-rules', priority: 0.6, changefreq: 'weekly' as const },
    { path: '/dashboard/stats', priority: 0.5, changefreq: 'daily' as const },
    { path: '/auth/login', priority: 0.4, changefreq: 'yearly' as const },
    { path: '/auth/register', priority: 0.4, changefreq: 'yearly' as const },
  ]

  const locales = ['en', 'zh']

  const urls: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    for (const route of routes) {
      const urlPath = route.path === '' ? `/${locale}` : `/${locale}${route.path}`
      urls.push({
        url: `${baseUrl}${urlPath}`,
        lastModified: new Date(),
        changeFrequency: route.changefreq,
        priority: route.priority,
      })
    }
  }

  // Also add root-level pages (default locale redirects handled by middleware)
  urls.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  })

  return urls
}
