# ADR-004: Customer Reviews, Media Attachments, Moderation Workflow & Product Q&A Subsystem

## Status
Accepted / Implemented (Phase 4)

## Context
A premier e-commerce luxury storefront requires authentic, high-trust social proof and direct technical engagement without compromising content security, brand prestige, or platform integrity.

Key requirements addressed:
1. **Verified Purchase Authority**: Only clients with delivered orders (`Order.OrderStatus.DELIVERED`) can submit ratings and reviews with verified badges.
2. **Media Attachments**: High-resolution client photo attachments with automated Pillow and Celery asynchronous background processing (EXIF stripping, aspect ratio normalization, WebP thumbnail generation).
3. **Editorial Moderation State Machine**: Reviews transition through `PENDING -> APPROVED / REJECTED / HIDDEN`. Editing an already approved review automatically reverts its state to `PENDING` for re-moderation, preventing unauthorized post-approval content alteration.
4. **Community Feedback & Moderation**: Single review per user-product constraint, helpful/unhelpful toggling (`ReviewVote`), abuse reporting queue (`ReviewReport`), and official Paradox staff responses (`ReviewResponse`).
5. **Separate Q&A Inquiries**: Clean domain separation between customer evaluation reviews and technical pre-purchase inquiries (`ProductQuestion` and `QuestionAnswer`).
6. **High-Performance Aggregations**: Redis caching of rating distribution histograms (1–5 stars, percentage breakdowns, verified buyer counts) with event-driven invalidation.

## Decision
1. **Domain Isolation**:
   - Implemented separate relational models under `backend/apps/reviews/`: `Review`, `ReviewImage`, `ReviewVote`, `ReviewReport`, `ReviewResponse`, `ProductQuestion`, `QuestionAnswer`, `QuestionReport`.
   - Separate notification entities (`UserNotification` in `backend/common/models.py`) ensure asynchronous user feedback upon review approval, decline, or staff answer.
2. **Server-Side Authority**:
   - Frontend components never dictate verification badges or staff privileges.
   - `ReviewSelector.user_has_purchased_product` performs authoritative checks on delivered `OrderItem` records.
   - `ReviewService.update_review` enforces re-moderation state machine resets.
3. **Optimized Asynchronous Tasks**:
   - `tasks.process_review_image_task` handles image normalization and WebP thumbnail creation in Celery, maintaining fast API response times during review submission.
4. **Unified Control Center**:
   - Next.js Admin page (`/admin/reviews` and `/admin/questions`) provides full queue management, staff response composers, abuse report handling, and inline moderation.

## Consequences
### Positive
- Strict prevention of fake, abusive, or modified post-approval content.
- Sub-millisecond response times for rating breakdown summaries via Redis.
- Clean architectural boundaries between transactional orders, reviews, and pre-purchase inquiries.
- Comprehensive audit trails and client notifications.

### Mitigations
- Periodic Celery cleanup for orphan or invalid image uploads.
- Database unique constraints prevent duplicate reviews, duplicate votes, and duplicate reports.
