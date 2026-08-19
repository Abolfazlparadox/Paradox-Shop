# Paradox Shop — Frontend Architecture & Implementation Plan

This document defines the comprehensive architecture, design system, motion/3D strategy, and phased milestone roadmap for the **Paradox Shop** frontend. The frontend is built on **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, **TanStack Query v5**, and **Zustand**, consuming the Django REST Framework backend API.

---

## 1. Architectural Overview & Technical Stack

```
                                  ┌────────────────────────────────────────┐
                                  │      Next.js App Router (14.2.x)       │
                                  └───────────────────┬────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │ Server Components (RSC)   │                                 │ Client Components (RCC)   │
         │ - SEO & OpenGraph         │                                 │ - Interactive UI / Forms  │
         │ - Fast initial HTML       │                                 │ - Zustand (UI & Auth)     │
         │ - Semantic layout         │                                 │ - TanStack Query v5       │
         │ - Zero client bundle cost │                                 │ - Framer Motion & Lenis   │
         └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                       │                                                             │
                       └──────────────────────────────┬──────────────────────────────┘
                                                      │
                                      ┌───────────────▼───────────────┐
                                      │   Typed API Client (Axios)    │
                                      │ - Concurrency-Safe Refresh    │
                                      │ - X-Request-ID Tracking       │
                                      │ - Normalized Error Handling   │
                                      │ - Session / Guest Support     │
                                      └───────────────┬───────────────┘
                                                      │ (HTTP / JSON / Bearer)
                                      ┌───────────────▼───────────────┐
                                      │     DRF Backend (/api/v1/)    │
                                      └───────────────────────────────┘
```

### Core Technology Choices & Constraints
- **Framework**: Next.js 14.2 (App Router, React 18, TypeScript 5.5, Node 20/24 compatible).
- **Styling & Tokens**: Tailwind CSS 3.4 with unified CSS custom properties (`:root` / `.dark`) as the single source of truth for semantic design tokens.
- **Server State**: TanStack Query v5 for remote data caching, background revalidation, and mutation states (products, categories, cart, orders, reviews, addresses).
- **Client State**: Zustand for local/ephemeral UI state (auth token memory, cart drawer visibility, modal triggers, theme mode).
- **API Client**: Centralized, typed Axios client with:
  - Base URL configuration via `NEXT_PUBLIC_API_URL`.
  - Request interceptor attaching `Authorization: Bearer <access_token>` and `X-Request-ID`.
  - Concurrency-safe response interceptor queuing parallel 401s during a single `/users/login/refresh/` roundtrip.
  - Standardized error transformation matching backend's `{ code, detail, errors, request_id }` contract.
- **Icons**: Lucide React (standardized 24x24 SVG geometry, zero emoji placeholders).
- **Motion**: Framer Motion with restrained curves and strict `prefers-reduced-motion` compliance.

---

## 2. Brand Identity & Design System: "Impossible Minimalism"

### 2.1. Visual Thesis & Philosophy
Paradox Shop embodies **"Impossible Minimalism"** — inspired by the Penrose Triangle, architectural precision, controlled visual tension, and high-tech luxury. 

Instead of decorative noise (cluttered glass cards, floating rainbow gradients, and generic SaaS patterns), the identity relies on:
1. **Engineered Precision**: Crisp hairline borders (`1px` subtle lines), razor-sharp typography scale, disciplined negative space.
2. **Controlled Depth**: Layered near-black surfaces (`#050505` to `#141414`) with subtle, surgical contrast.
3. **Monochromatic Restraint**: Monochrome foundation with high-contrast text and warm-white/metallic glow highlights.
4. **Signature Visual Element**: Mathematical geometric wireframes and optical paradox motifs (Penrose wireframes, impossible isometric coordinates) integrated subtly in hero and section markers.

### 2.2. Token System (Single Source of Truth)

```css
:root {
  /* Semantic Neutral Palette (Light Mode Fallback) */
  --bg-primary: #fafafa;
  --bg-secondary: #f4f4f5;
  --bg-elevated: #ffffff;
  --bg-glass: rgba(255, 255, 255, 0.85);
  
  --fg-primary: #09090b;
  --fg-secondary: #71717a;
  --fg-muted: #a1a1aa;
  
  --border-subtle: #e4e4e7;
  --border-accent: #d4d4d8;
  
  --accent: #09090b;
  --accent-fg: #ffffff;
  --accent-glow: rgba(0, 0, 0, 0.08);

  /* Status Colors */
  --status-success: #10b981;
  --status-warning: #f59e0b;
  --status-error: #ef4444;
  --status-info: #3b82f6;
}

.dark {
  /* Branded Impossible Minimalism (Dark Mode Default) */
  --bg-primary: #050505;
  --bg-secondary: #0c0c0e;
  --bg-elevated: #141417;
  --bg-glass: rgba(12, 12, 14, 0.80);
  
  --fg-primary: #fcfcfc;
  --fg-secondary: #a1a1aa;
  --fg-muted: #52525b;
  
  --border-subtle: #1f1f23;
  --border-accent: #323238;
  
  --accent: #ffffff;
  --accent-fg: #050505;
  --accent-glow: rgba(255, 255, 255, 0.12);

  /* Status Colors */
  --status-success: #10b981;
  --status-warning: #f59e0b;
  --status-error: #f87171;
  --status-info: #60a5fa;
}
```

