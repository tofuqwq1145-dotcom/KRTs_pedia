import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://krt-server.vercel.app'
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/nations`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    // 把其他公开页面都列在这里
  ]
}
