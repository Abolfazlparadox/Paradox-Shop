from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsOrderOwner
from .selectors import OrderSelector
from .serializers import CheckoutSerializer, OrderDetailSerializer, OrderListSerializer
from .services import OrderService


class OrdersHealthCheckView(APIView):
    """Module health check endpoint."""
    def get(self, request):
        return Response({'module': 'orders', 'status': 'initialized'})


class OrderListView(generics.ListAPIView):
    """Lists the authenticated user's orders, newest first."""

    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrderSelector.get_user_orders(self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    """Retrieves a single Order belonging to the authenticated user."""

    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated, IsOrderOwner]

    def get_object(self):
        """
        Enforce ownership at the DB query level by passing the authenticated
        user into the selector, which filters by both pk and user.
        """
        obj = OrderSelector.get_order_detail(
            order_id=self.kwargs[self.lookup_field],
            user=self.request.user,
        )
        self.check_object_permissions(self.request, obj)
        return obj


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
            address_id=serializer.validated_data['address_id'],
            notes=serializer.validated_data.get('notes'),
        )

        # Re-fetch with full relations for the response
        order = OrderSelector.get_order_detail(order.id, user=request.user)
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)