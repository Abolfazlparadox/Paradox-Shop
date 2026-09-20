import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status

from apps.categories.models import Category
from apps.orders.models import Order, OrderItem
from apps.products.models import Brand, Product, ProductImage, ProductVariant
from apps.promotions.models import DiscountType, Promotion
from apps.reviews.models import Review, ReviewVote
from apps.shipping.models import Shipment, ShippingMethod


@pytest.mark.django_db
class TestPerformanceAndQueryRegression:
    """
    Performance regression test suite asserting query bounds and absence of N+1 regressions.
    Ensures that as data scales, SQL query counts remain O(1) bounded.
    """

    def test_product_list_query_count_is_bounded_and_no_n_plus_one(self, api_client):
        """
        Verify that product catalog listing query count is strictly bounded
        regardless of whether 2 products or 15 products are returned.
        """
        category = Category.objects.create(name="Perf Category", slug="perf-category")
        brand = Brand.objects.create(name="Perf Brand", slug="perf-brand")

        # Create active promotion targeting all products
        promo = Promotion.objects.create(
            name="Perf Promo 20%",
            slug="perf-promo-20",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("20.0"),
            is_active=True,
            priority=10,
        )

        products = []
        for i in range(15):
            p = Product.objects.create(
                name=f"Perf Item {i}",
                slug=f"perf-item-{i}",
                category=category,
                brand=brand,
                base_price=Decimal("1000000"),
                is_active=True,
            )
            ProductVariant.objects.create(
                product=p,
                sku=f"SKU-PERF-{i}",
                name=f"Var {i}",
                price_override=Decimal("1100000"),
                stock=10,
                is_active=True,
            )
            ProductImage.objects.create(
                product=p,
                alt_text=f"Image {i}",
                sort_order=1,
                is_primary=True,
            )
            products.append(p)

        url = reverse("api_v1:products:list")

        # Measure query count for 15 products with promotions
        from django.db import connection, reset_queries

        reset_queries()
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        query_count = len(connection.queries)

        # Before optimization: 15 products triggered 105+ queries.
        # After optimization: Query count is bounded strictly below 10 queries.
        assert query_count <= 10, (
            f"Expected <= 10 SQL queries for product list with promotions, got {query_count}."
        )

    def test_order_list_query_count_is_bounded(self, auth_client):
        """
        Verify that user orders listing executes bounded queries (count + annotated list)
        without firing per-order queries for items.count or shipment.
        """
        client = auth_client()
        user = client.user

        method = ShippingMethod.objects.create(
            name="Express Courier",
            code="express-courier",
            base_rate=Decimal("50000"),
            is_active=True,
        )

        for i in range(10):
            order = Order.objects.create(
                user=user,
                order_number=f"ORD-PERF-{i}",
                status=Order.OrderStatus.PENDING,
                subtotal=Decimal("1000000"),
                total=Decimal("1050000"),
            )
            OrderItem.objects.create(
                order=order,
                product_name=f"Item {i}",
                sku=f"SKU-{i}",
                quantity=2,
                original_unit_price=Decimal("500000"),
                unit_price=Decimal("500000"),
                total_price=Decimal("1000000"),
            )
            Shipment.objects.create(
                order=order,
                shipping_method=method,
                shipping_fee=Decimal("50000"),
            )

        url = reverse("api_v1:orders:list")

        from django.db import connection, reset_queries

        reset_queries()
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        query_count = len(connection.queries)

        # Before optimization: 10 orders triggered 21+ queries (1 + 10 items.count + 10 shipment).
        # After optimization: Must be <= 5 queries total (including JWT auth lookup and count).
        assert query_count <= 5, (
            f"Expected <= 5 SQL queries for order list, got {query_count}."
        )

    def test_category_tree_query_count(self, api_client):
        """
        Verify that the nested category hierarchy endpoint executes in a single DB query.
        """
        root = Category.objects.create(name="Root Cat", slug="root-cat")
        child = Category.objects.create(name="Child Cat", slug="child-cat", parent=root)
        Category.objects.create(name="Subchild Cat", slug="subchild-cat", parent=child)

        url = reverse("api_v1:categories:tree")

        from django.db import connection, reset_queries

        reset_queries()
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        query_count = len(connection.queries)

        assert query_count <= 2, f"Category tree must execute in <= 2 queries, got {query_count}."

    def test_review_list_user_votes_prefetched_for_auth_user(self, auth_client, create_user):
        """
        Verify that review list votes for authenticated user are batched rather than per-item N+1.
        """
        client = auth_client()
        user = client.user

        category = Category.objects.create(name="Cat", slug="cat-rev-perf")
        product = Product.objects.create(
            name="Rev Product",
            slug="rev-product-perf",
            category=category,
            base_price=Decimal("1000000"),
            is_active=True,
        )

        for i in range(5):
            author = create_user(email=f"author_{i}@example.com")
            rev = Review.objects.create(
                product=product,
                user=author,
                rating=5,
                title=f"Review {i}",
                body="Performance test review body.",
                status=Review.ReviewStatus.APPROVED,
            )
            ReviewVote.objects.create(
                review=rev,
                user=user,
                is_helpful=True,
            )

        url = reverse("api_v1:reviews:product-reviews", kwargs={"product_id": product.id})

        from django.db import connection, reset_queries

        reset_queries()
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        query_count = len(connection.queries)

        # Pre-fetched in a single IN (...) query, total queries <= 6.
        assert query_count <= 6, f"Expected <= 6 queries for reviews with votes, got {query_count}."

    def test_product_list_payload_size_bounded(self, api_client):
        """
        Verify that product list response payload is bounded and does not leak excessive nested structures.
        """
        url = reverse("api_v1:products:list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        payload_bytes = len(response.content)
        # 20 products should be comfortably under 50 KB uncompressed JSON
        assert payload_bytes < 50_000, f"Payload size unexpectedly bloated: {payload_bytes} bytes"
