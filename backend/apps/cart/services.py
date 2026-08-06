from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from apps.products.models import Product, ProductVariant

from .models import Cart, CartItem
from .selectors import CartSelector


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
        Matching line items (same product + variant) have their quantities summed and
        capped at available stock; non-matching items are moved over. The now-empty
        guest cart is deleted once merged.
        """
        guest_cart = CartSelector.get_session_cart(session_key)
        user_cart, _ = Cart.objects.get_or_create(user=user)

        if guest_cart is None or guest_cart.pk == user_cart.pk:
            return user_cart

        for guest_item in guest_cart.items.select_related('product', 'variant').all():
            existing_item = CartItem.objects.filter(
                cart=user_cart, product=guest_item.product, variant=guest_item.variant
            ).first()

            if existing_item:
                new_quantity = existing_item.quantity + guest_item.quantity
                if guest_item.variant is not None:
                    new_quantity = min(new_quantity, guest_item.variant.stock)
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
        """
        Adds `quantity` units of a product (optionally a specific variant) to the cart.
        If the same product/variant combination already exists in the cart, the
        quantities are summed. Price is always taken from the server, never the client.
        """
        if quantity < 1:
            raise ValidationError({'quantity': 'Quantity must be at least 1.'})

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
        """Updates a CartItem's quantity, re-validating stock and refreshing the price snapshot."""
        if quantity < 1:
            raise ValidationError({'quantity': 'Quantity must be at least 1. Remove the item instead.'})

        if cart_item.variant_id:
            variant = ProductVariant.objects.select_for_update().get(pk=cart_item.variant_id)
            CartItemService._validate_stock(variant=variant, requested_quantity=quantity)
            cart_item.unit_price = variant.final_price
        else:
            cart_item.unit_price = cart_item.product.base_price

        cart_item.quantity = quantity
        cart_item.save(update_fields=['quantity', 'unit_price'])
        return cart_item

    @staticmethod
    def remove_item(*, cart_item: CartItem) -> None:
        """Removes a line item from the cart entirely."""
        cart_item.delete()

    @staticmethod
    def _validate_stock(*, variant: ProductVariant | None, requested_quantity: int) -> None:
        """
        Validates the requested quantity against variant stock.

        NOTE: Products without a variant have no stock field in the current schema
        (stock is only tracked on ProductVariant), so quantity is not stock-limited
        for those line items.
        """
        if variant is None:
            return
        if requested_quantity > variant.stock:
            raise ValidationError({
                'quantity': f'Only {variant.stock} unit(s) of "{variant.name}" are currently in stock.'
            })