### 2.3. Typography Architecture
Self-hosted at build time via `next/font/google` (zero runtime Google requests, zero layout shift):
- **Display & Headings**: `Space Grotesk` (geometric, characterful, engineered aesthetic).
- **Body & Controls**: `Inter` (neutral, crisp legibility down to 11px, rich numeral OpenType features).
- **Technical & Metadata**: `JetBrains Mono` (for SKU, order numbers `PDX-YYYYMMDD-XXXXXX`, transaction IDs, and currency amounts).

### 2.4. Typography Scale
| Role | Font Family | Size / Leading | Weight | Tracking |
|---|---|---|---|---|
| **Display** | Space Grotesk | 48px – 72px / 1.05 | 700 / Bold | `-0.04em` |
| **Heading 1** | Space Grotesk | 36px – 44px / 1.15 | 600 / SemiBold | `-0.03em` |
| **Heading 2** | Space Grotesk | 24px – 28px / 1.25 | 600 / SemiBold | `-0.02em` |
| **Heading 3** | Space Grotesk | 18px – 20px / 1.35 | 500 / Medium | `-0.01em` |
| **Body Lead** | Inter | 16px – 18px / 1.6 | 400 / Regular | `0` |
| **Body Default** | Inter | 14px – 15px / 1.5 | 400 / Regular | `0` |
| **Label / Action** | Inter | 13px – 14px / 1.0 | 500 / Medium | `+0.01em` |
| **Caption / Tiny** | Inter | 11px – 12px / 1.4 | 400 / Regular | `+0.02em` |
| **Code / Metadata** | JetBrains Mono | 12px – 13px / 1.4 | 500 / Medium | `0` |

