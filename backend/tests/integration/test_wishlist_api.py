import uuid
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestWishlistAPI:
    def test_unauthenticated_cannot_access_wishlist(self, api_client):
        url = reverse("api_v1:wishlist:detail")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_empty_wishlist(self, auth_client, create_user):
        user = create_user(email="wish_user1@example.com")
        client = auth_client(user)

        url = reverse("api_v1:wishlist:detail")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items_count"] == 0
        assert data["items"] == []

    def test_add_product_to_wishlist(self, auth_client, create_user, create_product):
        user = create_user(email="wish_user2@example.com")
        client = auth_client(user)
        product = create_product(name="Luxury Watch", base_price=Decimal("15000000"))

        url = reverse("api_v1:wishlist:item-create")
        payload = {"product_id": str(product.id)}
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["product"]["id"] == str(product.id)
        assert data["product"]["name"] == "Luxury Watch"

        # Verify wishlist now has 1 item
        get_resp = client.get(reverse("api_v1:wishlist:detail"))
        assert get_resp.status_code == status.HTTP_200_OK
        assert get_resp.json()["items_count"] == 1

    def test_add_duplicate_product_to_wishlist(self, auth_client, create_user, create_product):
        user = create_user(email="wish_user3@example.com")
        client = auth_client(user)
        product = create_product(name="Designer Bag")

        url = reverse("api_v1:wishlist:item-create")
        payload = {"product_id": str(product.id)}

        # First add -> 201 Created
        resp1 = client.post(url, payload, format="json")
        assert resp1.status_code == status.HTTP_201_CREATED

        # Second add -> 200 OK (idempotent, no duplicates created)
        resp2 = client.post(url, payload, format="json")
        assert resp2.status_code == status.HTTP_200_OK

        get_resp = client.get(reverse("api_v1:wishlist:detail"))
        assert get_resp.json()["items_count"] == 1

    def test_add_product_with_variant(
        self, auth_client, create_user, create_product, create_variant
    ):
        user = create_user(email="wish_user4@example.com")
        client = auth_client(user)
        product = create_product(name="Mechanical Keyboard")
        variant = create_variant(product=product, name="Blue Switches", sku="KB-BLUE")

        url = reverse("api_v1:wishlist:item-create")
        payload = {"product_id": str(product.id), "variant_id": str(variant.id)}
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["variant"]["id"] == str(variant.id)
        assert data["variant"]["sku"] == "KB-BLUE"

    def test_remove_item_by_id(self, auth_client, create_user, create_product):
        user = create_user(email="wish_user5@example.com")
        client = auth_client(user)
        product = create_product(name="Headphones")

        add_resp = client.post(
            reverse("api_v1:wishlist:item-create"),
            {"product_id": str(product.id)},
            format="json",
        )
        item_id = add_resp.json()["id"]

        del_url = reverse("api_v1:wishlist:item-detail", kwargs={"item_id": item_id})
        del_resp = client.delete(del_url)
        assert del_resp.status_code == status.HTTP_200_OK
        assert del_resp.json()["items_count"] == 0

    def test_remove_item_by_product_toggle(self, auth_client, create_user, create_product):
        user = create_user(email="wish_user6@example.com")
        client = auth_client(user)
        product = create_product(name="Sunglasses")

        client.post(
            reverse("api_v1:wishlist:item-create"),
            {"product_id": str(product.id)},
            format="json",
        )

        remove_url = reverse("api_v1:wishlist:remove-by-product")
        remove_resp = client.post(remove_url, {"product_id": str(product.id)}, format="json")
        assert remove_resp.status_code == status.HTTP_200_OK
        assert remove_resp.json()["removed"] is True

        # Check wishlist is empty
        get_resp = client.get(reverse("api_v1:wishlist:detail"))
        assert get_resp.json()["items_count"] == 0

    def test_clear_entire_wishlist(self, auth_client, create_user, create_product):
        user = create_user(email="wish_user7@example.com")
        client = auth_client(user)
        p1 = create_product(name="Item 1", slug="item-1")
        p2 = create_product(name="Item 2", slug="item-2")

        client.post(
            reverse("api_v1:wishlist:item-create"), {"product_id": str(p1.id)}, format="json"
        )
        client.post(
            reverse("api_v1:wishlist:item-create"), {"product_id": str(p2.id)}, format="json"
        )

        clear_resp = client.delete(reverse("api_v1:wishlist:detail"))
        assert clear_resp.status_code == status.HTTP_200_OK
        assert clear_resp.json()["deleted_count"] == 2

        get_resp = client.get(reverse("api_v1:wishlist:detail"))
        assert get_resp.json()["items_count"] == 0

    def test_merge_guest_wishlist(self, auth_client, create_user, create_product):
        user = create_user(email="wish_user8@example.com")
        client = auth_client(user)
        p1 = create_product(name="Guest Item 1", slug="g-item-1")
        p2 = create_product(name="Guest Item 2", slug="g-item-2")

        # User already has p1
        client.post(
            reverse("api_v1:wishlist:item-create"), {"product_id": str(p1.id)}, format="json"
        )

        # Merge p1 and p2 from guest session
        merge_url = reverse("api_v1:wishlist:merge")
        merge_resp = client.post(
            merge_url,
            {"product_ids": [str(p1.id), str(p2.id)]},
            format="json",
        )
        assert merge_resp.status_code == status.HTTP_200_OK
        data = merge_resp.json()
        assert data["items_count"] == 2

    def test_check_product_in_wishlist(self, auth_client, create_user, create_product):
        user = create_user(email="wish_user9@example.com")
        client = auth_client(user)
        product = create_product(name="Camera")

        check_url = reverse("api_v1:wishlist:check")
        # Before adding
        resp1 = client.get(f"{check_url}?product_id={product.id}")
        assert resp1.status_code == status.HTTP_200_OK
        assert resp1.json()["in_wishlist"] is False

        # After adding
        client.post(
            reverse("api_v1:wishlist:item-create"), {"product_id": str(product.id)}, format="json"
        )
        resp2 = client.get(f"{check_url}?product_id={product.id}")
        assert resp2.status_code == status.HTTP_200_OK
        assert resp2.json()["in_wishlist"] is True

    def test_cross_user_isolation(self, auth_client, create_user, create_product):
        user_a = create_user(email="user_a@example.com")
        user_b = create_user(email="user_b@example.com")
        client_a = auth_client(user_a)
        client_b = auth_client(user_b)

        prod = create_product(name="Isolated Product")
        add_resp = client_a.post(
            reverse("api_v1:wishlist:item-create"), {"product_id": str(prod.id)}, format="json"
        )
        item_id_a = add_resp.json()["id"]

        # User B attempts to delete User A's item -> 404 Not Found (isolated)
        del_url = reverse("api_v1:wishlist:item-detail", kwargs={"item_id": item_id_a})
        del_resp_b = client_b.delete(del_url)
        assert del_resp_b.status_code == status.HTTP_404_NOT_FOUND

        # User A's wishlist item remains untouched
        get_resp_a = client_a.get(reverse("api_v1:wishlist:detail"))
        assert get_resp_a.json()["items_count"] == 1

    def test_inactive_product_cannot_be_added(self, auth_client, create_user, create_product):
        user = create_user(email="wish_user10@example.com")
        client = auth_client(user)
        inactive_prod = create_product(name="Old Product", is_active=False)

        url = reverse("api_v1:wishlist:item-create")
        payload = {"product_id": str(inactive_prod.id)}
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND
