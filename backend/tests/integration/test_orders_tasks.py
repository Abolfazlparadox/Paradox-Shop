import uuid
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.orders.models import Order, OrderItem
from apps.orders.tasks import cancel_stale_pending_orders


@pytest.mark.django_db
class TestOrderTasks:
    """Integration tests for background order tasks, expiration, and inventory safety."""

    def test_cancel_stale_pending_orders_restores_stock(self, create_user, create_variant):
        """
        Verify that PENDING orders older than the timeout threshold are cancelled,
        cancelled_at is recorded, and variant stock is accurately restored.
        """
        user = create_user(email="order_task_user@example.com")
        initial_stock = 10
        quantity_ordered = 3
        # Stock was deducted during checkout
        variant = create_variant(stock=initial_stock - quantity_ordered)

        order = Order.objects.create(
            user=user,
            order_number="PDX-TEST-STALE-01",
            status=Order.OrderStatus.PENDING,
            subtotal=Decimal("300000"),
            shipping_cost=Decimal("0"),
            total=Decimal("300000"),
        )
        OrderItem.objects.create(
            order=order,
            product=variant.product,
            variant=variant,
            product_name=variant.product.name,
            variant_name=variant.name,
            sku=variant.sku,
            quantity=quantity_ordered,
            unit_price=Decimal("100000"),
            total_price=Decimal("300000"),
        )

        # Set created_at to 40 minutes in the past
        stale_time = timezone.now() - timedelta(minutes=40)
        Order.objects.filter(pk=order.pk).update(created_at=stale_time)

        result = cancel_stale_pending_orders()

        assert result["cancelled"] == 1
        assert result["total_found"] == 1

        order.refresh_from_db()
        assert order.status == Order.OrderStatus.CANCELLED
        assert order.cancelled_at is not None

        variant.refresh_from_db()
        assert variant.stock == initial_stock  # stock restored exactly once

    def test_cancel_stale_pending_orders_ignores_recent_orders(self, create_user, create_variant):
        """
        Verify that recent PENDING orders (< threshold) are not cancelled.
        """
        user = create_user(email="recent_order_user@example.com")
        variant = create_variant(stock=5)

        order = Order.objects.create(
            user=user,
            order_number="PDX-TEST-RECENT-01",
            status=Order.OrderStatus.PENDING,
            subtotal=Decimal("100000"),
            shipping_cost=Decimal("0"),
            total=Decimal("100000"),
        )
        OrderItem.objects.create(
            order=order,
            product=variant.product,
            variant=variant,
            product_name=variant.product.name,
            variant_name=variant.name,
            sku=variant.sku,
            quantity=2,
            unit_price=Decimal("50000"),
            total_price=Decimal("100000"),
        )

        # Order created_at is default (now)
        result = cancel_stale_pending_orders()

        assert result["cancelled"] == 0
        assert result["total_found"] == 0

        order.refresh_from_db()
        assert order.status == Order.OrderStatus.PENDING
        assert order.cancelled_at is None

        variant.refresh_from_db()
        assert variant.stock == 5  # stock unchanged

    def test_cancel_stale_pending_orders_ignores_processed_and_cancelled_orders(
        self, create_user, create_variant
    ):
        """
        Verify that non-pending orders (e.g. PROCESSING, DELIVERED, CANCELLED)
        are ignored by the task, even if created a long time ago.
        """
        user = create_user(email="processed_order_user@example.com")
        variant = create_variant(stock=10)

        processing_order = Order.objects.create(
            user=user,
            order_number="PDX-TEST-PROC-01",
            status=Order.OrderStatus.PROCESSING,
            subtotal=Decimal("100000"),
            shipping_cost=Decimal("0"),
            total=Decimal("100000"),
        )
        cancelled_order = Order.objects.create(
            user=user,
            order_number="PDX-TEST-CANC-01",
            status=Order.OrderStatus.CANCELLED,
            subtotal=Decimal("100000"),
            shipping_cost=Decimal("0"),
            total=Decimal("100000"),
            cancelled_at=timezone.now() - timedelta(minutes=60),
        )

        stale_time = timezone.now() - timedelta(minutes=50)
        Order.objects.filter(pk__in=[processing_order.pk, cancelled_order.pk]).update(
            created_at=stale_time
        )

        result = cancel_stale_pending_orders()

        assert result["cancelled"] == 0
        assert result["total_found"] == 0

        processing_order.refresh_from_db()
        assert processing_order.status == Order.OrderStatus.PROCESSING

        variant.refresh_from_db()
        assert variant.stock == 10  # stock untouched

    def test_cancel_stale_pending_orders_idempotency(self, create_user, create_variant):
        """
        Verify that running the task multiple times in succession is fully idempotent
        and NEVER double-restores stock.
        """
        user = create_user(email="idempotent_task_user@example.com")
        initial_stock = 10
        quantity_ordered = 2
        variant = create_variant(stock=initial_stock - quantity_ordered)

        order = Order.objects.create(
            user=user,
            order_number="PDX-TEST-IDEM-01",
            status=Order.OrderStatus.PENDING,
            subtotal=Decimal("200000"),
            shipping_cost=Decimal("0"),
            total=Decimal("200000"),
        )
        OrderItem.objects.create(
            order=order,
            product=variant.product,
            variant=variant,
            product_name=variant.product.name,
            variant_name=variant.name,
            sku=variant.sku,
            quantity=quantity_ordered,
            unit_price=Decimal("100000"),
            total_price=Decimal("200000"),
        )

        stale_time = timezone.now() - timedelta(minutes=45)
        Order.objects.filter(pk=order.pk).update(created_at=stale_time)

        # First run: cancels order and restores stock
        result_1 = cancel_stale_pending_orders()
        assert result_1["cancelled"] == 1

        variant.refresh_from_db()
        assert variant.stock == initial_stock

        # Second run: does not find or cancel order again, stock remains identical
        result_2 = cancel_stale_pending_orders()
        assert result_2["cancelled"] == 0
        assert result_2["total_found"] == 0

        variant.refresh_from_db()
        assert variant.stock == initial_stock

        # Third run
        result_3 = cancel_stale_pending_orders()
        assert result_3["cancelled"] == 0

        variant.refresh_from_db()
        assert variant.stock == initial_stock
