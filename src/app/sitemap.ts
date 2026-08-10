import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://krts-pedia.vercel.app'
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/nations`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/people`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/events`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/wars`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/buildings`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/chronicle`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
  ]
}