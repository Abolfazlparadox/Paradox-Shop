import logging
import secrets
import string
import uuid
from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.orders.models import Order
from .models import Shipment, ShippingMethod
from .selectors import calculate_method_quote

logger = logging.getLogger("commerce.shipping")


def generate_tracking_code() -> str:
    """Generate a unique human-readable delivery tracking code."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(8))
    return f"PDX-{suffix}"


def get_or_create_default_shipping_methods():
    """Ensure baseline shipping methods exist in database for real commerce flow."""
    express, _ = ShippingMethod.objects.get_or_create(
        code="express",
        defaults={
            "name": "VIP Express Courier",
            "description": "Priority direct dispatch with shock-resistant luxury protective casing",
            "base_rate": Decimal("1500000"),
            "free_shipping_threshold": Decimal("100000000"),
            "estimated_days_min": 1,
            "estimated_days_max": 1,
            "sort_order": 1,
        },
    )
    standard, _ = ShippingMethod.objects.get_or_create(
        code="standard",
        defaults={
            "name": "Insured Standard Post",
            "description": "Secure nationwide postal delivery with full insurance coverage and online tracking",
            "base_rate": Decimal("750000"),
            "free_shipping_threshold": Decimal("50000000"),
            "estimated_days_min": 2,
            "estimated_days_max": 4,
            "sort_order": 2,
        },
    )
    freight, _ = ShippingMethod.objects.get_or_create(
        code="freight",
        defaults={
            "name": "Specialized White-Glove Freight",
            "description": "Dedicated climate-controlled vehicle and handling specialist for heavy/delicate artifacts",
            "base_rate": Decimal("2500000"),
            "free_shipping_threshold": None,
            "estimated_days_min": 2,
            "estimated_days_max": 5,
            "sort_order": 3,
        },
    )
    return [express, standard, freight]


def calculate_shipping_for_order(
    shipping_method_id: Optional[uuid.UUID],
    province: Optional[str],
    city: Optional[str],
    subtotal: Decimal,
) -> tuple[ShippingMethod, Decimal]:
    """
    Authoritative server calculation of shipping method and fee.
    If no method specified, picks the default active method (lowest sort_order).
    """
    method = None
    if shipping_method_id:
        try:
            method = ShippingMethod.objects.get(id=shipping_method_id, is_active=True)
        except ShippingMethod.DoesNotExist:
            raise ValidationError({"shipping_method_id": "Specified shipping method is invalid or inactive."})
    else:
        method = ShippingMethod.objects.filter(is_active=True).order_by("sort_order").first()
        if not method:
            # Create standard default methods if db is empty
            methods = get_or_create_default_shipping_methods()
            method = methods[0]

    quote = calculate_method_quote(method, province, city, subtotal)
    shipping_fee = quote["shipping_fee"]

    logger.info(
        "commerce.shipping.quote_calculated",
        extra={
            "method_id": str(method.id),
            "method_code": method.code,
            "province": province,
            "city": city,
            "subtotal": str(subtotal),
            "shipping_fee": str(shipping_fee),
            "is_free": quote["is_free"],
        },
    )

    return method, shipping_fee


@transaction.atomic
def create_shipment_for_order(
    order: Order,
    shipping_method: Optional[ShippingMethod] = None,
    shipping_fee: Decimal = Decimal("0"),
    carrier_name: str = "Paradox Express Fleet",
) -> Shipment:
    """
    Create a linked Shipment record when an Order is finalized.
    """
    # If shipment already exists for this order, return it
    if hasattr(order, "shipment") and order.shipment:
        return order.shipment

    tracking_code = generate_tracking_code()
    # Ensure tracking code uniqueness
    while Shipment.objects.filter(tracking_code=tracking_code).exists():
        tracking_code = generate_tracking_code()

    shipment = Shipment.objects.create(
        order=order,
        shipping_method=shipping_method,
        shipping_fee=shipping_fee,
        tracking_code=tracking_code,
        carrier_name=carrier_name,
        status=Shipment.ShipmentStatus.PENDING,
    )

    logger.info(
        "commerce.shipping.shipment_created",
        extra={
            "shipment_id": str(shipment.id),
            "order_id": str(order.id),
            "order_number": order.order_number,
            "tracking_code": tracking_code,
            "shipping_fee": str(shipping_fee),
        },
    )

    return shipment


@transaction.atomic
def update_shipment_status(
    shipment: Shipment,
    new_status: str,
    carrier_name: Optional[str] = None,
    notes: Optional[str] = None,
) -> Shipment:
    """
    Transition shipment status, updating timestamps and synchronizing with Order status.
    """
    if not shipment.can_transition_to(new_status):
        raise ValidationError(
            {"status": f"Invalid shipment transition from '{shipment.status}' to '{new_status}'."}
        )

    old_status = shipment.status
    shipment.status = new_status
    if carrier_name:
        shipment.carrier_name = carrier_name
    if notes:
        shipment.notes = notes

    now = timezone.now()
    if new_status in (Shipment.ShipmentStatus.IN_TRANSIT, Shipment.ShipmentStatus.LABEL_CREATED) and not shipment.shipped_at:
        shipment.shipped_at = now
        # Also advance Order status to shipped if eligible
        if shipment.order.can_transition_to(Order.OrderStatus.SHIPPED):
            shipment.order.status = Order.OrderStatus.SHIPPED
            shipment.order.save(update_fields=["status", "updated_at"])

    if new_status == Shipment.ShipmentStatus.DELIVERED:
        shipment.delivered_at = now
        # Also advance Order status to delivered if eligible
        if shipment.order.can_transition_to(Order.OrderStatus.DELIVERED):
            shipment.order.status = Order.OrderStatus.DELIVERED
            shipment.order.save(update_fields=["status", "updated_at"])

    shipment.save()

    logger.info(
        "commerce.shipping.status_updated",
        extra={
            "shipment_id": str(shipment.id),
            "order_id": str(shipment.order.id),
            "old_status": old_status,
            "new_status": new_status,
            "tracking_code": shipment.tracking_code,
        },
    )

    return shipment
