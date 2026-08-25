# Paradox Control Center — Security & RBAC Clearance Specification

## 1. Authentication Layer

All administrative API requests must supply an authentication header:
```http
Authorization: Bearer <jwt_access_token>
```
The backend `IsStaffAdmin` permission class rejects requests if:
1. The user is anonymous (`401 Unauthorized`).
2. The user account is inactive (`is_active=False`) (`403 Forbidden`).
3. The user is neither staff (`is_staff=True`) nor superuser (`is_superuser=True`) (`403 Forbidden`).

---

## 2. Granular RBAC Permissions Architecture

The capability resolution engine `get_user_effective_permissions(user)` constructs an authoritative permission set:
- **Superuser Clearance**: Automatically receives the wildcard permission `["*"]`, which satisfies all domain checks.
- **Staff Clearance**: Maps assigned Django permissions (e.g. `apps.orders.view_order` $\rightarrow$ `orders.view`) into human-readable domain keys.

### Standard Domain Capabilities:
| Domain | Permission Key | Description |
| :--- | :--- | :--- |
| **Orders** | `orders.view` | View order manifests and lists |
| | `orders.update` | Shift fulfillment lifecycle status |
| | `orders.cancel` | Cancel order and trigger stock restoration |
| **Products** | `products.view` | Browse catalog products |
| | `products.create` | Create new products and SKUs |
| | `products.update` | Edit product pricing and specifications |
| | `products.delete` | Permanently remove products |
| **Inventory** | `inventory.view` | View warehouse SKU reserve levels |
| | `inventory.update` | Adjust variant stock counts |
| **Customers** | `customers.view` | View patron dossiers and LTV |
| | `customers.manage` | Suspend or activate customer accounts |
| **Reviews** | `reviews.view` | Read review moderation queue |
| | `reviews.moderate` | Approve or reject reviews |
| **Comments** | `comments.view` | Read customer inquiries |
| | `comments.reply` | Publish official staff response |
| **Payments** | `payments.view` | Inspect financial transaction logs |
| **Analytics** | `analytics.view` | View deep revenue & cohort metrics |
| **Audit Logs**| `audit.view` | Stream immutable audit trail |
| **Settings** | `settings.manage` | Modify storefront parameters |

---

## 3. Data Sanitization & Secret Redaction

Audit logging services automatically run recursive payload sanitization before committing to PostgreSQL:
```python
SENSITIVE_KEYS = {
    'password', 'old_password', 'new_password', 'new_password_confirm',
    'token', 'access', 'refresh', 'secret', 'api_key', 'card_number', 'cvv'
}
```
Any occurrences in payload dictionaries or lists are permanently redacted with `"[REDACTED]"`.

---

## 4. Frontend Client Guarding (`AdminAuthGuard`)

The client router wraps `/admin/*` in `AdminAuthGuard.tsx`:
1. Validates `isAuthenticated` and `user.is_staff || user.is_superuser`.
2. Redirects unauthorized users to `/admin/login`.
3. Filters sidebar navigation links dynamically based on `usePermissions().can(permission)`.
