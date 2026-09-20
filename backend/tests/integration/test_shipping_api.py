from decimal import Decimal
import uuid

import pytest
from django.urls import reverse
from rest_framework import status

from apps.orders.models import Order
from apps.shipping.models import Shipment, ShippingMethod, ShippingZone, ShippingZoneRate
from apps.shipping.services import (
    create_shipment_for_order,
    get_or_create_default_shipping_methods,
    update_shipment_status,
)


@pytest.mark.django_db
class TestShippingAPI:
    @pytest.fixture(autouse=True)
    def setup_shipping(self):
        self.methods = get_or_create_default_shipping_methods()
        self.express = self.methods[0]  # Express
        self.standard = self.methods[1]  # Standard

    def test_list_shipping_methods_public(self, api_client):
        url = reverse("api_v1:shipping:methods-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 2
        method_codes = [m["code"] for m in data]
        assert "express" in method_codes
        assert "standard" in method_codes

    def test_calculate_shipping_with_zone_rate(self, api_client):
        # Create special Tehran zone with surcharge
        zone = ShippingZone.objects.create(
            name="Tehran & Suburbs",
            provinces=["تهران", "البرز"],
            cities=["تهران", "کرج"],
            is_active=True,
        )
        ShippingZoneRate.objects.create(
            zone=zone,
            method=self.express,
            rate_override=Decimal("1200000"),
            additional_fee=Decimal("100000"),
            is_active=True,
        )

        calc_url = reverse("api_v1:shipping:calculate")
        payload = {
            "method_id": str(self.express.id),
            "province": "تهران",
            "city": "تهران",
            "subtotal": "5000000",
        }
        response = api_client.post(calc_url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Override (1,200,000) + additional (100,000) = 1,300,000
        assert Decimal(data["shipping_fee"]) == Decimal("1300000")
        assert data["is_free"] is False

    def test_free_shipping_threshold_applied(self, api_client):
        calc_url = reverse("api_v1:shipping:calculate")
        # Subtotal > free_shipping_threshold (50,000,000 for standard)
        payload = {
            "method_id": str(self.standard.id),
            "province": "اصفهان",
            "city": "اصفهان",
            "subtotal": "60000000",
        }
        response = api_client.post(calc_url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert Decimal(data["shipping_fee"]) == Decimal("0")
        assert data["is_free"] is True

    def test_checkout_integrates_shipping_fee_and_creates_shipment(
        self, auth_client, create_user, create_product, create_variant, create_address
    ):
        user = create_user(email="checkout_ship_user@example.com")
        client = auth_client(user)
        address = create_address(user=user, province="تهران", city="تهران")

        product = create_product(name="Flagship Artifact", base_price=Decimal("10000000"))
        variant = create_variant(product=product, stock=5)

        # Add to cart
        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(product.id), "variant_id": str(variant.id), "quantity": 1},
            format="json",
        )

        # Checkout with Express Shipping
        checkout_url = reverse("api_v1:orders:checkout")
        checkout_payload = {
            "address_id": str(address.id),
            "shipping_method_id": str(self.express.id),
            "notes": "Please deliver before 4 PM.",
        }
        response = client.post(checkout_url, checkout_payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        # Order totals validation
        expected_shipping = self.express.base_rate
        expected_subtotal = Decimal("10000000")
        expected_total = expected_subtotal + expected_shipping

        assert Decimal(data["subtotal"]) == expected_subtotal
        assert Decimal(data["shipping_cost"]) == expected_shipping
        assert Decimal(data["total"]) == expected_total

        # Verify linked Shipment in DB
        order = Order.objects.get(id=data["id"])
        assert hasattr(order, "shipment")
        assert order.shipment.shipping_method == self.express
        assert order.shipment.shipping_fee == expected_shipping
        assert order.shipment.tracking_code.startswith("PDX-")
        assert order.shipment.status == Shipment.ShipmentStatus.PENDING

    def test_order_shipment_detail_authenticated_owner(
        self, auth_client, create_user, create_product, create_address
    ):
        user = create_user(email="shipment_owner@example.com")
        client = auth_client(user)
        address = create_address(user=user)
        product = create_product(base_price=Decimal("2000000"))

        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(product.id), "quantity": 1},
            format="json",
        )
        checkout_resp = client.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address.id), "shipping_method_id": str(self.standard.id)},
            format="json",
        )
        order_id = checkout_resp.json()["id"]

        shipment_url = reverse("api_v1:shipping:order-shipment", kwargs={"order_id": order_id})
        response = client.get(shipment_url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tracking_code"].startswith("PDX-")
        assert data["shipping_method"]["code"] == "standard"

    def test_order_shipment_detail_cross_user_forbidden(
        self, auth_client, create_user, create_product, create_address
    ):
        user_a = create_user(email="owner_a@example.com")
        user_b = create_user(email="intruder_b@example.com")
        client_a = auth_client(user_a)
        client_b = auth_client(user_b)
        address_a = create_address(user=user_a)
        product = create_product()

        client_a.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(product.id), "quantity": 1},
            format="json",
        )
        checkout_resp = client_a.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address_a.id)},
            format="json",
        )
        order_id_a = checkout_resp.json()["id"]

        # User B attempts to access User A's shipment details -> 403 Forbidden
        shipment_url = reverse("api_v1:shipping:order-shipment", kwargs={"order_id": order_id_a})
        response = client_b.get(shipment_url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_public_tracking_endpoint(self, api_client, create_user):
        user = create_user(email="track_user@example.com")
        order = Order.objects.create(
            user=user,
            order_number="ORD-TRACK-001",
            subtotal=Decimal("5000000"),
            total=Decimal("5000000"),
        )
        shipment = create_shipment_for_order(
            order=order,
            shipping_method=self.express,
            carrier_name="Paradox Express Fleet",
            shipping_fee=Decimal("1500000"),
        )

        track_url = reverse("api_v1:shipping:public-track", kwargs={"tracking_code": shipment.tracking_code})
        response = api_client.get(track_url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tracking_code"] == shipment.tracking_code
        assert data["carrier_name"] == "Paradox Express Fleet"
        assert data["status"] == "pending"

    def test_shipment_status_transition_and_order_sync(self, create_user):
        user = create_user(email="state_user@example.com")
        order = Order.objects.create(
            user=user,
            order_number="ORD-TRACK-002",
            status=Order.OrderStatus.PROCESSING,
            subtotal=Decimal("3000000"),
            total=Decimal("3000000"),
        )
        shipment = create_shipment_for_order(order=order, shipping_method=self.standard)

        assert shipment.status == Shipment.ShipmentStatus.PENDING

        # Transition to IN_TRANSIT
        update_shipment_status(shipment, Shipment.ShipmentStatus.IN_TRANSIT)
        shipment.refresh_from_db()
        order.refresh_from_db()

        assert shipment.status == Shipment.ShipmentStatus.IN_TRANSIT
        assert shipment.shipped_at is not None
        assert order.status == Order.OrderStatus.SHIPPED

        # Transition to DELIVERED
        update_shipment_status(shipment, Shipment.ShipmentStatus.DELIVERED)
        shipment.refresh_from_db()
        order.refresh_from_db()

        assert shipment.status == Shipment.ShipmentStatus.DELIVERED
        assert shipment.delivered_at is not None
        assert order.status == Order.OrderStatus.DELIVERED
