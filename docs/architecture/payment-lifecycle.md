# Payment Lifecycle & Idempotency Architecture

## Overview

The `payments` module coordinates transaction processing between Paradox Shop, internal accounting ledgers, and external payment service providers (PSPs).

## Payment Flow

```
Client App                   Paradox Shop API                    PSP Gateway
    │                               │                                 │
    ├───── POST /api/v1/payments/pay/ ─────►                          │
    │      (order_id, idempotency_key)│                               │
    │                               ├───── Lock Order (select_for_update)
    │                               ├───── Verify Pending Status      │
    │                               ├───── Verify No Active Payment   │
    │                               ├───── Create Payment (pending)   │
    │                               ├───── Dispatch to PSP ──────────►│
    │                               │                                 │
    │                               │◄──── Gateway Response ──────────┤
    │                               ├───── Update Payment (succeeded) │
    │                               ├───── Update Order (processing)  │
    │                               ├───── Commit Transaction         │
    │                               ├───── Trigger Celery Task ──────►(Receipt Email)
    │◄──── 201 Created (Payment) ───┤                                 │
```

## Idempotency Mechanism

To prevent duplicate charges caused by client retries or network interruptions:

1. **Idempotency Key**: Clients can provide a unique `idempotency_key` (UUID v4 or client transaction identifier) in `POST /api/v1/payments/pay/`.
2. **Database Constraint**: `Payment.idempotency_key` is unique and indexed (`db_index=True`).
3. **Idempotency Resolution**:
   - If an existing payment with the same key is found, the server checks ownership and safely returns the existing `Payment` object without re-executing charges.
4. **Order Row Level Locking**: Orders are locked using PostgreSQL `SELECT FOR UPDATE` to block concurrent payment requests on the same order.
