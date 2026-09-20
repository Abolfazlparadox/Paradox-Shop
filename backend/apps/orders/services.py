import logging
import uuid
from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cart.models import Cart, CartItem
from apps.products.models import ProductVariant

from .models import Order, OrderAddress, OrderItem

logger = logging.getLogger(__name__)


class OrderService:
    """Business logic for creating and mutating Orders, including the checkout workflow."""

    @staticmethod
    @transaction.atomic
    def create_order_from_cart(
        *,
        user,
        address_id: uuid.UUID,
        shipping_method_id: uuid.UUID | None = None,
        notes: str | None = None,
        coupon_code: str | None = None,
    ) -> Order:
        """
        Executes the full checkout workflow atomically:

        1. Lock the user's cart with select_for_update().
        2. Validate the cart is non-empty.
        3. Validate the address belongs to the user.
        4. Lock required ProductVariant rows with select_for_update().
        5. Re-validate stock AFTER acquiring locks.
        6. Calculate subtotal, promotions, coupon discounts, shipping, and total
           using locked variants' current final_price and the PromotionEngine.
        7. Create Order + OrderItem snapshots + OrderAddress snapshot + Shipment.
        8. Atomically redeem coupon if used (with select_for_update locking).
        9. Decrease variant stock.
        10. Clear the user's cart.
        """
        from apps.users.models import Address
        from apps.shipping.services import calculate_shipping_for_order, create_shipment_for_order
        from apps.promotions.models import Coupon
        from apps.promotions.services import CouponService, PromotionEngine

        # --- Step 1: Lock the cart row to prevent concurrent checkouts ---
        try:
            cart = Cart.objects.select_for_update().get(user=user)
        except Cart.DoesNotExist:
            raise ValidationError({"cart": "No cart found for this user."})

        # --- Step 2: Validate non-empty cart ---
        cart_items = list(CartItem.objects.select_related("product", "variant").filter(cart=cart))
        if not cart_items:
            raise ValidationError({"cart": "Cannot checkout with an empty cart."})

        # --- Step 3: Validate address ownership ---
        try:
            address = Address.objects.get(pk=address_id, user=user, is_deleted=False)
        except Address.DoesNotExist:
            raise ValidationError(
                {"address_id": "Address not found or does not belong to this user."}
            )

        # --- Step 4: Identify and lock ProductVariant rows ---
        variant_ids = [item.variant_id for item in cart_items if item.variant_id is not None]
        locked_variants: dict[uuid.UUID, ProductVariant] = {}
        if variant_ids:
            locked_variants = {
                v.id: v
                for v in ProductVariant.objects.select_for_update().filter(pk__in=variant_ids)
            }

        # --- Step 5: Re-validate stock AFTER locks ---
        for item in cart_items:
            if item.variant_id is not None:
                variant = locked_variants.get(item.variant_id)
                if variant is None:
                    raise ValidationError(
                        {"variant": f'Variant for product "{item.product.name}" no longer exists.'}
                    )
                if item.quantity > variant.stock:
                    raise ValidationError(
                        {
                            "stock": (
                                f'Only {variant.stock} unit(s) of "{variant.name}" '
                                f"are currently in stock. You requested {item.quantity}."
                            )
                        }
                    )

        # --- Step 6: Calculate promotions and coupon discounts via PromotionEngine ---
        engine_cart_items = []
        for item in cart_items:
            if item.variant_id is not None:
                unit_price = locked_variants[item.variant_id].final_price
            else:
                unit_price = item.product.base_price
            engine_cart_items.append(
                {
                    "product": item.product,
                    "variant": item.variant,
                    "quantity": item.quantity,
                    "unit_price": unit_price,
                }
            )

        discount_result = PromotionEngine.calculate_cart_discounts(
            cart_items=engine_cart_items,
            coupon_code=coupon_code if coupon_code else None,
            user=user,
        )

        subtotal = discount_result.subtotal_before_discounts
        discount_amount = discount_result.total_discount
        subtotal_after_discounts = discount_result.subtotal_after_discounts

        shipping_method, shipping_cost = calculate_shipping_for_order(
            shipping_method_id=shipping_method_id,
            province=address.province,
            city=address.city,
            subtotal=subtotal_after_discounts,
        )

        total = subtotal_after_discounts + shipping_cost

        # Coupon snapshot payload
        coupon_obj = None
        coupon_snapshot = {}
        if discount_result.coupon_id:
            coupon_obj = Coupon.objects.get(id=discount_result.coupon_id)
            coupon_snapshot = {
                "id": str(coupon_obj.id),
                "code": coupon_obj.code,
                "discount_type": coupon_obj.discount_type,
                "discount_value": str(coupon_obj.discount_value),
                "max_discount_amount": (
                    str(coupon_obj.max_discount_amount)
                    if coupon_obj.max_discount_amount
                    else None
                ),
                "coupon_discount_applied": str(discount_result.coupon_discount),
            }

        # --- Step 7: Create Order ---
        order_number = OrderService._generate_order_number()
        order = Order(
            user=user,
            order_number=order_number,
            status=Order.OrderStatus.PENDING,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            coupon_code=discount_result.coupon_code,
            coupon_snapshot=coupon_snapshot,
            total=total,
            notes=notes,
        )
        order.save()

        # --- Step 7a: Create OrderItem snapshots with promotion details ---
        item_discount_map = {
            (item.product_id, item.variant_id): item
            for item in discount_result.item_discounts
        }

        order_items_to_create = []
        for item in cart_items:
            variant = item.variant
            item_key = (item.product_id, variant.id if variant else None)
            item_discount = item_discount_map.get(item_key)

            if item_discount:
                original_unit_price = item_discount.original_unit_price
                promo_discount_per_unit = item_discount.promotion_discount_per_unit
                final_unit_price = item_discount.final_unit_price
                promo_snapshot = (
                    {
                        "id": str(item_discount.promotion_id),
                        "name": item_discount.promotion_name,
                        "discount_type": item_discount.discount_type,
                        "discount_value": str(item_discount.discount_value),
                    }
                    if item_discount.promotion_id
                    else {}
                )
            else:
                original_unit_price = (
                    locked_variants[variant.id].final_price
                    if variant
                    else item.product.base_price
                )
                promo_discount_per_unit = Decimal("0")
                final_unit_price = original_unit_price
                promo_snapshot = {}

            order_items_to_create.append(
                OrderItem(
                    order=order,
                    product=item.product,
                    variant=variant,
                    product_name=item.product.name,
                    variant_name=variant.name if variant else None,
                    sku=variant.sku if variant else f"PRD-{item.product.id.hex[:8].upper()}",
                    quantity=item.quantity,
                    original_unit_price=original_unit_price,
                    discount_amount=promo_discount_per_unit,
                    promotion_snapshot=promo_snapshot,
                    unit_price=final_unit_price,
                    total_price=final_unit_price * item.quantity,
                )
            )
        OrderItem.objects.bulk_create(order_items_to_create)

        # --- Step 7b: Create OrderAddress snapshot ---
        OrderAddress.objects.create(
            order=order,
            recipient_name=address.recipient_name,
            recipient_phone=address.recipient_phone,
            province=address.province,
            city=address.city,
            postal_code=address.postal_code,
            address_line=address.address_line,
        )

        # --- Step 7c: Create Shipment linked record ---
        create_shipment_for_order(
            order=order,
            shipping_method=shipping_method,
            shipping_fee=shipping_cost,
        )

        # --- Step 7d: Atomically redeem coupon if applied ---
        if coupon_obj and discount_result.coupon_discount > Decimal("0"):
            CouponService.redeem_coupon(
                coupon=coupon_obj,
                user=user,
                order=order,
                discount_amount=discount_result.coupon_discount,
            )

        # --- Step 8: Decrease variant stock (while locked) ---
        for item in cart_items:
            if item.variant_id is not None:
                variant = locked_variants[item.variant_id]
                variant.stock -= item.quantity
                variant.save(update_fields=["stock"])

        # --- Step 9: Clear the user's cart ---
        cart.items.all().delete()
        cart.delete()

        logger.info(
            "Order created: order_id=%s order_number=%s user_id=%s total=%s",
            order.id,
            order.order_number,
            user.id,
            total,
        )

        # Dispatch background confirmation email and admin notification safely on transaction commit
        order_id_str = str(order.id)
        user_email = user.email
        order_num = order.order_number
        total_str = str(order.total)
        from .tasks import send_order_confirmation_email
        from common.notification_services import create_admin_notification
        from common.models import AdminNotification

        def _on_commit_handlers():
            send_order_confirmation_email.delay(
                order_id_str, user_email, order_num, total_str
            )
            create_admin_notification(
                title=f"New Acquisition: #{order_num}",
                message=f"Patron {user_email} completed checkout for {total_str} Rial.",
                notification_type=AdminNotification.NotificationType.ORDER,
                action_url=f"/admin/orders?view={order_id_str}",
                resource_id=order_id_str,
            )

        transaction.on_commit(_on_commit_handlers)

        return order


    @staticmethod
    @transaction.atomic
    def cancel_order(*, user=None, order_id: uuid.UUID) -> Order:
        """
        Cancels a pending or processing order and restores variant stock.

        Only orders in PENDING or PROCESSING status can be cancelled.
        Variant stock is restored atomically.
        """
        try:
            if user is not None:
                order = Order.objects.select_for_update().get(pk=order_id, user=user)
            else:
                order = Order.objects.select_for_update().get(pk=order_id)
        except Order.DoesNotExist:
            raise ValidationError({"order_id": "Order not found or does not belong to this user."})

        if not order.can_transition_to(Order.OrderStatus.CANCELLED):
            raise ValidationError(
                {"order": f'Order in "{order.get_status_display()}" status cannot be cancelled.'}
            )

        # Restore stock for all order items with variants
        order_items = order.items.select_related("variant").all()
        for item in order_items:
            if item.variant_id is not None:
                variant = ProductVariant.objects.select_for_update().get(pk=item.variant_id)
                variant.stock += item.quantity
                variant.save(update_fields=["stock"])

        order.status = Order.OrderStatus.CANCELLED
        order.cancelled_at = timezone.now()
        order.save(update_fields=["status", "cancelled_at"])

        logger.info(
            "Order cancelled: order_id=%s order_number=%s user_id=%s",
            order.id,
            order.order_number,
            order.user_id,
        )
        return order

    @staticmethod
    @transaction.atomic
    def transition_status(*, order_id: uuid.UUID, new_status: str, actor=None) -> Order:
        """
        Transitions an order to a new status, validating that the transition is allowed.
        This is primarily for admin/system use (e.g., marking as shipped, delivered).
        """
        order = Order.objects.select_for_update().get(pk=order_id)

        if not order.can_transition_to(new_status):
            raise ValidationError(
                {
                    "status": (
                        f'Cannot transition from "{order.get_status_display()}" '
                        f'to "{Order.OrderStatus(new_status).label}".'
                    )
                }
            )

        order.status = new_status
        order.save(update_fields=["status"])

        logger.info(
            "Order status changed: order_id=%s new_status=%s actor=%s", order.id, new_status, actor
        )
        return order

    @staticmethod
    def _generate_order_number() -> str:
        """
        Generates a unique, human-readable order number.
        Format: PDX-YYYYMMDD-XXXXXX (8-digit date + 6 random hex chars).
        """
        now = datetime.now(timezone.get_current_timezone())
        date_part = now.strftime("%Y%m%d")
        random_part = uuid.uuid4().hex[:6].upper()
        return f"PDX-{date_part}-{random_part}"
