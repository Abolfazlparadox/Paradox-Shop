from decimal import Decimal
from typing import List, Optional
import uuid

from django.db.models import QuerySet

from .models import Shipment, ShippingMethod, ShippingZone, ShippingZoneRate


def get_active_shipping_methods() -> QuerySet[ShippingMethod]:
    """Retrieve all enabled shipping methods ordered by preference."""
    return ShippingMethod.objects.filter(is_active=True).order_by("sort_order", "base_rate")


def get_matching_zone(province: Optional[str], city: Optional[str] = None) -> Optional[ShippingZone]:
    """Find the best matching active shipping zone for a given province/city."""
    if not province:
        return None

    zones = ShippingZone.objects.filter(is_active=True)
    for zone in zones:
        if zone.matches(province, city or ""):
            return zone
    return None


def calculate_method_quote(
    method: ShippingMethod,
    province: Optional[str] = None,
    city: Optional[str] = None,
    subtotal: Decimal = Decimal("0"),
) -> dict:
    """Calculate the final shipping fee and metadata for a specific shipping method."""
    base_rate = method.base_rate
    effective_rate = base_rate

    # Check for zone-specific rate overrides and surcharges
    if province:
        zone = get_matching_zone(province, city)
        if zone:
            zone_rate = ShippingZoneRate.objects.filter(zone=zone, method=method, is_active=True).first()
            if zone_rate:
                if zone_rate.rate_override is not None:
                    effective_rate = zone_rate.rate_override
                effective_rate += zone_rate.additional_fee

    # Check if subtotal qualifies for Free Shipping
    is_free = False
    if method.free_shipping_threshold is not None and subtotal >= method.free_shipping_threshold:
        effective_rate = Decimal("0")
        is_free = True

    return {
        "method_id": str(method.id),
        "code": method.code,
        "name": method.name,
        "description": method.description,
        "base_rate": base_rate,
        "shipping_fee": effective_rate,
        "is_free": is_free,
        "free_shipping_threshold": method.free_shipping_threshold,
        "estimated_days_min": method.estimated_days_min,
        "estimated_days_max": method.estimated_days_max,
        "estimated_delivery_text": method.estimated_delivery_text,
    }


def get_available_shipping_quotes(
    province: Optional[str] = None,
    city: Optional[str] = None,
    subtotal: Decimal = Decimal("0"),
) -> List[dict]:
    """Retrieve all available shipping methods with computed quotes for given destination & cart value."""
    methods = get_active_shipping_methods()
    quotes = []
    for method in methods:
        quote = calculate_method_quote(method, province, city, subtotal)
        quotes.append(quote)
    return quotes


def get_shipment_by_order(order_id: uuid.UUID) -> Optional[Shipment]:
    """Retrieve shipment details for an order."""
    return (
        Shipment.objects.filter(order_id=order_id)
        .select_related("shipping_method", "order", "order__shipping_address")
        .first()
    )


def get_shipment_by_tracking_code(tracking_code: str) -> Optional[Shipment]:
    """Retrieve shipment details by unique tracking code."""
    if not tracking_code:
        return None
    return (
        Shipment.objects.filter(tracking_code__iexact=tracking_code.strip())
        .select_related("shipping_method", "order", "order__shipping_address")
        .first()
    )
