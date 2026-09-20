# Paradox Control Center — REST API Reference

All administrative endpoints are mounted under the path `/api/v1/admin/` and require JWT Bearer Authentication (`Authorization: Bearer <access_token>`) from an authenticated staff/superuser account.

---

## 1. Identity & Clearance

### `GET /api/v1/admin/me/`
Returns the authenticated administrator's profile, full name, role, and resolved capability permissions matrix.

---

## 2. Telemetry & Analytics

### `GET /api/v1/admin/dashboard/`
Returns high-level operational KPIs, live unread notification counts, and pending order summary counts.

### `GET /api/v1/admin/analytics/`
Query Parameters:
- `days` (integer, optional, default: 30): Lookback period in days (`7`, `30`, `90`, `365`).

Response payload includes:
- `kpis`: Monthly revenue, total orders, conversion rate, AOV, CAC, refund rate.
- `revenue_chart`: Daily/monthly revenue, projected targets, order counts.
- `acquisition_channels`: Direct, Organic Search, Social, Referral, Email breakdown.
- `top_products`: Best-selling SKUs with sales units and gross revenue.
- `cohorts`: Monthly patron cohort retention matrix.

---

## 3. Order Lifecycle & Fulfillment

### `GET /api/v1/admin/orders/`
Query Parameters:
- `status` (string, optional): `pending`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`.
- `search` (string, optional): Search order number, customer email, or customer name.

### `GET /api/v1/admin/orders/{id}/`
Returns full order manifest including line items, variant SKUs, destination shipping address, and payment information.

### `PATCH /api/v1/admin/orders/{id}/status/`
Request Body:
```json
{
  "status": "processing"
}
```
Transitions order along the validated state machine.

### `POST /api/v1/admin/orders/{id}/cancel/`
Cancels order, restores inventory variant stock atomically, and records an audit log.

### `POST /api/v1/admin/orders/bulk-status/`
Request Body:
```json
{
  "order_ids": ["uuid-1", "uuid-2"],
  "status": "shipped"
}
```

---

## 4. Product Catalog & Inventory SKU Engine

### `GET /api/v1/admin/products/`
Query Parameters:
- `category` (string, optional): Filter by category slug.
- `stock` (string, optional): `LOW` (<=10), `OUT` (0).
- `search` (string, optional): Product name, slug, description.

### `POST /api/v1/admin/products/`
Creates a product artifact with nested variant SKUs.

### `PATCH /api/v1/admin/products/{id}/`
Updates product pricing, title, description, and specifications.

### `DELETE /api/v1/admin/products/{id}/`
Removes product artifact and variant SKUs from the database.

### `GET /api/v1/admin/inventory/`
Returns all product variant SKUs with reserve stock counts, prices, and low-stock indicators.

### `PATCH /api/v1/admin/inventory/{variant_id}/stock/`
Updates stock for a specific SKU. Automatically triggers `AdminNotification` if stock drops $\le 10$.

### `POST /api/v1/admin/inventory/batch-stock/`
Request Body:
```json
{
  "items": [
    { "variant_id": "uuid-1", "stock": 25 },
    { "variant_id": "uuid-2", "stock": 8 }
  ]
}
```

---

## 5. Patron & Customer Directory

### `GET /api/v1/admin/customers/`
Returns registered customer dossiers annotated with total order count, lifetime spend (LTV), and last order date.

### `POST /api/v1/admin/customers/{id}/toggle-status/`
Toggles customer status between `ACTIVE` and `SUSPENDED`.

---

## 6. Review & Comment Moderation

### `GET /api/v1/admin/reviews/`
### `POST /api/v1/admin/reviews/{id}/moderate/`
Request Body:
```json
{ "is_approved": true }
```

### `GET /api/v1/admin/comments/`
### `POST /api/v1/admin/comments/{id}/moderate/`
### `POST /api/v1/admin/comments/{id}/reply/`
Publishes an official verified staff response to a customer comment.

---

## 7. Payments & Audit Logs

### `GET /api/v1/admin/payments/`
Returns payment transactions with gateway response payloads and idempotency keys.

### `GET /api/v1/admin/activity/`
Returns immutable audit logs with sanitized metadata.

### `GET /api/v1/admin/notifications/`
### `POST /api/v1/admin/notifications/{id}/read/`
### `POST /api/v1/admin/notifications/read-all/`

### `GET /api/v1/admin/settings/`
### `PATCH /api/v1/admin/settings/`
