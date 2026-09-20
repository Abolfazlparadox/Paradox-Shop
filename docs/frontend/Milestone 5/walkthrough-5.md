# Milestone 5 Walkthrough — Orders, Payments, Dashboard & Reviews

We have completed the implementation, integration, and verification of **Milestone 5 — Orders Tracking, Payment Terminal, User Dashboard & Verified Reviews** for **Paradox Shop**.

---

## 1. Overview of Accomplishments

### 1.1. Mock Payment Gateway Terminal ([/payments/[orderId]](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/payments/%5BorderId%5D/page.tsx))
- **Invoice Overview**: Displays invoice details, payable balance in Rial, line artifacts count, and recipient shipping destination.
- **Simulated Payment Execution**:
  - Simulates payment clearance via `POST /api/v1/payments/pay/` with idempotency protection (`crypto.randomUUID()`).
  - On 201 Created: Renders a verified receipt containing `transaction_id` (`MOCK-TXN-...`), gateway name, amount paid, and direct navigation back to the order tracking view.
  - Supports simulation of payment failures and retry handling.

### 1.2. Client Dashboard Hub ([/dashboard](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/dashboard/page.tsx) & [layout.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/dashboard/layout.tsx))
- **Layout & Protection**: Protected route with responsive sidebar navigation (Overview, Orders, Addresses, Profile & Security, Sign Out).
- **Overview Dashboard**: High-level metrics (Total Orders, Active Dispatches, Verified Client status) and recent fulfillment activity preview.

### 1.3. Orders History & Visual Tracking Timeline ([/dashboard/orders](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/dashboard/orders/page.tsx) & [[id]](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/dashboard/orders/%5Bid%5D/page.tsx))
- **Order History & Filter Tabs**: Tabbed interface filtering by status (`ALL`, `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- **Order Cards ([OrderCard.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/orders/components/OrderCard.tsx))**: Status badges with semantic color coding, order number, timestamp, total price, and action CTAs.
- **Visual Status Timeline ([OrderTimeline.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/orders/components/OrderTimeline.tsx))**: Visual stepper illustrating state transitions (`PENDING` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED` or `CANCELLED`).
- **Order Cancellation**: Users can cancel pending/processing orders via `POST /api/v1/orders/{id}/cancel/` which atomically restores reserved catalog inventory.

### 1.4. Verified Purchase Reviews ([CreateReviewModal.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/reviews/components/CreateReviewModal.tsx))
- **Interactive Evaluation Modal**: Accessible star rating picker (1-5 stars), optional headline, and review feedback body.
- **Moderation Notification**: Informs users upon submission that their review is awaiting moderation before public display on product detail pages.

### 1.5. Profile & Security Management ([/dashboard/profile](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/dashboard/profile/page.tsx))
- **Personal Coordinates**: Updating first name, last name, phone number, national ID, gender, and date of birth via `PATCH /api/v1/users/profile/`.
- **Password Rotation**: Secure password change via `POST /api/v1/users/password/change/` with match validation.

---

## 2. API Endpoints Consumed

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/payments/pay/` | `POST` | Executing mock payment clearance with idempotency |
| `/api/v1/orders/` | `GET` | Listing user orders with pagination |
| `/api/v1/orders/{id}/` | `GET` | Retrieving single order details and line-item snapshot |
| `/api/v1/orders/{id}/cancel/` | `POST` | Cancelling pending/processing order and restoring inventory |
| `/api/v1/reviews/create/` | `POST` | Submitting verified purchase review for delivered items |
| `/api/v1/users/profile/` | `GET`, `PATCH` | Fetching and updating user account/profile details |
| `/api/v1/users/password/change/` | `POST` | Updating account password |

---

## 3. Verification Gate Results

| Verification Gate | Command | Result |
|---|---|---|
| **TypeScript Typecheck** | `npx tsc --noEmit` | **0 errors** |
| **ESLint Check** | `npm run lint` | **0 warnings / 0 errors** |
| **Next.js Production Build** | `npm run build` | **0 errors** (14/14 routes compiled) |
| **Docker Compose Status** | `docker compose ps` | All containers running (`shop_frontend`, `shop_backend`, `shop_postgres`, `shop_redis`) |
| **Payment Terminal Route** | `http://localhost:3000/payments/[orderId]` | **200 OK** |
| **Dashboard Overview Route** | `http://localhost:3000/dashboard` | **200 OK** |
| **Orders History Route** | `http://localhost:3000/dashboard/orders` | **200 OK** |
| **Addresses Route** | `http://localhost:3000/dashboard/addresses` | **200 OK** |
| **Profile Route** | `http://localhost:3000/dashboard/profile` | **200 OK** |

---

## 4. Next Milestone Boundary

- Milestone 5 is complete.
- **Milestone 6 — Polish, SEO & Accessibility** and **Milestone 7 — End-to-End User Flow Verification** are ready for execution.
