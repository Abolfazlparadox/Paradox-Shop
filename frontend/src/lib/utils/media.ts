/**
 * Paradox Shop — Media URL Normalizer
 *
 * Ensures all media/image URLs returned from the backend (whether containing
 * http://localhost:8000, http://127.0.0.1:8000, http://backend:8000, or relative paths)
 * are cleanly mapped to relative /media/... URLs.
 *
 * This allows:
 * 1. Next.js image optimizer inside Docker to fetch via internal proxy rewrites without 500 errors.
 * 2. Browsers to fetch directly via Next.js reverse proxy on localhost:3000/media/...
 * 3. Fallback graceful placeholders when media is absent.
 */

export function getMediaUrl(url: string | null | undefined): string {
  if (!url) return '';

  // Already clean relative path
  if (url.startsWith('/media/')) {
    return url;
  }

  // Absolute URL pointing to backend media
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/media/')) {
      return parsed.pathname;
    }
  } catch {
    // If not a full URL but starts with media/
    if (url.startsWith('media/')) {
      return `/${url}`;
    }
  }

  return url;
}
