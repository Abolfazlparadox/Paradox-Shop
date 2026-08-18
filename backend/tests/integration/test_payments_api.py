from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestPaymentsAPI:
    def _create_pending_order(self, client, user, create_product, create_variant, create_address):
        address = create_address(user=user)
        prod = create_product(base_price=Decimal("750000"))
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
            reverse("api_v1:orders:checkout"),
            {
                "address_id": str(address.id),
            },
            format="json",
        )
        return order_resp.json()["id"]

    def test_mock_payment_success(
        self, auth_client, create_user, create_product, create_variant, create_address
    ):
        user = create_user()
        client = auth_client(user)
        order_id = self._create_pending_order(
            client, user, create_product, create_variant, create_address
        )

        pay_url = reverse("api_v1:payments:create-payment")
        response = client.post(
            pay_url,
            {
                "order_id": order_id,
                "idempotency_key": "key-12345",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "succeeded"
        assert data["amount"] == "750000"
        assert data["idempotency_key"] == "key-12345"

        # Verify order transitioned to 'processing'
        order_detail = client.get(reverse("api_v1:orders:detail", kwargs={"pk": order_id}))
        assert order_detail.json()["status"] == "processing"
        assert order_detail.json()["paid_at"] is not None

    def test_mock_payment_duplicate_prevention(
        self, auth_client, create_user, create_product, create_variant, create_address
    ):
        user = create_user()
        client = auth_client(user)
        order_id = self._create_pending_order(
            client, user, create_product, create_variant, create_address
        )

        pay_url = reverse("api_v1:payments:create-payment")
        # First payment succeeds
        client.post(pay_url, {"order_id": order_id}, format="json")

        # Second payment should be rejected because order is already paid/processing
        second_resp = client.post(pay_url, {"order_id": order_id}, format="json")
        assert second_resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_payment_list_and_detail(
        self, auth_client, create_user, create_product, create_variant, create_address
    ):
        user = create_user()
        client = auth_client(user)
        order_id = self._create_pending_order(
            client, user, create_product, create_variant, create_address
        )

        pay_resp = client.post(
            reverse("api_v1:payments:create-payment"), {"order_id": order_id}, format="json"
        )
        payment_id = pay_resp.json()["id"]

        list_resp = client.get(reverse("api_v1:payments:list"))
        assert list_resp.status_code == status.HTTP_200_OK
        assert list_resp.json()["count"] == 1

        detail_resp = client.get(reverse("api_v1:payments:detail", kwargs={"pk": payment_id}))
        assert detail_resp.status_code == status.HTTP_200_OK
        assert detail_resp.json()["id"] == payment_id
