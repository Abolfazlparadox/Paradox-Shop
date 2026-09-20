from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestProductsAPI:
    def test_product_list_empty(self, api_client):
        url = reverse("api_v1:products:list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 0
        assert data["results"] == []

    def test_product_list_with_items(self, api_client, create_product):
        create_product(name="Phone A", slug="phone-a", base_price=Decimal("5000000"))
        create_product(name="Phone B", slug="phone-b", base_price=Decimal("10000000"))

        url = reverse("api_v1:products:list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 2

    def test_product_list_filter_category(self, api_client, create_product, create_category):
        cat1 = create_category(name="Laptops", slug="laptops")
        cat2 = create_category(name="Phones", slug="phones")

        create_product(name="MacBook", slug="macbook", category=cat1)
        create_product(name="iPhone", slug="iphone", category=cat2)

        url = reverse("api_v1:products:list")
        response = api_client.get(url, {"category": "laptops"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["slug"] == "macbook"

    def test_product_list_filter_search(self, api_client, create_product):
        create_product(name="Wireless Mouse", slug="wireless-mouse")
        create_product(name="Mechanical Keyboard", slug="mechanical-keyboard")

        url = reverse("api_v1:products:list")
        response = api_client.get(url, {"search": "Mouse"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["slug"] == "wireless-mouse"

    def test_product_detail_success(self, api_client, create_product, create_variant):
        prod = create_product(name="Gaming Laptop", slug="gaming-laptop")
        create_variant(product=prod, sku="GL-16GB", name="16GB RAM")

        url = reverse("api_v1:products:detail", kwargs={"slug": "gaming-laptop"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Gaming Laptop"
        assert len(data["variants"]) == 1
        assert data["variants"][0]["sku"] == "GL-16GB"

    def test_product_detail_inactive_returns_404(self, api_client, create_product):
        create_product(name="Archived Item", slug="archived-item", is_active=False)
        url = reverse("api_v1:products:detail", kwargs={"slug": "archived-item"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
