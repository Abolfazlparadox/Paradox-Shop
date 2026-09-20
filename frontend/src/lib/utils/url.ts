/**
 * Sanitizes and validates a redirection URL to prevent Open Redirect vulnerabilities (CWE-601).
 * Ensures the target is an internal relative path starting with a single '/' and rejects
 * protocol-relative URLs ('//'), backslash escapes ('/\\'), or external URLs with scheme.
 */
export function getSafeRedirectUrl(url: string | null | undefined, fallback: string = '/'): string {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();

  // Must start with a single '/' and not start with '//' or '/\'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    // Reject newline, carriage return, and tab characters to prevent header injection or bypasses
    if (!/[\r\n\t]/.test(trimmed)) {
      return trimmed;
    }
  }

  return fallback;
}
