import { MetadataRoute } from 'next';
import { env } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/products', '/products/*', '/sitemap-page'],
      disallow: ['/cart', '/checkout', '/dashboard/', '/payments/', '/api/', '/login', '/register'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
