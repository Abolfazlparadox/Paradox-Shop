from django.http import Http404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order
from .permissions import IsOrderOwner
from .selectors import OrderSelector
from .serializers import CheckoutSerializer, OrderDetailSerializer, OrderListSerializer
from .services import OrderService


@extend_schema(tags=["Orders"])
class OrdersHealthCheckView(APIView):
    """Module health check endpoint."""

    def get(self, request):
        return Response({"module": "orders", "status": "initialized"})


@extend_schema(tags=["Orders"])
class OrderListView(generics.ListAPIView):
    """Lists the authenticated user's orders, newest first."""

    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrderSelector.get_user_orders(self.request.user)


@extend_schema(tags=["Orders"])
class OrderDetailView(generics.RetrieveAPIView):
    """Retrieves a single Order belonging to the authenticated user."""

    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated, IsOrderOwner]

    def get_object(self):
        try:
            obj = OrderSelector.get_order_detail(
                order_id=self.kwargs[self.lookup_field],
                user=self.request.user,
            )
        except Order.DoesNotExist:
            raise Http404("Order not found or does not belong to you.")

        self.check_object_permissions(self.request, obj)
        return obj


@extend_schema(tags=["Orders"], request=CheckoutSerializer, responses={201: OrderDetailSerializer})
class CheckoutView(APIView):
    """
    Initiates checkout from the authenticated user's current cart.

    Validates:
    - Cart is not empty
    - Address belongs to the user
    - Sufficient stock for all variants

    Creates Order, OrderItems, OrderAddress, decrements stock, clears cart — all atomically.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = OrderService.create_order_from_cart(
            user=request.user,
            address_id=serializer.validated_data["address_id"],
            shipping_method_id=serializer.validated_data.get("shipping_method_id"),
            notes=serializer.validated_data.get("notes"),
            coupon_code=serializer.validated_data.get("coupon_code"),
        )

        # Re-fetch with full relations for the response
        order = OrderSelector.get_order_detail(order.id, user=request.user)
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Orders"], responses={200: OrderDetailSerializer})
class CancelOrderView(APIView):
    """
    Cancels a pending or processing Order belonging to the authenticated user and restores stock.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = OrderService.cancel_order(
            user=request.user,
            order_id=pk,
        )
        order = OrderSelector.get_order_detail(order.id, user=request.user)
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_200_OK)
