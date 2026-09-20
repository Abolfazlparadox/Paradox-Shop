# ADR-001: Customer Wishlist & Saved Products Architecture

## Status
Accepted

## Context
Customers browsing the Paradox Shop catalog require the ability to curate, save, and manage products for future consideration and purchasing without cluttering their active shopping cart. The system needs to support both guest shoppers (anonymous sessions) and authenticated users, ensuring seamless cross-device synchronization and automatic wishlist merging upon account login or registration.

## Decision Drivers
- Server-authoritative data integrity and business rules.
- Fast, non-blocking UI interactions with optimistic feedback and micro-animations.
- Cross-user data isolation and strict access control (IDOR prevention).
- Clean separation between Read (`selectors.py`) and Write (`services.py`) domain operations.
- Graceful guest experience stored in local storage and merged seamlessly on authentication.

## Considered Options
1. **Direct Many-to-Many field on User model**: Simple, but limits storing item-specific metadata (such as selected variants, time added, price snapshots, or back-in-stock alerts).
2. **Dedicated Wishlist Domain Modular Monolith App (`apps.wishlist`)**:
   - `Wishlist` entity (One-to-One with User)
   - `WishlistItem` entity (ForeignKey to Wishlist and Product, optional ProductVariant, UniqueConstraint)
   - Laye-based architecture: `models`, `selectors`, `services`, `serializers`, `views`, `urls`.
   - Dual-mode frontend (Zustand localStorage for guest, TanStack Query for authenticated).

## Decision
We adopted **Option 2: Dedicated Wishlist Domain (`apps.wishlist`)**.

### Backend Architecture
- **Models**:
  - `Wishlist`: UUID primary key, timestamp mixins, OneToOne with User model.
  - `WishlistItem`: ForeignKey to Wishlist, Product, and optional ProductVariant, with database-level `UniqueConstraint(fields=['wishlist', 'product', 'variant'])`.
- **Selectors**:
  - `get_user_wishlist(user)`: Prefetches product images, brand, category, and variant.
  - `is_in_wishlist(user, product_id, variant_id)`: Efficient `.exists()` query.
- **Services**:
  - `add_to_wishlist`: Atomic transaction verifying product active state, adding item, logging `commerce.wishlist.item_added`.
  - `remove_from_wishlist` & `remove_by_product`: Atomic transaction with ownership check.
  - `merge_guest_wishlist`: Bulk merge of guest product UUIDs without creating duplicates.
  - `clear_wishlist`: Empties the user's wishlist.
- **APIs**:
  - `GET /api/v1/wishlist/`
  - `DELETE /api/v1/wishlist/`
  - `POST /api/v1/wishlist/items/`
  - `DELETE /api/v1/wishlist/items/{id}/`
  - `POST /api/v1/wishlist/items/remove-by-product/`
  - `POST /api/v1/wishlist/merge/`
  - `GET /api/v1/wishlist/check/`

### Frontend Architecture
- `wishlistApi` in `lib/api/endpoints.ts`.
- `useWishlist` TanStack Query hook managing server cache, optimistic toggles, and auto-merging.
- `useGuestWishlistStore` Zustand store with SSR-safe localStorage persistence for anonymous visitors.
- Micro-animated `WishlistButton` integrated on `ProductCard`, `ProductDetailView`, and navigation bars with live badge counter.
- `WishlistItemCard` with direct "Move to Cart" workflow.
- Dedicated routes `/wishlist` and `/dashboard/wishlist`.

## Consequences
### Positive
- Strict database constraints prevent duplicate wishlist items.
- Zero data loss when a guest adds products and later signs in.
- Smooth, luxurious micro-interactions matching the Paradox Shop design language.
- Full OpenAPI 3.0.3 compliance and 100% test coverage.

### Negative / Trade-offs
- Requires maintaining client-side guest wishlist logic until authentication occurs.
