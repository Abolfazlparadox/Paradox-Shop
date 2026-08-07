from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from apps.products.models import Product, ProductVariant

from .models import Cart, CartItem


class CartService:
    """Business logic for retrieving and merging Shopping Carts."""

    @staticmethod
    def get_or_create_cart_for_request(request) -> Cart:
        """
        Returns the current Cart for the request: the authenticated user's cart, or a
        guest cart tied to the Django session, creating either one as needed.
        """
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=request.user)
            return cart

        if not request.session.session_key:
            request.session.save()

        cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
        return cart

    @staticmethod
    @transaction.atomic
    def merge_guest_cart(*, user, session_key: str) -> Cart:
        """
        Merges a guest session Cart into the authenticated user's Cart.
        Applies select_for_update on both carts and required variants to prevent
        race conditions with concurrent checkouts.
        """
        user_cart, _ = Cart.objects.get_or_create(user=user)
        user_cart = Cart.objects.select_for_update().get(pk=user_cart.pk)

        if not session_key:
            return user_cart

        guest_cart = Cart.objects.select_for_update().filter(session_key=session_key).first()

        if guest_cart is None or guest_cart.pk == user_cart.pk:
            return user_cart

        # Pre-fetch and lock required variants to ensure live stock data
        guest_items = list(guest_cart.items.select_related('product', 'variant').all())
        variant_ids = [item.variant_id for item in guest_items if item.variant_id is not None]

        locked_variants = {}
        if variant_ids:
            locked_variants = {
                v.id: v for v in ProductVariant.objects.select_for_update().filter(id__in=variant_ids)
            }

        for guest_item in guest_items:
            existing_item = CartItem.objects.filter(
                cart=user_cart, product=guest_item.product, variant=guest_item.variant
            ).first()

            if existing_item:
                new_quantity = existing_item.quantity + guest_item.quantity
                if guest_item.variant_id:
                    variant = locked_variants.get(guest_item.variant_id)
                    if variant:
                        new_quantity = min(new_quantity, variant.stock)
                existing_item.quantity = new_quantity
                existing_item.save(update_fields=['quantity'])
            else:
                guest_item.cart = user_cart
                guest_item.save(update_fields=['cart'])

        guest_cart.delete()
        return user_cart


class CartItemService:
    """Business logic for mutating Cart line items, including server-side stock validation."""

    @staticmethod
    @transaction.atomic
    def add_item(*, cart: Cart, product_id, variant_id=None, quantity: int) -> CartItem:
        if quantity < 1:
            raise ValidationError({'quantity': 'Quantity must be at least 1.'})

        # Lock the Cart row first to maintain a consistent lock hierarchy (Cart -> ProductVariant)
        cart = Cart.objects.select_for_update().get(pk=cart.pk)

        try:
            product = Product.objects.get(pk=product_id, is_active=True)
        except Product.DoesNotExist:
            raise NotFound('Product not found or is not available.')

        variant = None
        if variant_id:
            try:
                variant = ProductVariant.objects.select_for_update().get(
                    pk=variant_id, product=product, is_active=True
                )
            except ProductVariant.DoesNotExist:
                raise NotFound('Product variant not found or is not available.')

        existing_item = CartItem.objects.filter(cart=cart, product=product, variant=variant).first()
        requested_quantity = quantity + (existing_item.quantity if existing_item else 0)

        CartItemService._validate_stock(variant=variant, requested_quantity=requested_quantity)

        unit_price = variant.final_price if variant else product.base_price

        if existing_item:
            existing_item.quantity = requested_quantity
            existing_item.unit_price = unit_price
            existing_item.save(update_fields=['quantity', 'unit_price'])
            return existing_item

        return CartItem.objects.create(
            cart=cart,
            product=product,
            variant=variant,
            quantity=requested_quantity,
            unit_price=unit_price,
        )

    @staticmethod
    @transaction.atomic
    def update_quantity(*, cart_item: CartItem, quantity: int) -> CartItem:
        if quantity < 1:
            raise ValidationError({'quantity': 'Quantity must be at least 1. Remove the item instead.'})

        # Lock the parent Cart row first
        cart = Cart.objects.select_for_update().get(pk=cart_item.cart_id)

        if cart_item.variant_id:
            try:
                variant = ProductVariant.objects.select_for_update().get(
                    pk=cart_item.variant_id, product_id=cart_item.product_id, is_active=True
                )
            except ProductVariant.DoesNotExist:
                raise NotFound('Product variant is no longer available.')

            CartItemService._validate_stock(variant=variant, requested_quantity=quantity)
            cart_item.unit_price = variant.final_price
        else:
            cart_item.unit_price = cart_item.product.base_price

        cart_item.quantity = quantity
        cart_item.save(update_fields=['quantity', 'unit_price'])
        return cart_item

    @staticmethod
    @transaction.atomic
    def remove_item(*, cart_item: CartItem) -> None:
        # Lock the parent Cart row first
        cart = Cart.objects.select_for_update().get(pk=cart_item.cart_id)
        cart_item.delete()

    @staticmethod
    def _validate_stock(*, variant: ProductVariant | None, requested_quantity: int) -> None:
        if variant is None:
            return
        if requested_quantity > variant.stock:
            raise ValidationError({
                'quantity': f'Only {variant.stock} unit(s) of "{variant.name}" are currently in stock.'
            })