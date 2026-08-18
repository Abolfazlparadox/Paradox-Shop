# ADR-003: JWT Authentication as Primary Stateless API Mechanism

- **Status**: Accepted
- **Date**: 2026-08-17
- **Deciders**: Senior Software Architect / Backend Engineering Team

## Context and Problem Statement

Paradox Shop is designed as an API-first platform where the Django REST Framework backend serves multiple consumer types (Next.js web application, mobile applications, third-party integrations).

Previously, the backend issued JWT access and refresh tokens via `djangorestframework-simplejwt`, but `DEFAULT_AUTHENTICATION_CLASSES` was configured exclusively for `SessionAuthentication`. Consequently:
1. Bearer JWT tokens in the `Authorization` header were never validated on subsequent API calls.
2. The OpenAPI documentation incorrectly specified `cookieAuth` (sessionid) as the only security scheme.
3. Protected endpoints were inaccessible to stateless API consumers.

## Decision Outcome

**Chosen Option**: Configure **JSON Web Token (JWT) Authentication** via `rest_framework_simplejwt.authentication.JWTAuthentication` as the primary authentication class, alongside `SessionAuthentication` (retained for Django Admin).

### Key Technical Details:
1. **Access Token Lifetime**: 60 minutes (configurable via `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`).
2. **Refresh Token Lifetime**: 7 days (configurable via `JWT_REFRESH_TOKEN_LIFETIME_DAYS`).
3. **Token Rotation & Blacklisting**:
   - `ROTATE_REFRESH_TOKENS = True`
   - `BLACKLIST_AFTER_ROTATION = True`
   - `rest_framework_simplejwt.token_blacklist` installed in `INSTALLED_APPS`.
4. **Explicit Logout**: Added `POST /api/v1/users/logout/` which blacklists the provided refresh token.
5. **OpenAPI Security Scheme**: Configured `bearerAuth` (HTTP Bearer format: JWT) in `SPECTACULAR_SETTINGS`.

## Consequences

### Positive
- Fully stateless API consumption for web and mobile frontends.
- Explicit logout capability via database-backed token blacklisting.
- Accurate OpenAPI documentation enabling automated TypeScript client generation.
- Defense-in-depth against session fixation and CSRF on pure API routes.

### Negative
- Requires maintaining the token blacklist table for rotated/revoked tokens (cleaned via Celery/cron periodically).
