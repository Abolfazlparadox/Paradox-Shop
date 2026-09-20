import logging
import uuid

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.orders.models import Order

from .models import Payment
from .tasks import send_payment_receipt_notification

logger = logging.getLogger(__name__)


class PaymentService:
    """Business logic for processing payments (currently mock/simulated)."""

    @staticmethod
    @transaction.atomic
    def create_mock_payment(
        *, user, order_id: uuid.UUID, idempotency_key: str | None = None
    ) -> Payment:
        """
        Creates a mock (simulated) payment for the given order.

        Workflow:
        1. Check idempotency key if provided.
        2. Lock the order row and verify it belongs to the user.
        3. Verify the order is eligible for payment (status must be 'pending').
        4. Check for an existing non-failed payment to prevent duplicates.
        5. Create a Payment record with status 'pending'.
        6. Simulate gateway success: mark payment as 'succeeded'.
        7. Update order status to 'processing' and set paid_at timestamp.
        8. Dispatch background notification task.
        """
        # --- Check Idempotency Key ---
        if idempotency_key:
            existing_by_key = Payment.objects.filter(idempotency_key=idempotency_key).first()
            if existing_by_key:
                if existing_by_key.order.user != user:
                    raise ValidationError(
                        {"idempotency_key": "Idempotency key belongs to another user."}
                    )
                return existing_by_key

        # --- Step 1: Lock order and verify ownership ---
        try:
            order = Order.objects.select_for_update().get(pk=order_id, user=user)
        except Order.DoesNotExist:
            raise ValidationError({"order_id": "Order not found or does not belong to this user."})

        # --- Step 2: Verify order eligibility ---
        if order.status != Order.OrderStatus.PENDING:
            raise ValidationError(
                {"order": f'Order is in "{order.get_status_display()}" status and cannot be paid.'}
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
                raise ValidationError({"payment": "This order has already been paid."})
            # If there's a pending/processing payment, return it (idempotent)
            if existing_payment.status in (
                Payment.PaymentStatus.PENDING,
                Payment.PaymentStatus.PROCESSING,
            ):
                return existing_payment

        # --- Step 4: Create payment record ---
        transaction_id = f"MOCK-TXN-{uuid.uuid4().hex[:12].upper()}"
        payment = Payment(
            order=order,
            amount=order.total,
            status=Payment.PaymentStatus.PENDING,
            payment_method=Payment.PaymentMethod.ONLINE,
            gateway="mock",
            transaction_id=transaction_id,
            idempotency_key=idempotency_key,
            gateway_response={"simulated": True, "message": "Mock payment processed successfully."},
        )
        payment.save()

        # --- Step 5: Simulate gateway success ---
        payment.status = Payment.PaymentStatus.SUCCEEDED
        payment.save(update_fields=["status"])

        # --- Step 6: Update order ---
        order.status = Order.OrderStatus.PROCESSING
        order.paid_at = timezone.now()
        order.save(update_fields=["status", "paid_at"])

        logger.info(
            "Mock payment processed successfully: payment_id=%s order_id=%s txn=%s amount=%s",
            payment.id,
            order.id,
            transaction_id,
            payment.amount,
        )

        # --- Step 7: Queue background notification safely after transaction commits ---
        payment_id_str = str(payment.id)
        user_email = user.email
        order_num = order.order_number
        amount_str = str(payment.amount)
        transaction.on_commit(
            lambda: send_payment_receipt_notification.delay(
                payment_id_str, user_email, order_num, amount_str, transaction_id
            )
        )

        return payment
