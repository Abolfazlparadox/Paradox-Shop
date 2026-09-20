# Order Lifecycle & State Machine

## Overview

The `Order` model in Paradox Shop implements an explicit, unidirectional finite state machine (FSM) ensuring inventory consistency, payment reconciliation, and auditability.

## State Transition Diagram

```
                 [ Checkout Created ]
                          │
                          ▼
                    ┌───────────┐
                    │  PENDING  ├────────────────┐
                    └─────┬─────┘                │
                          │ Payment              │ Cancel Order
                          ▼ Success              ▼
                    ┌───────────┐          ┌───────────┐
                    │PROCESSING ├─────────►│ CANCELLED │
                    └─────┬─────┘  Cancel  └───────────┘
                          │ Shipping       (Terminal & Stock Restored)
                          ▼ Dispatch
                    ┌───────────┐
                    │  SHIPPED  │
                    └─────┬─────┘
                          │ Delivery
                          ▼ Confirmed
                    ┌───────────┐
                    │ DELIVERED │
                    └─────┬─────┘
                          │ Admin
                          ▼ Refund
                    ┌───────────┐
                    │ REFUNDED  │
                    └───────────┘
                      (Terminal)
```

## State Definitions

| State | Code | Description | Inventory Status | Allowed Next States |
|---|---|---|---|---|
| **Pending Payment** | `pending` | Order created from cart; awaiting payment authorization | Reserved (stock decremented) | `processing`, `cancelled` |
| **Processing** | `processing` | Payment confirmed; order is being packed/prepared | Reserved / Committed | `shipped`, `cancelled` |
| **Shipped** | `shipped` | Handed over to logistics carrier | Shipped | `delivered` |
| **Delivered** | `delivered` | Customer confirmed delivery or carrier confirmed | Delivered (Final) | `refunded` |
| **Cancelled** | `cancelled` | Order cancelled by user or system before shipment | Restored to inventory | *(None - Terminal)* |
| **Refunded** | `refunded` | Post-delivery refund processed | Returned / Written off | *(None - Terminal)* |

## Concurrency & Inventory Rules

1. **Pessimistic Locking**: During `create_order_from_cart`, the user's `Cart` and all relevant `ProductVariant` rows are locked with `select_for_update()`.
2. **Post-Lock Verification**: Stock is verified *after* row locks are obtained to guarantee zero overselling.
3. **Atomic Stock Decrement**: Inventory is decremented and snapshots (`OrderItem`, `OrderAddress`) are saved within the same database transaction (`@transaction.atomic`).
4. **Stock Restoration**: When an order transitions to `cancelled` via `OrderService.cancel_order()`, all line items with variant associations have their stock restored atomically.
