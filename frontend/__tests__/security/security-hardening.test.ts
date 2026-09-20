import { describe, test, expect } from 'vitest';
import { getSafeRedirectUrl } from '@/lib/utils/url';

describe('Frontend Security Hardening & Open Redirect Protection', () => {
  describe('getSafeRedirectUrl (CWE-601 Prevention)', () => {
    test('Allows safe relative paths', () => {
      expect(getSafeRedirectUrl('/admin')).toBe('/admin');
      expect(getSafeRedirectUrl('/products/luxury-artifact')).toBe('/products/luxury-artifact');
      expect(getSafeRedirectUrl('/profile?tab=orders')).toBe('/profile?tab=orders');
    });

    test('Rejects protocol-relative URLs attempting host redirection', () => {
      expect(getSafeRedirectUrl('//evil.com', '/fallback')).toBe('/fallback');
      expect(getSafeRedirectUrl('//evil.com/path', '/admin')).toBe('/admin');
    });

    test('Rejects external absolute URLs with schemes', () => {
      expect(getSafeRedirectUrl('https://phishing.site', '/')).toBe('/');
      expect(getSafeRedirectUrl('http://attacker.com/steal', '/admin')).toBe('/admin');
      expect(getSafeRedirectUrl('javascript:alert(1)', '/')).toBe('/');
    });

    test('Rejects backslash bypass attempts', () => {
      expect(getSafeRedirectUrl('/\\evil.com', '/')).toBe('/');
      expect(getSafeRedirectUrl('\\\\evil.com', '/')).toBe('/');
    });

    test('Rejects newline and carriage return injection in redirect URL', () => {
      expect(getSafeRedirectUrl('/dashboard\r\nSet-Cookie: evil=1', '/')).toBe('/');
      expect(getSafeRedirectUrl('/admin\nLocation: https://evil.com', '/admin')).toBe('/admin');
    });

    test('Falls back gracefully for null, undefined, or empty strings', () => {
      expect(getSafeRedirectUrl(null, '/default')).toBe('/default');
      expect(getSafeRedirectUrl(undefined, '/default')).toBe('/default');
      expect(getSafeRedirectUrl('', '/default')).toBe('/default');
      expect(getSafeRedirectUrl('   ', '/default')).toBe('/default');
    });
  });

  describe('JSON-LD XSS Escape Invariant', () => {
    test('Escapes < characters so script breakout is prevented', () => {
      const maliciousPayload = {
        name: 'Test Artifact </script><script>alert("xss")</script>',
      };
      const serialized = JSON.stringify(maliciousPayload).replace(/</g, '\\u003c');
      expect(serialized).not.toContain('</script>');
      expect(serialized).toContain('\\u003c/script>');
    });
  });
});
