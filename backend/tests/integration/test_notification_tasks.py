from unittest.mock import patch

import pytest

from apps.orders.tasks import send_order_confirmation_email, send_order_status_notification
from apps.payments.tasks import send_payment_receipt_notification
from apps.users.otp_service import OTPService
from apps.users.services import UserService
from apps.users.tasks import send_welcome_email


@pytest.mark.django_db
class TestNotificationTasks:
    """Integration tests for asynchronous notification and email tasks."""

    def test_send_welcome_email_task_execution(self):
        """
        Verify that send_welcome_email runs smoothly and returns delivery confirmation.
        """
        result = send_welcome_email("test-user-id-123", "user@example.com", "John Doe")
        assert "Welcome email sent to user@example.com" in result
        assert "test-user-id-123" in result

    @pytest.mark.django_db(transaction=True)
    def test_user_registration_dispatches_welcome_email(self):
        """
        Verify that UserService.verify_email_otp queues the send_welcome_email Celery task
        safely with correct arguments on transaction commit once user email is verified.
        """
        with patch("apps.users.tasks.send_welcome_email.delay") as mock_delay:
            user, _, _ = UserService.register_user(
                email="new_member@example.com",
                password="SecurePassword123!",
                first_name="Jane",
                last_name="Doe",
            )
            # Retrieve OTP from Redis and verify email to trigger welcome email
            r = OTPService.get_redis_client()
            otp = r.get(f"otp:verify:{user.id}")
            UserService.verify_email_otp(email="new_member@example.com", otp=otp)

            mock_delay.assert_called_once_with(str(user.id), "new_member@example.com", "Jane Doe")

    def test_send_order_confirmation_email_task_execution(self):
        """
        Verify that send_order_confirmation_email executes successfully.
        """
        result = send_order_confirmation_email(
            "order-id-456", "buyer@example.com", "PDX-20260819-A1B2C3", "500000"
        )
        assert "Order confirmation sent for PDX-20260819-A1B2C3" in result
        assert "buyer@example.com" in result

    def test_send_order_status_notification_task_execution(self):
        """
        Verify that send_order_status_notification executes successfully.
        """
        result = send_order_status_notification(
            "order-id-789", "buyer@example.com", "PDX-20260819-A1B2C3", "shipped"
        )
        assert "Status update (shipped) sent for PDX-20260819-A1B2C3" in result

    def test_send_payment_receipt_notification_task_execution(self):
        """
        Verify that send_payment_receipt_notification executes successfully.
        """
        result = send_payment_receipt_notification(
            "payment-id-101",
            "payer@example.com",
            "PDX-20260819-A1B2C3",
            "500000",
            "MOCK-TXN-12345",
        )
        assert "Payment receipt sent for PDX-20260819-A1B2C3" in result
        assert "MOCK-TXN-12345" in result
