# Paradox Shop Endpoint Catalog

## Health & Diagnostics
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/health/` | Public | System health check (DB + Redis) |
| `GET` | `/api/v1/health/live/` | Public | Process liveness probe |
| `GET` | `/api/v1/health/ready/` | Public | Process readiness probe |

## Users & Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/users/register/` | Public | Register new user account |
| `POST` | `/api/v1/users/login/` | Public | Authenticate and obtain JWT pair |
| `POST` | `/api/v1/users/login/refresh/` | Public | Refresh JWT access token |
| `POST` | `/api/v1/users/logout/` | Bearer | Blacklist refresh token (Logout) |
| `POST` | `/api/v1/users/password/change/` | Bearer | Change user password |
| `GET` | `/api/v1/users/profile/` | Bearer | Retrieve user profile |
| `PATCH` | `/api/v1/users/profile/` | Bearer | Update user profile |
| `GET` | `/api/v1/users/addresses/` | Bearer | List user addresses |
| `POST` | `/api/v1/users/addresses/` | Bearer | Create new address |
| `GET` | `/api/v1/users/addresses/{id}/` | Bearer | Retrieve address |
| `PATCH` | `/api/v1/users/addresses/{id}/` | Bearer | Update address |
| `DELETE` | `/api/v1/users/addresses/{id}/` | Bearer | Soft delete address |

## Products & Catalog
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/products/` | Public | Paginated product list (filters: category, brand, search, min/max price, is_featured) |
| `GET` | `/api/v1/products/{slug}/` | Public | Product detail with variants, images, and attributes |

## Categories & Taxonomy
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/categories/tree/` | Public | Nested category hierarchy tree |
| `GET` | `/api/v1/categories/` | Public | Flat category listing (filter: parent, is_root) |
| `GET` | `/api/v1/categories/{slug}/` | Public | Category detail with direct children and attributes |

## Shopping Cart
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/cart/` | Public / Session / Bearer | Retrieve active cart and items |
| `POST` | `/api/v1/cart/items/` | Public / Session / Bearer | Add product / variant item to cart |
| `PATCH` | `/api/v1/cart/items/{item_id}/` | Public / Session / Bearer | Update cart item quantity |
| `DELETE` | `/api/v1/cart/items/{item_id}/` | Public / Session / Bearer | Remove item from cart |
| `POST` | `/api/v1/cart/merge/` | Bearer | Merge guest session cart into user account cart |

## Orders & Checkout
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/orders/` | Bearer | List authenticated user orders |
| `GET` | `/api/v1/orders/{id}/` | Bearer | Retrieve single order detail snapshot |
| `POST` | `/api/v1/orders/checkout/` | Bearer | Create order from user cart (locks stock atomically) |
| `POST` | `/api/v1/orders/{id}/cancel/` | Bearer | Cancel pending/processing order (restores stock) |

## Payments
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/payments/` | Bearer | List authenticated user payments |
| `GET` | `/api/v1/payments/{id}/` | Bearer | Retrieve single payment record |
| `POST` | `/api/v1/payments/pay/` | Bearer | Process mock payment on pending order |

## Reviews & Ratings
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/reviews/product/{product_id}/` | Public | List approved public reviews for a product |
| `POST` | `/api/v1/reviews/create/` | Bearer | Submit review (requires verified delivered purchase) |
