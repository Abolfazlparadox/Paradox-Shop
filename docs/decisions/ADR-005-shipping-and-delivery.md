# ADR-002: Shipping & Delivery Architecture

## Status
Accepted

## Context
Paradox Shop previously had a flat `shipping_cost = 0` placeholder during checkout. To support production commerce operations in Iran, the platform required a dedicated Shipping & Delivery domain capable of:
1. Handling distinct shipping methods (Express Courier VIP, Standard Post, Freight/Heavy Cargo).
2. Zone-based pricing adjustments (geographic rates for provinces and cities).
3. Configurable Free Shipping subtotal thresholds.
4. Server-authoritative checkout calculation to prevent client-side price tampering.
5. Post-checkout Shipment entity tracking carriers, barcodes/tracking codes (`PDX-XXXXXX`), and status lifecycle (`pending` -> `label_created` -> `in_transit` -> `out_for_delivery` -> `delivered`).

## Decision

### 1. Backend Domain App (`apps.shipping`)
- We isolated all shipping models, selectors, services, serializers, and views into a standalone Django app `apps/shipping/`.
- **Entity Models**:
  - `ShippingMethod`: Base methods with default rates, delivery day ranges, and free shipping thresholds.
  - `ShippingZone`: Geographic regions defined by province/city lists.
  - `ShippingZoneRate`: Surcharges or rate overrides linked to specific zones and methods.
  - `Shipment`: One-to-one relationship with `orders.Order`, storing carrier details, unique indexed `tracking_code`, and lifecycle state machine.
- **Service Layer**:
  - `calculate_shipping_for_order(...)`: Authoritative calculation invoked during cart checkout.
  - `create_shipment_for_order(...)`: Atomic creation of the shipment record during checkout.
  - `update_shipment_status(...)`: Status transitions that automatically sync order status when shipments transition to `in_transit` or `delivered`.

### 2. Frontend Architectural Integration
- **Feature Encapsulation**: Created `features/shipping` with React Query hooks (`useShippingQuotes`, `useOrderShipment`, `useTrackShipment`).
- **Interactive Delivery Selector**: `ShippingMethodSelector` with animated radio card selection, delivery time badges, and free shipping indicators.
- **Shipment Tracking Visualization**: `ShipmentTrackingCard` with a 5-stage progress stepper, tracking code copying, and carrier metadata.
- **Dedicated Public Route**: `/track` page allowing instant tracking by barcode without requiring login.

## Consequences

### Positive
- Fully decoupled shipping domain adhering to the monorepo's Modular Monolith principles.
- Server is 100% authoritative for all shipping costs; zero reliance on client inputs.
- Real-time customer visibility over order dispatch with tracking codes.
- Complete test coverage (8 new backend tests, 4 new frontend tests, 100% passing across all suites).

### Negative / Trade-offs
- Orders now require database lookup for active shipping methods, introducing minor query overhead mitigated by database indexes and `select_related`.
