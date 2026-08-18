from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsPaymentOwner
from .selectors import PaymentSelector
from .serializers import CreatePaymentSerializer, PaymentSerializer
from .services import PaymentService


@extend_schema(tags=["Payments"])
class PaymentsHealthCheckView(APIView):
    """Module health check endpoint."""

    def get(self, request):
        return Response({"module": "payments", "status": "initialized"})


@extend_schema(tags=["Payments"])
class PaymentListView(generics.ListAPIView):
    """Lists all Payments for the authenticated user's orders."""

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentSelector.get_user_payments(self.request.user)


@extend_schema(tags=["Payments"])
class PaymentDetailView(generics.RetrieveAPIView):
    """Retrieves a single Payment record belonging to the authenticated user."""

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsPaymentOwner]

    def get_queryset(self):
        return PaymentSelector.get_user_payments(self.request.user)


@extend_schema(
    tags=["Payments"], request=CreatePaymentSerializer, responses={201: PaymentSerializer}
)
class CreatePaymentView(APIView):
    """
    Initiates a mock payment for one of the authenticated user's eligible orders.

    The order must be in 'pending' status to be eligible.
    Supports idempotency_key to safely prevent duplicate payment attempts.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = PaymentService.create_mock_payment(
            user=request.user,
            order_id=serializer.validated_data["order_id"],
            idempotency_key=serializer.validated_data.get("idempotency_key"),
        )

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
