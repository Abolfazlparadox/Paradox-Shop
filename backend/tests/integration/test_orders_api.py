from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestOrdersAPI:
    def test_checkout_workflow_success(
        self, auth_client, create_user, create_product, create_variant, create_address
    ):
        user = create_user()
        client = auth_client(user)
        address = create_address(user=user)
        prod = create_product(base_price=Decimal("500000"))
        variant = create_variant(product=prod, stock=10)

        # Add item to cart
        cart_url = reverse("api_v1:cart:item-list")
        client.post(
            cart_url,
            {
                "product_id": str(prod.id),
                "variant_id": str(variant.id),
                "quantity": 2,
            },
            format="json",
        )

        # Execute checkout
        checkout_url = reverse("api_v1:orders:checkout")
        checkout_resp = client.post(
            checkout_url,
            {
                "address_id": str(address.id),
                "notes": "Please ring the doorbell",
            },
            format="json",
        )

        assert checkout_resp.status_code == status.HTTP_201_CREATED
        order_data = checkout_resp.json()
        assert order_data["status"] == "pending"
        assert order_data["subtotal"] == "1000000"
        assert len(order_data["items"]) == 1
        assert order_data["shipping_address"]["recipient_name"] == address.recipient_name

        # Verify variant stock was decremented
        variant.refresh_from_db()
        assert variant.stock == 8

        # Verify cart was cleared
        cart_get = client.get(reverse("api_v1:cart:detail"))
        assert cart_get.json()["items_count"] == 0

    def test_checkout_empty_cart_fails(self, auth_client, create_user, create_address):
        user = create_user()
        client = auth_client(user)
        address = create_address(user=user)

        checkout_url = reverse("api_v1:orders:checkout")
        response = client.post(checkout_url, {"address_id": str(address.id)}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cancel_order_restores_stock(
        self, auth_client, create_user, create_product, create_variant, create_address
    ):
        user = create_user()
        client = auth_client(user)
        address = create_address(user=user)
        prod = create_product(base_price=Decimal("100000"))
        variant = create_variant(product=prod, stock=5)

        # Add to cart and checkout
        client.post(
            reverse("api_v1:cart:item-list"),
            {
                "product_id": str(prod.id),
                "variant_id": str(variant.id),
                "quantity": 2,
            },
            format="json",
        )
        order_resp = client.post(
            reverse("api_v1:orders:checkout"), {"address_id": str(address.id)}, format="json"
        )
        order_id = order_resp.json()["id"]

        variant.refresh_from_db()
        assert variant.stock == 3

        # Cancel order
        cancel_url = reverse("api_v1:orders:cancel", kwargs={"pk": order_id})
        cancel_resp = client.post(cancel_url)
        assert cancel_resp.status_code == status.HTTP_200_OK
        assert cancel_resp.json()["status"] == "cancelled"

        # Verify stock was restored
        variant.refresh_from_db()
        assert variant.stock == 5

    def test_order_detail_and_list(
        self, auth_client, create_user, create_product, create_variant, create_address
    ):
        user = create_user()
        client = auth_client(user)
        address = create_address(user=user)
        prod = create_product()
        variant = create_variant(product=prod, stock=5)

        client.post(
            reverse("api_v1:cart:item-list"),
            {
                "product_id": str(prod.id),
                "variant_id": str(variant.id),
                "quantity": 1,
            },
            format="json",
        )
        order_resp = client.post(
            reverse("api_v1:orders:checkout"), {"address_id": str(address.id)}, format="json"
        )
        order_id = order_resp.json()["id"]

        # List orders
        list_resp = client.get(reverse("api_v1:orders:list"))
        assert list_resp.status_code == status.HTTP_200_OK
        assert list_resp.json()["count"] == 1

        # Detail order
        detail_resp = client.get(reverse("api_v1:orders:detail", kwargs={"pk": order_id}))
        assert detail_resp.status_code == status.HTTP_200_OK
        assert detail_resp.json()["id"] == order_id
