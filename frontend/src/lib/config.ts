/**
 * Centralized Application Configuration & Environment Variables
 */

export const env = {
  // Public API URL accessible from the browser
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',

  // Internal API URL for Server-Side Rendering (Docker network)
  INTERNAL_API_URL:
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://backend:8000/api/v1',

  // Internal backend root URL for rewrites / media SSR
  INTERNAL_BACKEND_URL:
    process.env.INTERNAL_BACKEND_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    'http://backend:8000',

  // Site URL for metadata & sitemaps
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',

  // Node Environment
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;

/**
 * Returns the authoritative API base URL depending on execution environment (Client vs Server)
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return env.INTERNAL_API_URL;
  }
  const configured = env.NEXT_PUBLIC_API_URL;
  try {
    const parsed = new URL(configured);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      parsed.hostname = window.location.hostname;
      return parsed.toString().replace(/\/$/, '');
    }
    return configured.replace(/\/$/, '');
  } catch {
    return configured.replace(/\/$/, '');
  }
}
