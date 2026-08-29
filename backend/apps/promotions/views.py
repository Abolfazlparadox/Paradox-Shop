import logging
from decimal import Decimal

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import Cart, CartItem

from .selectors import PromotionSelector
from .serializers import (
    ActivePromotionSerializer,
    CartDiscountPreviewRequestSerializer,
    CartDiscountPreviewSerializer,
    CouponValidateResponseSerializer,
    CouponValidateSerializer,
)
from .services import CouponValidator, PromotionEngine

logger = logging.getLogger(__name__)


class ActivePromotionListView(APIView):
    """Lists currently active promotions for the storefront."""

    permission_classes = []
    authentication_classes = []

    @extend_schema(
        tags=["Promotions"],
        operation_id="list_active_promotions",
        summary="List active promotions",
        description="Returns all currently active promotions visible to customers.",
        responses={200: ActivePromotionSerializer(many=True)},
    )
    def get(self, request):
        promotions = PromotionSelector.get_active_promotions()
        serializer = ActivePromotionSerializer(promotions, many=True)
        return Response(serializer.data)


class ValidateCouponView(APIView):
    """Validates a coupon code and returns a discount preview."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Promotions"],
        operation_id="validate_coupon",
        summary="Validate a coupon code",
        description=(
            "Validates a coupon code for the authenticated user. "
            "Returns discount details if valid."
        ),
        request=CouponValidateSerializer,
        responses={
            200: CouponValidateResponseSerializer,
            400: None,
        },
    )
    def post(self, request):
        input_serializer = CouponValidateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        code = input_serializer.validated_data["code"]

        # Build cart items list if cart exists
        cart_items_qs = []
        cart_subtotal = Decimal("0")
        engine_cart_items = []
        try:
            cart = Cart.objects.get(user=request.user)
            cart_items_qs = list(
                CartItem.objects.select_related("product", "variant").filter(cart=cart)
            )
            for item in cart_items_qs:
                unit_price = (
                    item.variant.final_price if item.variant else item.product.base_price
                )
                cart_subtotal += unit_price * item.quantity
                engine_cart_items.append(
                    {
                        "product": item.product,
                        "variant": item.variant,
                        "quantity": item.quantity,
                        "unit_price": unit_price,
                    }
                )
        except Cart.DoesNotExist:
            pass

        coupon = CouponValidator.validate(
            code=code,
            user=request.user,
            subtotal=cart_subtotal,
        )

        # Calculate exact discount and affected items via PromotionEngine
        estimated_discount = Decimal("0")
        affected_items = []
        if engine_cart_items:
            discount_result = PromotionEngine.calculate_cart_discounts(
                cart_items=engine_cart_items,
                coupon_code=coupon.code,
                user=request.user,
            )
            estimated_discount = discount_result.coupon_discount

            excluded_p_ids = set(coupon.excluded_products.values_list("id", flat=True))
            for item in cart_items_qs:
                is_eligible = item.product.id not in excluded_p_ids
                unit_price = (
                    item.variant.final_price if item.variant else item.product.base_price
                )
                affected_items.append(
                    {
                        "product_id": item.product.id,
                        "variant_id": item.variant.id if item.variant else None,
                        "product_name": item.product.name,
                        "quantity": item.quantity,
                        "unit_price": unit_price,
                        "eligible_for_coupon": is_eligible,
                    }
                )

        from apps.promotions.selectors import CouponSelector

        user_usage = CouponSelector.get_user_coupon_usage_count(coupon, request.user)
        remaining_eligibility = max(0, coupon.per_user_usage_limit - user_usage)

        min_order_met = cart_subtotal >= coupon.min_order_subtotal
        min_order_status = {
            "met": min_order_met,
            "required_amount": coupon.min_order_subtotal,
            "current_amount": cart_subtotal,
        }

        reason = "Coupon applied successfully."
        if not min_order_met:
            reason = (
                f"Coupon requires a minimum order of {coupon.min_order_subtotal:,.0f} Rial."
            )

        response_data = {
            "valid": True,
            "reason": reason,
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": coupon.discount_value,
            "max_discount_amount": coupon.max_discount_amount,
            "min_order_subtotal": coupon.min_order_subtotal,
            "discount_amount": estimated_discount,
            "estimated_discount": estimated_discount,
            "affected_items": affected_items,
            "min_order_status": min_order_status,
            "is_expired": False,
            "remaining_eligibility": remaining_eligibility,
        }

        return Response(
            CouponValidateResponseSerializer(response_data).data,
            status=status.HTTP_200_OK,
        )


class CartDiscountPreviewView(APIView):
    """Previews the full discount breakdown for the current cart."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Promotions"],
        operation_id="preview_cart_discounts",
        summary="Preview cart discount breakdown",
        description=(
            "Calculates and returns the full discount breakdown for the "
            "authenticated user's cart, including automatic promotions and "
            "an optional coupon code."
        ),
        request=CartDiscountPreviewRequestSerializer,
        responses={200: CartDiscountPreviewSerializer},
    )
    def post(self, request):
        input_serializer = CartDiscountPreviewRequestSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        coupon_code = input_serializer.validated_data.get("coupon_code")

        # Build cart items list
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response(
                CartDiscountPreviewSerializer(
                    {
                        "item_discounts": [],
                        "promotion_total": 0,
                        "coupon_discount": 0,
                        "coupon_id": None,
                        "coupon_code": None,
                        "subtotal_before_discounts": 0,
                        "subtotal_after_discounts": 0,
                        "total_discount": 0,
                    }
                ).data
            )

        cart_items_qs = CartItem.objects.select_related("product", "variant").filter(cart=cart)
        cart_items = []
        for item in cart_items_qs:
            unit_price = item.variant.final_price if item.variant else item.product.base_price
            cart_items.append(
                {
                    "product": item.product,
                    "variant": item.variant,
                    "quantity": item.quantity,
                    "unit_price": unit_price,
                }
            )

        if not cart_items:
            return Response(
                CartDiscountPreviewSerializer(
                    {
                        "item_discounts": [],
                        "promotion_total": 0,
                        "coupon_discount": 0,
                        "coupon_id": None,
                        "coupon_code": None,
                        "subtotal_before_discounts": 0,
                        "subtotal_after_discounts": 0,
                        "total_discount": 0,
                    }
                ).data
            )

        result = PromotionEngine.calculate_cart_discounts(
            cart_items=cart_items,
            coupon_code=coupon_code if coupon_code else None,
            user=request.user,
        )

        # Convert dataclass to serializable dict
        response_data = {
            "item_discounts": [
                {
                    "product_id": item.product_id,
                    "variant_id": item.variant_id,
                    "quantity": item.quantity,
                    "original_unit_price": item.original_unit_price,
                    "promotion_discount_per_unit": item.promotion_discount_per_unit,
                    "final_unit_price": item.final_unit_price,
                    "promotion_id": item.promotion_id,
                    "promotion_name": item.promotion_name,
                    "discount_type": item.discount_type,
                    "discount_value": item.discount_value,
                }
                for item in result.item_discounts
            ],
            "promotion_total": result.promotion_total,
            "coupon_discount": result.coupon_discount,
            "coupon_id": result.coupon_id,
            "coupon_code": result.coupon_code,
            "subtotal_before_discounts": result.subtotal_before_discounts,
            "subtotal_after_discounts": result.subtotal_after_discounts,
            "total_discount": result.total_discount,
        }

        return Response(
            CartDiscountPreviewSerializer(response_data).data,
            status=status.HTTP_200_OK,
        )
