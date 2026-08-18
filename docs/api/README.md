# Paradox Shop API Reference Guide

## Base URL & Versioning

- **Base Path**: `/api/v1/`
- **Versioning Strategy**: URI path versioning (`/api/v1/`, `/api/v2/`).

## Authentication & Authorization

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

### Authentication Flow:
1. **Register**: `POST /api/v1/users/register/` → creates account.
2. **Login**: `POST /api/v1/users/login/` → returns `{ "access": "...", "refresh": "...", "user": {...} }`.
3. **Refresh**: `POST /api/v1/users/login/refresh/` → returns new access token.
4. **Logout**: `POST /api/v1/users/logout/` → blacklists refresh token.

## Standard Error Response Format

All API errors adhere to a standardized envelope:

```json
{
  "error": {
    "code": "ValidationError",
    "message": "A validation or API error occurred.",
    "details": {
      "field_name": [
        "Error message detailing the failure."
      ]
    }
  }
}
```

## Pagination Standard

List endpoints adhere to `StandardResultsSetPagination`:

```json
{
  "count": 42,
  "total_pages": 3,
  "current_page": 1,
  "next": "http://localhost:8000/api/v1/products/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

- **Default page size**: 20
- **Max page size**: 100 (`?page_size=N`)

## Request Tracing

Every response includes an `X-Request-ID` header containing a UUID for distributed tracing across logs.
