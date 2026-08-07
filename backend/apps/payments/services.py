import uuid

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.orders.models import Order

from .models import Payment


class PaymentService:
    """Business logic for processing payments (currently mock/simulated)."""

    @staticmethod
    @transaction.atomic
    def create_mock_payment(*, user, order_id: uuid.UUID) -> Payment:
        """
        Creates a mock (simulated) payment for the given order.

        Workflow:
        1. Lock the order row and verify it belongs to the user.
        2. Verify the order is eligible for payment (status must be 'pending').
        3. Check for an existing non-failed payment to prevent duplicates.
        4. Create a Payment record with status 'pending'.
        5. Simulate gateway success: mark payment as 'succeeded'.
        6. Update order status to 'processing' and set paid_at timestamp.
        """
        # --- Step 1: Lock order and verify ownership ---
        try:
            order = Order.objects.select_for_update().get(pk=order_id, user=user)
        except Order.DoesNotExist:
            raise ValidationError({'order_id': 'Order not found or does not belong to this user.'})

        # --- Step 2: Verify order eligibility ---
        if order.status != Order.OrderStatus.PENDING:
            raise ValidationError(
                {'order': f'Order is in "{order.get_status_display()}" status and cannot be paid.'}
            )

        # --- Step 3: Check for existing active payment ---
        existing_payment = Payment.objects.filter(
            order=order,
            status__in=[
                Payment.PaymentStatus.PENDING,
                Payment.PaymentStatus.PROCESSING,
                Payment.PaymentStatus.SUCCEEDED,
            ],
        ).first()

        if existing_payment:
            if existing_payment.status == Payment.PaymentStatus.SUCCEEDED:
                raise ValidationError({'payment': 'This order has already been paid.'})
            # If there's a pending/processing payment, return it (idempotent)
            if existing_payment.status in (
                Payment.PaymentStatus.PENDING,
                Payment.PaymentStatus.PROCESSING,
            ):
                return existing_payment

        # --- Step 4: Create payment record ---
        payment = Payment(
            order=order,
            amount=order.total,
            status=Payment.PaymentStatus.PENDING,
            payment_method=Payment.PaymentMethod.ONLINE,
            gateway='mock',
            transaction_id=f'MOCK-TXN-{uuid.uuid4().hex[:12].upper()}',
            gateway_response={'simulated': True, 'message': 'Mock payment processed successfully.'},
        )
        payment.save()

        # --- Step 5: Simulate gateway success ---
        payment.status = Payment.PaymentStatus.SUCCEEDED
        payment.save(update_fields=['status'])

        # --- Step 6: Update order ---
        order.status = Order.OrderStatus.PROCESSING
        order.paid_at = timezone.now()
        order.save(update_fields=['status', 'paid_at'])

        return payment