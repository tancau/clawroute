import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://hopllm.com'
  
  const routes = [
    '',
    '/about',
    '/privacy',
    '/terms',
    '/docs',
    '/configure',
    '/templates',
    '/dashboard',
    '/auth/login',
    '/auth/register',
  ]

  const locales = ['en', 'zh']

  const urls: MetadataRoute.Sitemap = []

  // Generate URLs for all locales
  for (const locale of locales) {
    for (const route of routes) {
      urls.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1 : route === '/about' ? 0.8 : 0.6,
      })
    }
  }

  return urls
}
