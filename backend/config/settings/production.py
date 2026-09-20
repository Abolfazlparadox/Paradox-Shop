import os
from django.core.exceptions import ImproperlyConfigured
from .base import *

DEBUG = False

# Production Secret Key Enforcement
prod_secret = os.getenv("DJANGO_SECRET_KEY") or SECRET_KEY
if not prod_secret or any(
    insecure_sub in prod_secret.lower()
    for insecure_sub in ("default", "unsecure", "insecure", "change-me", "dev-")
):
    raise ImproperlyConfigured(
        "A strong, production-grade DJANGO_SECRET_KEY environment variable is strictly required."
    )

# Host Verification (Disallow wildcard '*' in production)
env_hosts = [h.strip() for h in os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",") if h.strip()]
if "*" in ALLOWED_HOSTS or "*" in env_hosts:
    raise ImproperlyConfigured(
        "Wildcard '*' is strictly forbidden in ALLOWED_HOSTS for production."
    )

# CORS Enforcement for Production (Disallow wildcard origin, enforce explicit allowlist)
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# Security Headers & SSL
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() in ("true", "1", "t")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
