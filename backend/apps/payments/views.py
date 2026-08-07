from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Payment
from .permissions import IsPaymentOwner
from .selectors import PaymentSelector
from .serializers import CreatePaymentSerializer, PaymentSerializer
from .services import PaymentService


class PaymentsHealthCheckView(APIView):
    """Module health check endpoint."""
    def get(self, request):
        return Response({'module': 'payments', 'status': 'initialized'})


class PaymentListView(generics.ListAPIView):
    """Lists all Payments for the authenticated user's orders."""

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentSelector.get_user_payments(self.request.user)


class PaymentDetailView(generics.RetrieveAPIView):
    """Retrieves a single Payment record belonging to the authenticated user."""

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsPaymentOwner]

    def get_queryset(self):
        return PaymentSelector.get_user_payments(self.request.user)


class CreatePaymentView(APIView):
    """
    Initiates a mock payment for one of the authenticated user's eligible orders.

    The order must be in 'pending' status to be eligible.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = PaymentService.create_mock_payment(
            user=request.user,
            order_id=serializer.validated_data['order_id'],
        )

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)