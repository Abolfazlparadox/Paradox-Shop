from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from apps.orders.models import Order, OrderItem
from apps.reviews.models import Review


@pytest.mark.django_db
class TestReviewsAPI:
    def test_create_review_verified_purchase(
        self, auth_client, create_user, create_product, create_variant
    ):
        user = create_user()
        client = auth_client(user)
        prod = create_product()
        variant = create_variant(product=prod)

        # Create a delivered order for this product so user qualifies as verified purchase
        order = Order.objects.create(
            user=user,
            order_number="PDX-TEST-DELIVERED-001",
            status=Order.OrderStatus.DELIVERED,
            subtotal=Decimal("100000"),
            total=Decimal("100000"),
        )
        OrderItem.objects.create(
            order=order,
            product=prod,
            variant=variant,
            product_name=prod.name,
            sku=variant.sku,
            quantity=1,
            unit_price=Decimal("100000"),
            total_price=Decimal("100000"),
        )

        create_url = reverse("api_v1:reviews:create")
        payload = {
            "product_id": str(prod.id),
            "rating": 5,
            "title": "Excellent Product",
            "body": "Loved the build quality.",
        }
        response = client.post(create_url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["rating"] == 5
        assert data["is_verified_purchase"] is True

    def test_create_review_unverified_purchase_rejected(
        self, auth_client, create_user, create_product
    ):
        user = create_user()
        client = auth_client(user)
        prod = create_product()

        create_url = reverse("api_v1:reviews:create")
        payload = {
            "product_id": str(prod.id),
            "rating": 4,
            "title": "Nice product",
        }
        response = client.post(create_url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_product_reviews_list_shows_only_approved(
        self, api_client, create_user, create_product
    ):
        u1 = create_user(email="u1@example.com")
        u2 = create_user(email="u2@example.com")
        prod = create_product()

        Review.objects.create(
            product=prod, user=u1, rating=5, title="Approved Review", status=Review.ReviewStatus.APPROVED
        )
        Review.objects.create(
            product=prod, user=u2, rating=1, title="Pending Review", status=Review.ReviewStatus.PENDING
        )


        list_url = reverse("api_v1:reviews:product-reviews", kwargs={"product_id": prod.id})
        response = api_client.get(list_url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["title"] == "Approved Review"
