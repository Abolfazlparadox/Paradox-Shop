from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.categories.models import Category
from apps.products.models import Brand, Product, ProductVariant
from apps.users.models import Address, UserProfile

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def create_user(db):
    def _create_user(
        email="testuser@example.com",
        password="TestPassword123!",
        first_name="Test",
        last_name="User",
        phone_number=None,
        is_staff=False,
        is_superuser=False,
    ):
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            is_staff=is_staff,
            is_superuser=is_superuser,
        )
        UserProfile.objects.get_or_create(user=user)
        return user

    return _create_user


@pytest.fixture
def auth_client(create_user):
    def _auth_client(user=None):
        if user is None:
            user = create_user()
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        client.user = user
        return client

    return _auth_client


@pytest.fixture
def create_brand(db):
    def _create_brand(name="Test Brand", slug="test-brand"):
        brand, _ = Brand.objects.get_or_create(name=name, slug=slug)
        return brand

    return _create_brand


@pytest.fixture
def create_category(db):
    def _create_category(name="Electronics", slug="electronics", parent=None):
        category, _ = Category.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "parent": parent},
        )
        return category

    return _create_category


@pytest.fixture
def create_product(db, create_brand, create_category):
    def _create_product(
        name="Sample Product",
        slug="sample-product",
        base_price=Decimal("100000"),
        brand=None,
        category=None,
        is_active=True,
        is_featured=False,
    ):
        if brand is None:
            brand = create_brand()
        if category is None:
            category = create_category()
        return Product.objects.create(
            name=name,
            slug=slug,
            base_price=base_price,
            brand=brand,
            category=category,
            description="Sample product description",
            is_active=is_active,
            is_featured=is_featured,
        )

    return _create_product


@pytest.fixture
def create_variant(db, create_product):
    def _create_variant(
        product=None,
        sku="SKU-001",
        name="Default Variant",
        price_override=None,
        stock=10,
        is_active=True,
    ):
        if product is None:
            product = create_product()
        return ProductVariant.objects.create(
            product=product,
            sku=sku,
            name=name,
            price_override=price_override,
            stock=stock,
            is_active=is_active,
        )

    return _create_variant


@pytest.fixture
def create_address(db, create_user):
    def _create_address(
        user=None,
        title="Home",
        recipient_name="John Doe",
        recipient_phone="09123456789",
        province="Tehran",
        city="Tehran",
        postal_code="1234567890",
        address_line="Valiasr St, No 1",
        is_default=True,
    ):
        if user is None:
            user = create_user()
        return Address.objects.create(
            user=user,
            title=title,
            recipient_name=recipient_name,
            recipient_phone=recipient_phone,
            province=province,
            city=city,
            postal_code=postal_code,
            address_line=address_line,
            is_default=is_default,
        )

    return _create_address
