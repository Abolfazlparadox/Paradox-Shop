from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.orders.models import Order
from apps.products.models import ProductVariant
from common.audit_services import record_audit_log
from common.notification_services import create_admin_notification
from common.models import AdminNotification


class AdminOrderService:
    """
    Administrative state mutation and lifecycle management for Orders.
    """

    @staticmethod
    @transaction.atomic
    def update_status(order: Order, new_status: str, actor_user=None, request=None) -> Order:
        new_status = new_status.lower()
        old_status = order.status

        if old_status == new_status:
            return order

        if not order.can_transition_to(new_status):
            valid_targets = ", ".join([f"'{s}'" for s in order.VALID_TRANSITIONS.get(old_status, set())])
            raise ValidationError({
                "status": f"Invalid state transition from '{old_status}' to '{new_status}'. Allowed targets: {valid_targets or 'None (Terminal state)'}"
            })

        order.status = new_status

        if new_status == Order.OrderStatus.PROCESSING and not order.paid_at:
            order.paid_at = timezone.now()
        elif new_status == Order.OrderStatus.CANCELLED:
            order.cancelled_at = timezone.now()
            # Restore inventory on cancellation
            for item in order.items.select_related("variant"):
                if item.variant_id:
                    ProductVariant.objects.filter(id=item.variant_id).update(
                        stock=ProductVariant.objects.get(id=item.variant_id).stock + item.quantity
                    )

        order.save(update_fields=["status", "paid_at", "cancelled_at", "updated_at"])

        # Synchronize linked Shipment lifecycle
        shipment = getattr(order, "shipment", None)
        if shipment:
            from apps.shipping.models import Shipment
            now = timezone.now()
            if new_status == Order.OrderStatus.PROCESSING:
                if shipment.status == Shipment.ShipmentStatus.PENDING:
                    shipment.status = Shipment.ShipmentStatus.LABEL_CREATED
                    shipment.save(update_fields=["status", "updated_at"])
            elif new_status == Order.OrderStatus.SHIPPED:
                if shipment.status in (Shipment.ShipmentStatus.PENDING, Shipment.ShipmentStatus.LABEL_CREATED):
                    shipment.status = Shipment.ShipmentStatus.IN_TRANSIT
                    if not shipment.shipped_at:
                        shipment.shipped_at = now
                    shipment.save(update_fields=["status", "shipped_at", "updated_at"])
            elif new_status == Order.OrderStatus.DELIVERED:
                if shipment.status != Shipment.ShipmentStatus.DELIVERED:
                    shipment.status = Shipment.ShipmentStatus.DELIVERED
                    if not shipment.delivered_at:
                        shipment.delivered_at = now
                    shipment.save(update_fields=["status", "delivered_at", "updated_at"])
            elif new_status == Order.OrderStatus.CANCELLED:
                shipment.status = Shipment.ShipmentStatus.FAILED
                shipment.save(update_fields=["status", "updated_at"])

        # Audit log
        record_audit_log(
            action=f"ORDER_STATUS_MUTATION_{new_status.upper()}",
            resource_type="ORDER",
            resource_id=str(order.id),
            user=actor_user,
            request=request,
            metadata={
                "order_number": order.order_number,
                "old_status": old_status,
                "new_status": new_status,
                "total": str(order.total),
            },
        )

        # Notify
        create_admin_notification(
            title=f"Order {order.order_number} Status Updated",
            message=f"Order shifted from {old_status} to {new_status}.",
            notification_type=AdminNotification.NotificationType.ORDER,
            action_url=f"/admin/orders?view={order.id}",
            resource_id=str(order.id),
        )

        return order

    @staticmethod
    @transaction.atomic
    def cancel_order(order: Order, reason: str = "", actor_user=None, request=None) -> Order:
        return AdminOrderService.update_status(
            order=order,
            new_status=Order.OrderStatus.CANCELLED,
            actor_user=actor_user,
            request=request,
        )

    @staticmethod
    @transaction.atomic
    def bulk_update_status(order_ids: list[str], new_status: str, actor_user=None, request=None) -> dict:
        results = {"success": [], "failed": []}

        for order_id in order_ids:
            try:
                order = Order.objects.get(id=order_id)
                AdminOrderService.update_status(order, new_status, actor_user=actor_user, request=request)
                results["success"].append(str(order.id))
            except Exception as e:
                results["failed"].append({"id": order_id, "error": str(e)})

        return results
