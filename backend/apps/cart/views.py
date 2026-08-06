from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CartItem
from .selectors import CartSelector
from .serializers import (
    AddCartItemSerializer,
    CartSerializer,
    MergeCartSerializer,
    UpdateCartItemSerializer,
)
from .services import CartItemService, CartService


class CartView(APIView):
    """Returns the current Cart (authenticated user's or guest session's) with its items."""

    permission_classes = [AllowAny]

    def get(self, request):
        cart = CartService.get_or_create_cart_for_request(request)
        cart = CartSelector.get_cart_with_items(cart.id)
        return Response(CartSerializer(cart).data)


class CartItemListView(APIView):
    """Adds an item to the current Cart."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = CartService.get_or_create_cart_for_request(request)
        CartItemService.add_item(
            cart=cart,
            product_id=serializer.validated_data['product_id'],
            variant_id=serializer.validated_data.get('variant_id'),
            quantity=serializer.validated_data['quantity'],
        )

        cart = CartSelector.get_cart_with_items(cart.id)
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    """Updates the quantity of, or removes, a single Cart item belonging to the current Cart."""

    permission_classes = [AllowAny]

    def patch(self, request, item_id):
        cart = CartService.get_or_create_cart_for_request(request)
        cart_item = self._get_owned_item(cart, item_id)

        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        CartItemService.update_quantity(cart_item=cart_item, quantity=serializer.validated_data['quantity'])

        cart = CartSelector.get_cart_with_items(cart.id)
        return Response(CartSerializer(cart).data)

    def delete(self, request, item_id):
        cart = CartService.get_or_create_cart_for_request(request)
        cart_item = self._get_owned_item(cart, item_id)

        CartItemService.remove_item(cart_item=cart_item)

        cart = CartSelector.get_cart_with_items(cart.id)
        return Response(CartSerializer(cart).data)

    @staticmethod
    def _get_owned_item(cart, item_id) -> CartItem:
        try:
            return CartSelector.get_cart_item(cart, item_id)
        except CartItem.DoesNotExist:
            raise NotFound('Cart item not found.')


class MergeCartView(APIView):
    """Merges a guest session Cart into the authenticated user's Cart. Requires authentication."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MergeCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = CartService.merge_guest_cart(
            user=request.user, session_key=serializer.validated_data['session_key']
        )
        cart = CartSelector.get_cart_with_items(cart.id)
        return Response(CartSerializer(cart).data)