### 2.5. Internationalization & RTL-Readiness
- Locale files located at `src/locales/en.json`.
- Uses CSS logical properties (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`, `border-s-`, `border-e-`) across all components to ensure seamless future activation of Persian (`fa.json`) without refactoring components.

---

## 3. Motion, 3D & Interaction Strategy

1. **Motion Archetype**: *Premium & Engineered*.
   - Duration palette: Quick (120ms), Standard (250ms), Dramatic (450ms).
   - Easing curve: `cubic-bezier(0.16, 1, 0.3, 1)` (snappy ease-out deceleration, 0% overshoot).
2. **Framer Motion Primitives**:
   - `FadeIn`: Subtle opacity + 10px Y-translation.
   - `StaggerContainer`: Controlled micro-cascade (<200ms total stagger budget).
   - `InteractiveScale`: Button press scale to `0.98` with crisp 120ms settle.
3. **Hero 3D / Fallback Strategy**:
   - Three.js / React Three Fiber Penrose geometry is isolated as an optional, lazy-loaded client component.
   - WebGL feature detection and static SVG geometric wireframe fallback are built-in for low-power devices, mobile views, and users with `prefers-reduced-motion`.
4. **Smooth Scrolling (Lenis)**:
   - Evaluated strictly: Lenis is scoped to landing/editorial surfaces only and disabled on dialogs, mobile drawers, and under `prefers-reduced-motion`.

---

## 4. Self-Critique & Anti-Pattern Elimination

| Tempting AI Default | Why Rejected | Paradox Shop Solution |
|---|---|---|
| Purple/Cyan neon glow gradients | Generic SaaS template look | Monochromatic deep zinc (`#050505`) with controlled warm metallic/white accents |
| Massive border-radii (`rounded-3xl` everywhere) | Looks playful/childish | Disciplined, architectural radii (`rounded-md` / `rounded-lg` / `rounded-none` on technical frames) |
| Everything in `"use client"` | Destroys SSR, SEO, and bundle size | Strict Server Component boundary; Client Components only for stateful leaves |
| Fake client-side price/coupon calculations | Security risk & violates backend contract | All totals, stocks, and validations derived authoritatively from server API |
| Emoji icons (🚀, 🛒, 📦) | Amateurish aesthetic | Pure Lucide SVG icons with uniform 24x24 viewBox |

---

## 5. Phased Implementation Milestones

### **Milestone 1 — Foundation (Current Focus)**
- [x] TypeScript strict configuration & Path aliases (`@/*`).
- [ ] Dependencies installation (`@tanstack/react-query`, `zustand`, `axios`, `lucide-react`, `clsx`, `tailwind-merge`, `framer-motion`).
- [ ] Tailwind configuration with semantic CSS variables (`:root` / `.dark`).
- [ ] Self-hosted build-time typography (`Space Grotesk`, `Inter`, `JetBrains Mono`).
- [ ] TypeScript DTOs & Models derived from OpenAPI (`Paradox Shop API.yaml`).
- [ ] Centralized Axios API client with concurrency-safe JWT refresh, request-id, and error normalization.
- [ ] Zustand Auth store (`useAuthStore`) with secure memory token storage & session handling.
- [ ] TanStack Query Provider & Theme Provider in `src/app/providers.tsx`.
- [ ] Core base UI primitives in `src/components/ui/` (Button, Input, Badge, Skeleton, Card, Container, Toast/Alert).
- [ ] Internationalization dictionary `src/locales/en.json` (RTL ready).
- [ ] Verification: TypeCheck, Lint, Build, API connectivity test.

### **Milestone 2 — Design System & Navigation**
- Navbar with search trigger, cart counter, category dropdown, auth button, mobile drawer.
- Footer with brand manifesto, sitemap, legal, payment indicators.
- Extended UI components: Modal, Drawer, Tooltip, Tabs, Price, Product Card with variant pills.

### **Milestone 3 — Public Store**
- Home / Landing Page (Hero thesis, signature geometric element, featured collection, material narrative).
- Catalog (`/products`) with server-side filters, search, pagination, category tree.
- Product Detail (`/products/[slug]`) with gallery, variant picker, live stock indicators, reviews.

### **Milestone 4 — Commerce & User Flows**
- Authentication (`/login`, `/register`, `/password/change`).
- Cart slide-over drawer & page (`/cart`) with guest-to-user merge support.
- Checkout flow (`/checkout`) with address selection, atomic order creation.
- Profile & Addresses management (`/dashboard`, `/dashboard/addresses`).

### **Milestone 5 — Orders, Payments & Reviews**
- Orders list & detail (`/dashboard/orders`, `/dashboard/orders/[id]`).
- Status visualization machine (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED).
- Mock Payment Gateway integration (`/payments/pay/` with idempotency key).
- Product Reviews submission for verified delivered purchases.

### **Milestone 6 — Polish, SEO & Accessibility**
- OpenGraph metadata, JSON-LD product structured data, sitemap generation.
- Full WCAG 2.1 AA keyboard navigation, focus indicators, contrast audits.
- Core Web Vitals optimization (LCP, CLS, INP, bundle splitting).

### **Milestone 7 — End-to-End Verification**
- Full workflow testing: Register → Login → Browse → Add to Cart → Checkout → Mock Pay → View Order → Review.

---

## 6. Proposed File Changes for Milestone 1

### [Component: Dependencies & Config]
- [MODIFY] [package.json](file:///d:/Project/GitHub/Paradox-Shop/frontend/package.json): Add `@tanstack/react-query`, `zustand`, `axios`, `lucide-react`, `clsx`, `tailwind-merge`, `framer-motion`.
- [MODIFY] [tailwind.config.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/tailwind.config.ts): Configure semantic design tokens, fonts, and utilities.
- [MODIFY] [src/app/globals.css](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/globals.css): Implement full CSS custom property token system for light/dark modes.

### [Component: Types & API Layer]
- [NEW] [src/types/api.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/types/api.ts): Strong TypeScript interfaces for User, Profile, Address, Category, Product, Variant, Cart, Order, Payment, Review, APIError, and PaginatedResponse matching OpenAPI.
- [NEW] [src/lib/api/client.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/lib/api/client.ts): Axios instance with request/response interceptors, request-id, error normalization.
- [NEW] [src/lib/api/auth-interceptor.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/lib/api/auth-interceptor.ts): Concurrency-safe token refresh lock queue.
- [NEW] [src/lib/api/endpoints.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/lib/api/endpoints.ts): Typed API functions for all endpoints.

### [Component: State & Providers]
- [NEW] [src/stores/auth.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/stores/auth.ts): Zustand auth store managing access token, user profile, and login/logout lifecycle.
- [NEW] [src/stores/ui.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/stores/ui.ts): Zustand store for theme, cart drawer, mobile navigation.
- [NEW] [src/app/providers.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/providers.tsx): React Query Client Provider, Theme Provider.
- [MODIFY] [src/app/layout.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/layout.tsx): Root layout with font imports, providers, and semantic structure.

### [Component: UI Primitives & Locales]
- [NEW] [src/components/ui/Button.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/ui/Button.tsx): Accessible button with variants (primary, secondary, outline, ghost, danger), sizes, loading spinner.
- [NEW] [src/components/ui/Input.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/ui/Input.tsx): Accessible form input with label, helper, error, and prefix/suffix slots.
- [NEW] [src/components/ui/Badge.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/ui/Badge.tsx): Status badge with color mappings.
- [NEW] [src/components/ui/Skeleton.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/ui/Skeleton.tsx): Animated pulse skeleton loader for content placeholders.
- [NEW] [src/components/ui/Card.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/ui/Card.tsx): Precision-bordered card container.
- [NEW] [src/locales/en.json](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/locales/en.json): English i18n dictionary.

---

## 7. Verification Plan

### Automated Checks
- **TypeScript Check**: `npx tsc --noEmit` inside `frontend/` to ensure zero typing errors across DTOs and API clients.
- **Lint Check**: `npm run lint` to verify ESLint cleanliness.
- **Production Build**: `npm run build` to ensure Next.js bundle compiles cleanly with static page generation.

### Manual & Integration Verification
- Launch local Next.js dev server and verify page rendering, font loading, dark/light theme switching, and CSS token application.
- Verify Axios API client error normalization and request interceptor header attachment.
