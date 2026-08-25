from decimal import Decimal
import pytest
from rest_framework import status

from apps.orders.models import Order, OrderAddress, OrderItem
from apps.payments.models import Payment
from apps.products.models import Product, ProductComment, ProductVariant
from apps.reviews.models import Review
from common.models import AdminNotification, AuditLog, SystemSetting


@pytest.mark.django_db
class TestAdminClearanceAndPermissions:
    """Test authentication and clearance on /api/v1/admin/ endpoints."""

    def test_anonymous_access_denied(self, api_client):
        res = api_client.get("/api/v1/admin/dashboard/")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

        res_orders = api_client.get("/api/v1/admin/orders/")
        assert res_orders.status_code == status.HTTP_401_UNAUTHORIZED

    def test_normal_customer_access_forbidden(self, auth_client, create_user):
        customer = create_user(email="normal_patron@example.com", is_staff=False, is_superuser=False)
        client = auth_client(customer)

        res = client.get("/api/v1/admin/dashboard/")
        assert res.status_code == status.HTTP_403_FORBIDDEN

        res_orders = client.get("/api/v1/admin/orders/")
        assert res_orders.status_code == status.HTTP_403_FORBIDDEN

        res_me = client.get("/api/v1/admin/me/")
        assert res_me.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_admin_access_granted(self, auth_client, create_user):
        staff = create_user(email="staff_director@example.com", is_staff=True, is_superuser=False)
        client = auth_client(staff)

        res = client.get("/api/v1/admin/me/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["email"] == "staff_director@example.com"
        assert data["is_staff"] is True
        assert "orders.view" in data["permissions"]


@pytest.mark.django_db
class TestAdminDashboardAndAnalytics:
    """Test DB-backed telemetry on /api/v1/admin/dashboard/ and /api/v1/admin/analytics/."""

    def test_dashboard_real_metrics(self, auth_client, create_user, create_product, create_variant):
        staff = create_user(email="admin@example.com", is_staff=True)
        client = auth_client(staff)

        # Create sample products and variants
        p = create_product(name="Titanium Chronograph", base_price=Decimal("15000000"))
        create_variant(product=p, sku="PX-TITAN-01", stock=4)

        res = client.get("/api/v1/admin/dashboard/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()

        assert "kpis" in data
        assert "revenue_chart" in data
        assert "acquisition_channels" in data
        assert "status_distribution" in data
        assert data["kpis"]["low_stock_variants"] >= 1

    def test_analytics_period_filtering(self, auth_client, create_user):
        staff = create_user(email="admin@example.com", is_staff=True)
        client = auth_client(staff)

        res = client.get("/api/v1/admin/analytics/?days=7")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "kpis" in data
        assert "revenue_chart" in data
        assert "cohorts" in data


@pytest.mark.django_db
class TestAdminOrderOperations:
    """Test administrative order lifecycle management, transitions, and stock restoration."""

    def test_order_listing_and_filtering(self, auth_client, create_user, create_product, create_variant):
        staff = create_user(email="staff@example.com", is_staff=True)
        customer = create_user(email="patron@example.com")
        client = auth_client(staff)

        order = Order.objects.create(
            user=customer,
            order_number="PX-TEST-1001",
            status=Order.OrderStatus.PENDING,
            subtotal=Decimal("1000000"),
            total=Decimal("1000000"),
        )
        OrderAddress.objects.create(
            order=order,
            recipient_name="Farhad",
            recipient_phone="09120000000",
            province="Tehran",
            city="Tehran",
            postal_code="1234567890",
            address_line="Tower 1",
        )

        res = client.get("/api/v1/admin/orders/")
        assert res.status_code == status.HTTP_200_OK
        results = res.json()["results"] if "results" in res.json() else res.json()
        assert len(results) >= 1
        assert results[0]["order_number"] == "PX-TEST-1001"

    def test_order_status_valid_and_invalid_transition(self, auth_client, create_user):
        staff = create_user(email="staff@example.com", is_staff=True)
        customer = create_user(email="patron@example.com")
        client = auth_client(staff)

        order = Order.objects.create(
            user=customer,
            order_number="PX-TEST-1002",
            status=Order.OrderStatus.PENDING,
            subtotal=Decimal("500000"),
            total=Decimal("500000"),
        )
        OrderAddress.objects.create(
            order=order, recipient_name="Ali", recipient_phone="09121111111", province="T", city="T", postal_code="1", address_line="A"
        )

        # Valid: PENDING -> PROCESSING
        res = client.patch(f"/api/v1/admin/orders/{order.id}/status/", {"status": "processing"})
        assert res.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        assert order.status == Order.OrderStatus.PROCESSING
        assert order.paid_at is not None

        # Invalid: PROCESSING -> DELIVERED (Must go to SHIPPED first)
        res_invalid = client.patch(f"/api/v1/admin/orders/{order.id}/status/", {"status": "delivered"})
        assert res_invalid.status_code == status.HTTP_400_BAD_REQUEST

    def test_order_cancellation_restores_inventory_and_logs(self, auth_client, create_user, create_product, create_variant):
        staff = create_user(email="staff@example.com", is_staff=True)
        customer = create_user(email="patron@example.com")
        client = auth_client(staff)

        product = create_product()
        variant = create_variant(product=product, stock=10)

        order = Order.objects.create(
            user=customer,
            order_number="PX-TEST-1003",
            status=Order.OrderStatus.PENDING,
            subtotal=Decimal("200000"),
            total=Decimal("200000"),
        )
        OrderAddress.objects.create(
            order=order, recipient_name="A", recipient_phone="09", province="T", city="T", postal_code="1", address_line="A"
        )
        OrderItem.objects.create(
            order=order,
            product=product,
            variant=variant,
            product_name=product.name,
            variant_name=variant.name,
            sku=variant.sku,
            quantity=3,
            unit_price=Decimal("100000"),
            total_price=Decimal("300000"),
        )

        # Cancel order
        res = client.post(f"/api/v1/admin/orders/{order.id}/cancel/")
        assert res.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        assert order.status == Order.OrderStatus.CANCELLED
        variant.refresh_from_db()
        assert variant.stock == 13  # 10 + 3 restored

        # Check AuditLog
        assert AuditLog.objects.filter(resource_id=str(order.id), action__icontains="CANCELLED").exists()


@pytest.mark.django_db
class TestAdminCatalogAndInventory:
    """Test Product CRUD, Variant stock updates, and low-stock telemetry."""

    def test_product_create_and_delete(self, auth_client, create_user, create_category, create_brand):
        staff = create_user(email="staff@example.com", is_staff=True)
        client = auth_client(staff)
        category = create_category(name="Hardware", slug="hardware")
        brand = create_brand(name="Paradox Labs", slug="paradox-labs")

        payload = {
            "name": "Cyberdeck Enclosure Mk.II",
            "category": str(category.id),
            "brand": str(brand.id),
            "base_price": 24000000,
            "product_type": "simple",
            "description": "Monolithic milled aluminum frame.",
            "is_active": True,
        }

        res = client.post("/api/v1/admin/products/", payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        p_id = res.json()["id"]

        # Check inventory listing
        res_inv = client.get("/api/v1/admin/inventory/")
        assert res_inv.status_code == status.HTTP_200_OK

        # Delete product
        res_del = client.delete(f"/api/v1/admin/products/{p_id}/")
        assert res_del.status_code == status.HTTP_204_NO_CONTENT
        assert not Product.objects.filter(id=p_id).exists()

    def test_inventory_stock_update_triggers_notification_on_low_stock(self, auth_client, create_user, create_product, create_variant):
        staff = create_user(email="staff@example.com", is_staff=True)
        client = auth_client(staff)

        product = create_product(name="Atelier Horology S1")
        variant = create_variant(product=product, stock=20)

        # Update stock down to 3
        res = client.patch(f"/api/v1/admin/inventory/{variant.id}/", {"stock": 3}, format="json")
        assert res.status_code == status.HTTP_200_OK
        variant.refresh_from_db()
        assert variant.stock == 3

        # Notification should have been generated
        assert AdminNotification.objects.filter(notification_type=AdminNotification.NotificationType.STOCK).exists()


@pytest.mark.django_db
class TestAdminCustomerDirectory:
    """Test patron dossier, lifetime value aggregation, and account clearance toggling."""

    def test_customer_list_and_toggle_status(self, auth_client, create_user):
        staff = create_user(email="staff@example.com", is_staff=True)
        patron = create_user(email="vip_patron@example.com")
        client = auth_client(staff)

        res = client.get("/api/v1/admin/customers/")
        assert res.status_code == status.HTTP_200_OK

        # Toggle status
        res_toggle = client.post(f"/api/v1/admin/customers/{patron.id}/toggle-status/")
        assert res_toggle.status_code == status.HTTP_200_OK
        patron.refresh_from_db()
        assert patron.is_active is False


@pytest.mark.django_db
class TestAdminModerationAndGovernance:
    """Test reviews and threaded inquiries moderation, notifications, and settings persistence."""

    def test_comment_moderation_and_staff_reply(self, auth_client, create_user, create_product):
        staff = create_user(email="staff@example.com", is_staff=True)
        user = create_user(email="patron@example.com")
        product = create_product()
        client = auth_client(staff)

        comment = ProductComment.objects.create(
            product=product, user=user, content="Can this be customized?", is_approved=False
        )

        # Approve
        res_mod = client.post(f"/api/v1/admin/comments/{comment.id}/moderate/", {"is_approved": True}, format="json")
        assert res_mod.status_code == status.HTTP_200_OK
        comment.refresh_from_db()
        assert comment.is_approved is True

        # Staff reply
        res_reply = client.post(f"/api/v1/admin/comments/{comment.id}/reply/", {"content": "Yes, bespoke orders are welcome."}, format="json")
        assert res_reply.status_code == status.HTTP_201_CREATED
        assert ProductComment.objects.filter(parent=comment).exists()

    def test_settings_persistence_and_audit(self, auth_client, create_user):
        staff = create_user(email="staff@example.com", is_staff=True)
        client = auth_client(staff)

        res = client.get("/api/v1/admin/settings/")
        assert res.status_code == status.HTTP_200_OK

        # Update maintenance mode & courier fee
        res_patch = client.patch(
            "/api/v1/admin/settings/",
            {"maintenance_mode": True, "shipping_fee_base": 75000},
            format="json",
        )
        assert res_patch.status_code == status.HTTP_200_OK
        data = res_patch.json()
        assert data["maintenance_mode"] is True
        assert data["shipping_fee_base"] == 75000

        # Verify audit log
        assert AuditLog.objects.filter(resource_type="SETTINGS", action="SETTINGS_UPDATE").exists()
