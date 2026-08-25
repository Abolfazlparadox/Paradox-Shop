# Paradox Control Center — Operations Playbook & Release Verification

## 1. Operational Verification Gates

To verify that the administrative system is healthy and release-ready:

### 1.1 Backend Test Suite
```bash
docker compose exec backend pytest
```
*Expected: 86 passed tests with 0 failures.*

### 1.2 OpenAPI Schema Validation
```bash
docker compose exec backend python manage.py spectacular --validate
```
*Expected: Clean output with 0 validation errors.*

### 1.3 Frontend Type Check & Linter
```bash
cd frontend
npx tsc --noEmit
npm run lint
npm test
```
*Expected: 0 errors, 0 warnings, all tests pass.*

### 1.4 Frontend Production Build
```bash
cd frontend
npm run build
```
*Expected: All 33 static and dynamic routes compile successfully.*

---

## 2. Common Administrative Workflows

### 2.1 Low Stock Alert & Replenishment
1. When any variant SKU drops $\le 10$ units, an automated `AdminNotification` is created (`LOW_STOCK`).
2. Staff navigates to `/admin/inventory` (or clicks the notification in the top bar).
3. The inventory table highlights low-stock SKUs in amber.
4. Staff adjusts the reserve count input inline and clicks **Save** (or **Save All Updates**).
5. The change is atomically persisted in PostgreSQL and logged to the Audit trail.

### 2.2 Order Processing & Cancellation Restock
1. When a new order arrives, the dashboard unread badge increments.
2. Staff inspects the order at `/admin/orders?view=<id>` or via the table drawer.
3. State transitions (`PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED`) are validated against server lifecycle rules.
4. If an order is cancelled via **Cancel & Restock**, the server executes `select_for_update()`, restores variant SKU quantities to inventory, transitions the order status to `CANCELLED`, and logs the operation.

### 2.3 Customer Comment Moderation & Official Replies
1. Customer questions from product pages arrive in `/admin/comments`.
2. Staff approves the comment or writes an official reply via **Reply as Staff**.
3. The reply is published with verified staff badge on the storefront.
