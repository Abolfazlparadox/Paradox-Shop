# Paradox Shop Database Schema & Data Dictionary

## Overview

Paradox Shop uses **PostgreSQL 16** with UUID primary keys (v4), explicit indexes, and table-level `CheckConstraint` and `UniqueConstraint` integrity checks.

## Key Relationships

```
User (1) ──── (1) UserProfile
User (1) ──── (N) Address
User (1) ──── (1) Cart
Cart (1) ──── (N) CartItem ──── (1) Product / ProductVariant

Category (1) ──── (N) Category [Hierarchy: parent_id]
Category (1) ──── (N) CategoryAttribute
Category (1) ──── (N) Product
Brand (1) ──── (N) Product

Product (1) ──── (N) ProductVariant
Product (1) ──── (N) ProductImage
Product (1) ──── (N) ProductAttributeValue

User (1) ──── (N) Order
Order (1) ──── (N) OrderItem
Order (1) ──── (1) OrderAddress [OneToOne snapshot]
Order (1) ──── (N) Payment

Product (1) ──── (N) Review ──── (1) User [Unique Constraint: (product, user)]
```

## Model Constraints & Invariants

| Table / Model | Invariant / Constraint | Type | Enforcement |
|---|---|---|---|
| `users_user` | `email` unique case-insensitive | Unique Index | DB & App normalize_email |
| `users_user` | `phone_number` unique nullable | Unique Index | DB & Serializer |
| `users_address` | Composite index `(user_id, is_deleted)` | B-Tree Index | Performance optimization |
| `products_product` | `base_price >= 0` | CheckConstraint | DB level |
| `products_productvariant` | `price_override >= 0` | CheckConstraint | DB level |
| `products_productvariant` | `sku` unique | Unique Index | DB level |
| `cart_cartitem` | `quantity >= 1` | CheckConstraint | DB level |
| `cart_cartitem` | `unique(cart_id, product_id, variant_id)` | UniqueConstraint | DB level |
| `orders_order` | `subtotal, total, shipping_cost, discount >= 0` | CheckConstraint | DB level |
| `orders_orderitem` | `quantity >= 1`, `unit_price, total_price >= 0` | CheckConstraint | DB level |
| `payments_payment` | `amount >= 0` | CheckConstraint | DB level |
| `payments_payment` | `idempotency_key` unique nullable | Unique Index | DB & App level |
| `reviews_review` | `rating BETWEEN 1 AND 5` | CheckConstraint | DB level |
| `reviews_review` | `unique(product_id, user_id)` | UniqueConstraint | DB level |
