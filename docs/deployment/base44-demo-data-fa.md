# Base44 Demo Data — Seed Summary

> Seeded via `python manage.py seed_base44_demo` (idempotent, non-destructive).
> Run `python manage.py seed_base44_demo --clean` to remove all demo data.

## Seeded Data Table

| Domain | Seeded | Count | Verification |
|--------|--------|-------|--------------|
| Users | ✅ | 3 | Admin + 2 customers, login verified via API |
| Addresses | ✅ | 2 | Home + Office for demo customer |
| Categories | ✅ | 7 | 5 root + 2 child (Wristwatches→Timepieces, Floor-standing→Audio) |
| Brands | ✅ | 3 | PARADOX, MONOLITH, AETHER |
| Products | ✅ | 13 | 12 active + 1 inactive (Discontinued Artifact) |
| Variants | ✅ | 14 | Multiple variants per product (e.g. Graphite/Silver dial) |
| Product Images | ✅ | 13 | Placeholder JPEGs, served via media proxy |
| Promotions | ✅ | 6 | 4 active + 1 inactive + 1 expired |
| Coupons | ✅ | 6 | PARADOX10, SAVE5M, WELCOME15, LUXE20, EXPIRED2025, VIPONLY |
| Shipping Methods | ✅ | 3 | Standard, Express, White Glove |
| Shipping Zones | ✅ | 2 | Tehran Metro + National |
| Shipping Zone Rates | ✅ | 5 | Zone-specific rate adjustments |
| Orders | ✅ | 7 | Delivered(3), Shipped(1), Processing(1), Cancelled(1), Pending(1) |
| Order Items | ✅ | 9 | Line items across all orders |
| Order Addresses | ✅ | 7 | Shipping address per order |
| Payments | ✅ | 6 | Succeeded(4) + Pending(2), mock gateway |
| Shipments | ✅ | 4 | Delivered(2) + In Transit(1) + Pending(1) |
| Reviews | ✅ | 8 | All APPROVED, verified purchases, ratings 4-5 |
| Questions | ✅ | 5 | 3 APPROVED with answers + 2 PENDING (unanswered) |
| Answers | ✅ | 3 | Staff answers from admin@paradox.shop |
| Wishlist | ✅ | 3 | 3 items in demo customer's wishlist |
| Cart | ✅ | 2 | 2 items with promotion discounts applied |

## Promotion Details

| Name | Type | Value | Target | Active |
|------|------|-------|--------|--------|
| Chronograph Feature — 20% Off | Percentage | 20% | Product: monolith-chronograph | ✅ |
| Monolith Launch — 15% Off | Percentage | 15% | Brand: PARADOX | ✅ |
| Lighting Collection — 10% Capped at 3M | Percentage | 10% (max 3M) | Category: lighting | ✅ |
| Aether Audio — 2,000,000 Rial Off | Fixed | 2,000,000 | Brand: AETHER | ✅ |
| Inactive Summer Promo | Percentage | 25% | All | ❌ Inactive |
| Expired New Year — 30% Off | Percentage | 30% | All | ❌ Expired |

## Coupon Details

| Code | Type | Value | Min Order | Limit | Active | Audience |
|------|------|-------|-----------|-------|--------|----------|
| PARADOX10 | Percentage | 10% | — | 1/user | ✅ | All |
| SAVE5M | Fixed | 5,000,000 | 30,000,000 | 3/user, 100 total | ✅ | All |
| WELCOME15 | Percentage | 15% (max 10M) | — | 1/user, 50 total | ✅ | All |
| LUXE20 | Percentage | 20% | — | 1/user, 5 total | ✅ | All |
| EXPIRED2025 | Percentage | 50% | — | 1/user | ❌ Expired | All |
| VIPONLY | Fixed | 10,000,000 | — | 3/user, 10 total | ✅ | customer@paradox.shop only |

## Order Details

| Order # | Customer | Status | Items | Total | Payment | Shipment |
|---------|----------|--------|-------|-------|---------|----------|
| PDX-100001 | customer | Delivered | Chronograph + Wallet | 49.5M | Succeeded | Delivered |
| PDX-100002 | customer | Shipped | Aether Monitor | 68.2M | Succeeded | In Transit |
| PDX-100003 | customer2 | Processing | Headphones + Binoculars | 46.5M | Succeeded | — |
| PDX-100004 | customer2 | Delivered | Lumen Lamp x2 | 44M | Succeeded | Delivered |
| PDX-100005 | customer | Cancelled | Horizon Telescope | 57.2M | — | — |
| PDX-100006 | customer2 | Pending | Prism Turntable | 42.5M | Pending | — |
| PDX-100007 | customer | Delivered | Penrose Tourbillon | 95M | Succeeded | Delivered |

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin/Staff | `admin@paradox.shop` | `paradox-admin-2024` |
| Customer | `customer@paradox.shop` | `paradox-customer-2024` |
| Customer 2 | `customer2@paradox.shop` | `paradox-customer2-2024` |

## Demo Coupon

**`PARADOX10`** — 10% off any order, no minimum. Primary demo coupon for testing.
