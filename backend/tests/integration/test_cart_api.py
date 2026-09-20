from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestCartAPI:
    def test_get_empty_cart(self, auth_client, create_user):
        user = create_user()
        client = auth_client(user)

        url = reverse("api_v1:cart:detail")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items_count"] == 0
        assert data["subtotal"] == "0"

    def test_add_item_to_cart(self, auth_client, create_user, create_product, create_variant):
        user = create_user()
        client = auth_client(user)
        prod = create_product(base_price=Decimal("250000"))
        variant = create_variant(product=prod, stock=5)

        url = reverse("api_v1:cart:item-list")
        payload = {
            "product_id": str(prod.id),
            "variant_id": str(variant.id),
            "quantity": 2,
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["items_count"] == 2
        assert len(data["items"]) == 1

    def test_add_item_insufficient_stock(
        self, auth_client, create_user, create_product, create_variant
    ):
        user = create_user()
        client = auth_client(user)
        prod = create_product()
        variant = create_variant(product=prod, stock=1)

        url = reverse("api_v1:cart:item-list")
        payload = {
            "product_id": str(prod.id),
            "variant_id": str(variant.id),
            "quantity": 5,
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_cart_item_quantity(
        self, auth_client, create_user, create_product, create_variant
    ):
        user = create_user()
        client = auth_client(user)
        prod = create_product()
        variant = create_variant(product=prod, stock=10)

        # Add item
        add_url = reverse("api_v1:cart:item-list")
        add_resp = client.post(
            add_url,
            {
                "product_id": str(prod.id),
                "variant_id": str(variant.id),
                "quantity": 1,
            },
            format="json",
        )
        item_id = add_resp.json()["items"][0]["id"]

        # Update quantity
        item_url = reverse("api_v1:cart:item-detail", kwargs={"item_id": item_id})
        update_resp = client.patch(item_url, {"quantity": 3}, format="json")
        assert update_resp.status_code == status.HTTP_200_OK
        assert update_resp.json()["items_count"] == 3

    def test_remove_cart_item(self, auth_client, create_user, create_product, create_variant):
        user = create_user()
        client = auth_client(user)
        prod = create_product()
        variant = create_variant(product=prod, stock=5)

        # Add item
        add_url = reverse("api_v1:cart:item-list")
        add_resp = client.post(
            add_url,
            {
                "product_id": str(prod.id),
                "variant_id": str(variant.id),
                "quantity": 1,
            },
            format="json",
        )
        item_id = add_resp.json()["items"][0]["id"]

        # Remove item
        item_url = reverse("api_v1:cart:item-detail", kwargs={"item_id": item_id})
        del_resp = client.delete(item_url)
        assert del_resp.status_code == status.HTTP_200_OK
        assert del_resp.json()["items_count"] == 0
