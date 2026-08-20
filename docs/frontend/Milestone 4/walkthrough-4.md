# Milestone 4 Walkthrough — Commerce Lifecycle

We have completed the implementation, integration, and verification of **Milestone 4 — Commerce Lifecycle: Authentication, Dedicated Cart, Address Book & Multi-Step Checkout** for **Paradox Shop**.

---

## 1. Overview of Accomplishments

### 1.1. Standalone Authentication Pages ([/login](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/login/page.tsx) & [/register](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/register/page.tsx))
- **Dedicated Login**: Clean monochromatic form with email, password, and `?redirect=` query param preservation. Triggers automatic guest cart merging via `cartApi.mergeCart({ session_key })` upon successful JWT authentication.
- **Dedicated Register**: Form validating first name, last name, email, optional Iranian phone number, password, and password confirmation with auto-login on creation.
- **Error Mapping**: Displays user-friendly, structured alerts for invalid credentials, duplicate emails, and validation errors.

### 1.2. Dedicated Cart Experience ([/cart](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/cart/page.tsx))
- **Cart Item Rows ([CartItemRow.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/cart/components/CartItemRow.tsx))**: High-density product display showing selected variant SKU, variant name, unit price, quantity steppers with debounce, line-item totals, and remove action.
- **Order Summary Card ([CartSummary.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/cart/components/CartSummary.tsx))**: Subtotal in Rial, courier shipping notes, and "Proceed to Checkout" primary CTA button.
- **Guest Synchronization Banner ([CartGuestAlert.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/cart/components/CartGuestAlert.tsx))**: Encourages guest users to log in to persist items across devices.
- **Optimistic Mutations**: Updates and deletions immediately invalidate and synchronize server cart state via TanStack Query.

### 1.3. Address Management System ([src/features/address/](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/address/))
- **Address Card ([AddressCard.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/address/components/AddressCard.tsx))**: Displays recipient details, province, city, postal code, full address line, and default badge.
- **Address Modal ([AddressModal.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/address/components/AddressModal.tsx))**: Accessible dialog for adding or editing addresses matching backend `AddressRequest` schema.
- **Address Selector ([AddressSelector.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/address/components/AddressSelector.tsx))**: Grid of selectable addresses for checkout, including inline creation and deletion.

### 1.4. Multi-Step Checkout Flow ([/checkout](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/checkout/page.tsx))
- **Route Protection**: Unauthenticated users are redirected to `/login?redirect=/checkout`.
- **Empty Cart Guard**: Redirects empty cart sessions to `/cart`.
- **Step 1 — Delivery Address**: User chooses a delivery address or adds a new one.
- **Step 2 — Review & Notes**: Line-item snapshot with price guarantees and optional delivery instructions.
- **Step 3 — Atomic Order Creation**: Calls `POST /api/v1/orders/checkout/` with `{ address_id, notes }`. On 201 Created, clears cart state and displays the Order Confirmation view with generated `order_number` and status.

---

## 2. API Endpoints Consumed

| Endpoint | Method | Status | Purpose |
|---|---|---|---|
| `/api/v1/users/login/` | `POST` | Active | User authentication and JWT access/refresh token issue |
| `/api/v1/users/register/` | `POST` | Active | New user account registration |
| `/api/v1/users/addresses/` | `GET`, `POST` | Active | Listing and creating user shipping addresses |
| `/api/v1/users/addresses/{id}/` | `PATCH`, `DELETE` | Active | Updating and soft-deleting addresses |
| `/api/v1/cart/` | `GET` | Active | Querying active user/guest cart |
| `/api/v1/cart/items/{id}/` | `PATCH`, `DELETE` | Active | Updating item quantities and removing items |
| `/api/v1/cart/merge/` | `POST` | Active | Merging guest session cart into user account on login |
| `/api/v1/orders/checkout/` | `POST` | Active | Atomic order creation from current cart |

---

## 3. Verification Gate Results

| Verification Gate | Command | Result |
|---|---|---|
| **TypeScript Typecheck** | `npx tsc --noEmit` | **0 errors** |
| **ESLint Check** | `npm run lint` | **0 warnings / 0 errors** |
| **Next.js Production Build** | `npm run build` | **0 errors** (10/10 routes compiled) |
| **Docker Compose Status** | `docker compose ps` | All containers healthy (`shop_frontend`, `shop_backend`, `shop_postgres`, `shop_redis`) |
| **Login Route** | `http://localhost:3000/login` | **200 OK** |
| **Register Route** | `http://localhost:3000/register` | **200 OK** |
| **Cart Route** | `http://localhost:3000/cart` | **200 OK** |
| **Checkout Route** | `http://localhost:3000/checkout` | **200 OK** |

---

## 4. Next Milestone Boundary

- Milestone 4 is complete.
- **Milestone 5 — Orders & Reviews** (Order details, status machine timeline, `/payments/pay/` mock gateway integration, and verified reviews creation) is queued for the next phase.
