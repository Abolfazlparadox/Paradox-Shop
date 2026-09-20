import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status

from apps.products.models import Brand, Product, ProductComment
from apps.categories.models import Category

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    """Clear Redis cache between tests to ensure deterministic throttle testing."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def sample_product(db):
    category = Category.objects.create(name="Watches", slug="watches")
    brand = Brand.objects.create(name="Paradox Atelier", slug="paradox-atelier")
    return Product.objects.create(
        name="Chrono Minimalist",
        slug="chrono-minimalist",
        category=category,
        brand=brand,
        description="Precision engineered luxury timepiece.",
        base_price=12500000,
    )


@pytest.fixture
def verified_user(create_user):
    user = create_user(
        email="verified_client@example.com",
        first_name="Farhad",
        last_name="Majidi",
        phone_number="09121112233",
    )
    user.is_active = True
    user.profile.email_verified = True
    user.save()
    user.profile.save()
    return user


@pytest.fixture
def unverified_user(create_user):
    user = create_user(
        email="unverified_client@example.com",
        first_name="Hassan",
        last_name="Roshan",
        phone_number="09124445566",
    )
    user.is_active = True
    user.profile.email_verified = False
    user.save()
    user.profile.save()
    return user


@pytest.fixture
def staff_user(create_user):
    user = create_user(
        email="admin_staff@example.com",
        first_name="Saeed",
        last_name="Staff",
        is_staff=True,
    )
    user.is_active = True
    user.profile.email_verified = True
    user.save()
    user.profile.save()
    return user


@pytest.mark.django_db
class TestProductCommentsAPI:
    def test_list_comments_nested_structure_and_privacy_guarantee(
        self, api_client, sample_product, verified_user, staff_user
    ):
        # 1. Create a root comment
        root = ProductComment.objects.create(
            product=sample_product,
            user=verified_user,
            content="Is the sapphire glass scratch-resistant under extreme pressure?",
            is_approved=True,
        )

        # 2. Create an admin reply
        reply = ProductComment.objects.create(
            product=sample_product,
            user=staff_user,
            parent=root,
            content="Yes, it features 9 Mohs scale synthetic sapphire crystal.",
            is_approved=True,
        )

        # 3. Create an unapproved comment (should not show)
        ProductComment.objects.create(
            product=sample_product,
            user=verified_user,
            content="Spam comment waiting moderation",
            is_approved=False,
        )

        url = reverse("api_v1:products:product-comments", kwargs={"product_id": sample_product.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data.get("results", data)

        # Only 1 root comment is returned
        assert len(results) == 1
        root_data = results[0]
        assert root_data["id"] == str(root.id)
        assert root_data["content"] == "Is the sapphire glass scratch-resistant under extreme pressure?"
        assert root_data["author_name"] == "Farhad M."
        assert root_data["is_staff_reply"] is False

        # Nested reply is attached
        assert len(root_data["replies"]) == 1
        reply_data = root_data["replies"][0]
        assert reply_data["id"] == str(reply.id)
        assert "Saeed (Atelier Support)" in reply_data["author_name"]
        assert reply_data["is_staff_reply"] is True

        # STRICT PRIVACY CHECK: Ensure NO email, phone or sensitive IDs leak
        raw_response_str = response.content.decode("utf-8")
        assert "verified_client@example.com" not in raw_response_str
        assert "admin_staff@example.com" not in raw_response_str
        assert "09121112233" not in raw_response_str
        assert "09124445566" not in raw_response_str
        assert str(verified_user.id) not in raw_response_str
        assert str(staff_user.id) not in raw_response_str

    def test_unauthenticated_user_cannot_post_comment(self, api_client, sample_product):
        url = reverse("api_v1:products:product-comments", kwargs={"product_id": sample_product.id})
        payload = {"content": "Can I order this in titanium?"}
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unverified_user_cannot_post_comment(self, auth_client, sample_product, unverified_user):
        client = auth_client(unverified_user)
        url = reverse("api_v1:products:product-comments", kwargs={"product_id": sample_product.id})
        payload = {"content": "Can I order this in titanium?"}
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_verified_user_can_post_root_comment(self, auth_client, sample_product, verified_user):
        client = auth_client(verified_user)
        url = reverse("api_v1:products:product-comments", kwargs={"product_id": sample_product.id})
        payload = {"content": "Does this model come with international warranty?"}
        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["content"] == "Does this model come with international warranty?"
        assert data["author_name"] == "Farhad M."
        assert data["is_staff_reply"] is False
        assert data["replies"] == []

        # Verify in database
        comment = ProductComment.objects.get(id=data["id"])
        assert comment.user == verified_user
        assert comment.product == sample_product
        assert comment.parent is None
        assert comment.is_approved is True

    def test_regular_verified_user_cannot_reply_with_parent(
        self, auth_client, sample_product, verified_user
    ):
        root = ProductComment.objects.create(
            product=sample_product,
            user=verified_user,
            content="Original question",
            is_approved=True,
        )

        client = auth_client(verified_user)
        url = reverse("api_v1:products:product-comments", kwargs={"product_id": sample_product.id})
        payload = {
            "content": "Trying to reply as regular user",
            "parent": str(root.id),
        }
        response = client.post(url, payload, format="json")
        assert response.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN)
        error_msg = str(response.json())
        assert "Only staff administrators" in error_msg

    def test_staff_user_can_reply_with_parent(
        self, auth_client, sample_product, verified_user, staff_user
    ):
        root = ProductComment.objects.create(
            product=sample_product,
            user=verified_user,
            content="What is the delivery timeframe for Tehran?",
            is_approved=True,
        )

        client = auth_client(staff_user)
        url = reverse("api_v1:products:product-comments", kwargs={"product_id": sample_product.id})
        payload = {
            "content": "Same-day express courier dispatch is available.",
            "parent": str(root.id),
        }
        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["is_staff_reply"] is True
        assert "Saeed (Atelier Support)" in data["author_name"]

        # Verify DB association
        reply = ProductComment.objects.get(id=data["id"])
        assert reply.parent == root
        assert reply.user == staff_user

    def test_rate_limiting_throttle_blocks_excessive_submissions(
        self, auth_client, sample_product, verified_user
    ):
        client = auth_client(verified_user)
        url = reverse("api_v1:products:product-comments", kwargs={"product_id": sample_product.id})

        # Submit 5 comments within 10 minutes (allowed limit)
        for i in range(5):
            res = client.post(url, {"content": f"Inquiry number {i + 1}"}, format="json")
            assert res.status_code == status.HTTP_201_CREATED

        # 6th comment must be throttled
        res_throttled = client.post(
            url, {"content": "Inquiry number 6 exceeding rate limit"}, format="json"
        )
        assert res_throttled.status_code == status.HTTP_429_TOO_MANY_REQUESTS
