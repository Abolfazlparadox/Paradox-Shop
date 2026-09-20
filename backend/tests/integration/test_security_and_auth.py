from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from apps.orders.models import Order


@pytest.mark.django_db
class TestSecurityAndIsolation:
    def test_unauthenticated_user_cannot_access_profile(self, api_client):
        url = reverse("api_v1:users:profile")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_user_cannot_checkout(self, api_client):
        url = reverse("api_v1:orders:checkout")
        response = api_client.post(url, {})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_cannot_access_other_users_address(self, auth_client, create_user, create_address):
        user1 = create_user(email="user1@example.com")
        user2 = create_user(email="user2@example.com")

        address_user1 = create_address(user=user1, title="User1 Home")
        client_user2 = auth_client(user2)

        url = reverse("api_v1:users:address-detail", kwargs={"pk": address_user1.id})
        response = client_user2.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_user_cannot_access_other_users_order(self, auth_client, create_user):
        user1 = create_user(email="orderowner@example.com")
        user2 = create_user(email="otheruser@example.com")

        order_user1 = Order.objects.create(
            user=user1,
            order_number="PDX-ORDER-USER1-001",
            status=Order.OrderStatus.PENDING,
            subtotal=Decimal("50000"),
            total=Decimal("50000"),
        )

        client_user2 = auth_client(user2)
        url = reverse("api_v1:orders:detail", kwargs={"pk": order_user1.id})
        response = client_user2.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_health_endpoints_accessible_without_auth(self, api_client):
        for route in ["health", "health-live", "health-ready"]:
            url = reverse(f"api_v1:{route}")
            response = api_client.get(url)
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE]
