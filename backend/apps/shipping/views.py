from decimal import Decimal
import uuid

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from .selectors import (
    get_available_shipping_quotes,
    get_shipment_by_order,
    get_shipment_by_tracking_code,
)
from .serializers import (
    ShipmentSerializer,
    ShipmentTrackingSerializer,
    ShippingCalculateRequestSerializer,
    ShippingQuoteSerializer,
)
from .services import calculate_shipping_for_order, get_or_create_default_shipping_methods


class ShippingMethodsListView(APIView):
    """
    List all active shipping methods with dynamic fee calculation based on destination & cart total.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="List shipping methods and quotes",
        description="Returns all active delivery methods with exact shipping costs calculated for destination and order subtotal.",
        parameters=[
            OpenApiParameter(name="province", type=str, location=OpenApiParameter.QUERY, required=False),
            OpenApiParameter(name="city", type=str, location=OpenApiParameter.QUERY, required=False),
            OpenApiParameter(name="subtotal", type=Decimal, location=OpenApiParameter.QUERY, required=False),
        ],
        responses={200: ShippingQuoteSerializer(many=True)},
        tags=["Shipping"],
    )
    def get(self, request):
        province = request.query_params.get("province")
        city = request.query_params.get("city")
        subtotal_raw = request.query_params.get("subtotal", "0")
        try:
            subtotal = Decimal(subtotal_raw)
        except Exception:
            subtotal = Decimal("0")

        # Ensure default methods exist if database is fresh
        get_or_create_default_shipping_methods()

        quotes = get_available_shipping_quotes(province=province, city=city, subtotal=subtotal)
        serializer = ShippingQuoteSerializer(quotes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ShippingCalculateView(APIView):
    """
    Calculate the exact shipping fee for a selected method and destination.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Calculate shipping quote",
        description="Calculates the authoritative shipping fee and free shipping eligibility.",
        request=ShippingCalculateRequestSerializer,
        responses={200: ShippingQuoteSerializer},
        tags=["Shipping"],
    )
    def post(self, request):
        serializer = ShippingCalculateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        method_id = serializer.validated_data.get("method_id")
        province = serializer.validated_data.get("province")
        city = serializer.validated_data.get("city")
        subtotal = serializer.validated_data.get("subtotal", Decimal("0"))

        method, fee = calculate_shipping_for_order(
            shipping_method_id=method_id,
            province=province,
            city=city,
            subtotal=subtotal,
        )

        quotes = get_available_shipping_quotes(province=province, city=city, subtotal=subtotal)
        matching_quote = next((q for q in quotes if q["method_id"] == str(method.id)), quotes[0])

        return Response(matching_quote, status=status.HTTP_200_OK)


class OrderShipmentDetailView(APIView):
    """
    Retrieve shipment details for an authenticated user's order.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get order shipment details",
        description="Returns detailed shipment status, tracking code, and carrier info for a customer order.",
        responses={200: ShipmentSerializer},
        tags=["Shipping"],
    )
    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            raise NotFound("Order not found.")

        # Object-level permission verification
        if order.user != request.user and not request.user.is_staff:
            raise PermissionDenied("You do not have permission to view this order's shipment.")

        shipment = get_shipment_by_order(order.id)
        if not shipment:
            raise NotFound("No shipment record exists for this order yet.")

        serializer = ShipmentSerializer(shipment)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ShipmentPublicTrackView(APIView):
    """
    Public shipment tracking endpoint using tracking code.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Track shipment publicly",
        description="Public tracking endpoint for checking courier delivery status by tracking code.",
        responses={200: ShipmentTrackingSerializer},
        tags=["Shipping"],
    )
    def get(self, request, tracking_code):
        shipment = get_shipment_by_tracking_code(tracking_code)
        if not shipment:
            raise NotFound("Shipment with specified tracking code was not found.")

        serializer = ShipmentTrackingSerializer(shipment)
        return Response(serializer.data, status=status.HTTP_200_OK)
