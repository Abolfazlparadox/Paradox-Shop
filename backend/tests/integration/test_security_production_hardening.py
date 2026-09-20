import importlib
import json
import logging
from unittest.mock import patch

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

import apps.users.otp_service as otp_module
from apps.users.otp_service import OTPService
from common.exceptions import custom_exception_handler
from common.logging import SensitiveDataFilter

User = get_user_model()


from django.core.cache import cache


@pytest.fixture(autouse=True)
def flush_redis_security():
    """Flush Redis keys and Django cache before and after each security test."""
    try:
        cache.clear()
        r = OTPService.get_redis_client()
        r.flushdb()
    except Exception:
        pass
    yield
    try:
        cache.clear()
        r = OTPService.get_redis_client()
        r.flushdb()
    except Exception:
        pass


@pytest.mark.django_db
class TestProductionSettingsAndHardening:
    """Verifies production settings integrity, CORS lockdown, and security invariants."""

    def test_base_settings_cors_and_upload_limits(self):
        from config.settings import base

        assert base.CORS_ALLOW_ALL_ORIGINS is False
        assert base.CORS_ALLOW_CREDENTIALS is True
        assert base.DATA_UPLOAD_MAX_MEMORY_SIZE == 10 * 1024 * 1024
        assert base.FILE_UPLOAD_MAX_MEMORY_SIZE == 10 * 1024 * 1024
        assert base.SESSION_COOKIE_HTTPONLY is True

    def test_production_settings_requires_strong_secret_key(self):
        with patch.dict("os.environ", {"DJANGO_SECRET_KEY": "default-unsecure-key-123", "DJANGO_DEBUG": "False"}):
            with pytest.raises(ImproperlyConfigured, match="DJANGO_SECRET_KEY"):
                import config.settings.base as base
                import config.settings.production as prod
                importlib.reload(base)
                importlib.reload(prod)

    def test_production_settings_rejects_wildcard_allowed_hosts(self):
        with patch.dict(
            "os.environ",
            {
                "DJANGO_SECRET_KEY": "super-strong-and-cryptographically-random-secret-key-prod-987",
                "DJANGO_ALLOWED_HOSTS": "*",
                "DJANGO_DEBUG": "False",
            },
        ):
            with pytest.raises(ImproperlyConfigured, match="Wildcard"):
                import config.settings.base as base
                import config.settings.production as prod
                importlib.reload(base)
                importlib.reload(prod)

    def test_production_security_headers_and_ssl(self):
        with patch.dict(
            "os.environ",
            {
                "DJANGO_SECRET_KEY": "super-strong-and-cryptographically-random-secret-key-prod-987",
                "DJANGO_ALLOWED_HOSTS": "api.paradoxshop.com",
                "DJANGO_DEBUG": "False",
            },
        ):
            import config.settings.base as base
            import config.settings.production as prod
            importlib.reload(base)
            importlib.reload(prod)

            assert prod.DEBUG is False
            assert prod.CORS_ALLOW_ALL_ORIGINS is False
            assert prod.SESSION_COOKIE_SECURE is True
            assert prod.CSRF_COOKIE_SECURE is True
            assert prod.SESSION_COOKIE_HTTPONLY is True
            assert prod.X_FRAME_OPTIONS == "DENY"
            assert prod.SECURE_CONTENT_TYPE_NOSNIFF is True
            assert prod.SECURE_HSTS_SECONDS >= 31536000
            assert prod.SECURE_HSTS_INCLUDE_SUBDOMAINS is True
            assert prod.SECURE_HSTS_PRELOAD is True


@pytest.mark.django_db
class TestOTPBruteForceProtection:
    """Verifies that OTP verification locks out after MAX_VERIFY_ATTEMPTS failed tries."""

    def test_email_otp_brute_force_lockout(self, api_client, create_user):
        user = create_user(email="bruteforce@example.com", password="Password123!")
        user.is_active = False
        user.save()

        r = OTPService.get_redis_client()
        r.setex(f"otp:verify:{user.id}", 120, "123456")

        verify_url = reverse("api_v1:users:verify-email")

        # 4 incorrect attempts: each should fail with standard 400 invalid code
        for attempt in range(1, 5):
            res = api_client.post(verify_url, {"email": user.email, "otp": "000000"}, format="json")
            assert res.status_code == status.HTTP_400_BAD_REQUEST

        # Verify key still exists before 5th attempt
        assert r.get(f"otp:verify:{user.id}") == "123456"

        # 5th attempt triggers lockout
        res5 = api_client.post(verify_url, {"email": user.email, "otp": "000000"}, format="json")
        assert res5.status_code == status.HTTP_400_BAD_REQUEST
        data5 = res5.json()
        assert "invalidated" in str(data5).lower() or "too many" in str(data5).lower()

        # Crucial: OTP must now be deleted from Redis
        assert r.get(f"otp:verify:{user.id}") is None

        # Subsequent attempt with the previously *correct* code now fails because OTP is erased
        res_after = api_client.post(verify_url, {"email": user.email, "otp": "123456"}, format="json")
        assert res_after.status_code == status.HTTP_400_BAD_REQUEST
        user.refresh_from_db()
        assert user.is_active is False

    def test_password_reset_otp_brute_force_lockout(self, api_client, create_user):
        user = create_user(email="reset_target@example.com", password="OriginalPassword123!")
        r = OTPService.get_redis_client()
        r.setex(f"otp:reset:{user.id}", 120, "888888")

        confirm_url = reverse("api_v1:users:password-reset-confirm")

        for _ in range(4):
            res = api_client.post(
                confirm_url,
                {
                    "email": user.email,
                    "otp": "111111",
                    "new_password": "NewPassword123!",
                    "new_password_confirm": "NewPassword123!",
                },
                format="json",
            )
            assert res.status_code == status.HTTP_400_BAD_REQUEST

        # 5th attempt triggers lockout and invalidation
        res5 = api_client.post(
            confirm_url,
            {
                "email": user.email,
                "otp": "111111",
                "new_password": "NewPassword123!",
                "new_password_confirm": "NewPassword123!",
            },
            format="json",
        )
        assert res5.status_code == status.HTTP_400_BAD_REQUEST
        assert r.get(f"otp:reset:{user.id}") is None

    def test_successful_otp_cleans_up_attempts_and_otp(self, api_client, create_user):
        user = create_user(email="clean_otp@example.com", password="Password123!")
        user.is_active = False
        user.save()

        r = OTPService.get_redis_client()
        r.setex(f"otp:verify:{user.id}", 120, "456789")

        verify_url = reverse("api_v1:users:verify-email")

        # 2 wrong attempts
        api_client.post(verify_url, {"email": user.email, "otp": "000000"}, format="json")
        api_client.post(verify_url, {"email": user.email, "otp": "000000"}, format="json")
        assert r.get(f"otp:attempts:verify:{user.id}") == "2"

        # 3rd attempt is correct
        success_res = api_client.post(verify_url, {"email": user.email, "otp": "456789"}, format="json")
        assert success_res.status_code == status.HTTP_200_OK

        # Both keys must be erased
        assert r.get(f"otp:verify:{user.id}") is None
        assert r.get(f"otp:attempts:verify:{user.id}") is None


@pytest.mark.django_db
class TestInformationDisclosureAndLeakPrevention:
    """Verifies that sensitive data, stack traces, and user enumeration are prevented."""

    def test_password_reset_user_enumeration_prevention(self, api_client, create_user):
        create_user(email="registered@example.com")
        url = reverse("api_v1:users:password-reset-request")

        # 1. Existing user
        res_exists = api_client.post(url, {"email": "registered@example.com"}, format="json")
        assert res_exists.status_code == status.HTTP_200_OK
        data_exists = res_exists.json()

        # 2. Non-existent user
        res_nonexists = api_client.post(url, {"email": "nonexistent_victim@example.com"}, format="json")
        assert res_nonexists.status_code == status.HTTP_200_OK
        data_nonexists = res_nonexists.json()

        # Invariant: Response codes, detail messages, cooldown, and TTL must match identically
        assert data_exists["detail"] == data_nonexists["detail"]
        assert data_exists["cooldown"] == data_nonexists["cooldown"]
        assert data_exists["ttl"] == data_nonexists["ttl"]

    def test_sensitive_data_filter_redacts_credentials(self):
        log_filter = SensitiveDataFilter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname=__file__,
            lineno=10,
            msg={"password": "MySuperSecretPassword", "refresh_token": "jwt_secret_token", "normal_field": "public"},
            args=(),
            exc_info=None,
        )
        assert log_filter.filter(record) is True
        assert record.msg["password"] == "***REDACTED***"
        assert record.msg["refresh_token"] == "***REDACTED***"
        assert record.msg["normal_field"] == "public"

    def test_custom_exception_handler_sanitizes_500_errors(self):
        class SimulatedCriticalDbError(Exception):
            pass

        response = custom_exception_handler(SimulatedCriticalDbError("FATAL: password authentication failed for user"), {})
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.data
        assert "error" in data
        assert data["error"]["code"] == "InternalServerError"
        assert "password" not in data["error"]["message"].lower()
        assert "FATAL" not in data["error"]["message"]
        assert data["error"]["details"] is None

    def test_otp_logging_conceals_code_in_production(self):
        with patch.object(settings, "DEBUG", False):
            with patch.object(otp_module.logger, "info") as mock_info:
                OTPService._log_otp_to_console(
                    title="Security Test Code",
                    target="user@example.com",
                    user_id="test-uuid",
                    otp="999888",
                    ttl=120,
                )
                assert mock_info.called
                args, _ = mock_info.call_args
                logged_msg = args[0] % args[1:]
                assert "999888" not in logged_msg
                assert "Security Test Code" in logged_msg


@pytest.mark.django_db
class TestRBACAndAdminClearance:
    """Verifies RBAC protection on administrative endpoints and token revocation."""

    def test_unauthenticated_user_blocked_from_admin_dashboard(self, api_client):
        url = reverse("api_v1:admin:dashboard")
        res = api_client.get(url)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_regular_customer_blocked_from_admin_dashboard(self, auth_client, create_user):
        customer = create_user(email="customer@example.com", is_staff=False, is_superuser=False)
        client = auth_client(customer)
        url = reverse("api_v1:admin:dashboard")
        res = client.get(url)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_admin_can_access_admin_dashboard(self, auth_client, create_user):
        admin_user = create_user(email="admin_staff@example.com", is_staff=True, is_superuser=False)
        client = auth_client(admin_user)
        url = reverse("api_v1:admin:dashboard")
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK

    def test_logout_revokes_refresh_token_and_blocks_reuse(self, auth_client, create_user, api_client):
        user = create_user(email="logout_test@example.com")
        refresh = RefreshToken.for_user(user)
        refresh_str = str(refresh)
        client = auth_client(user)

        # 1. Logout
        logout_url = reverse("api_v1:users:logout")
        res = client.post(logout_url, {"refresh": refresh_str}, format="json")
        assert res.status_code == status.HTTP_200_OK

        # 2. Reusing blacklisted token to refresh access token must fail
        refresh_url = reverse("api_v1:users:login-refresh")
        refresh_res = api_client.post(refresh_url, {"refresh": refresh_str}, format="json")
        assert refresh_res.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestFileUploadHardening:
    """Verifies image upload security controls and input rejection."""

    def test_reject_disallowed_extension(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.reviews.services import validate_image_file
        from rest_framework.exceptions import ValidationError

        file = SimpleUploadedFile("malicious.php", b"<?php echo 'fail'; ?>", content_type="application/x-php")
        with pytest.raises(ValidationError, match="not permitted"):
            validate_image_file(file)

    def test_reject_oversized_dimensions(self):
        import io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.reviews.services import validate_image_file
        from rest_framework.exceptions import ValidationError

        img_io = io.BytesIO()
        img = Image.new("RGB", (5000, 100), color="red")
        img.save(img_io, format="JPEG")
        img_io.seek(0)

        file = SimpleUploadedFile("oversized.jpg", img_io.getvalue(), content_type="image/jpeg")
        with pytest.raises(ValidationError, match="exceed maximum"):
            validate_image_file(file)

    def test_accept_valid_image(self):
        import io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.reviews.services import validate_image_file

        img_io = io.BytesIO()
        img = Image.new("RGB", (800, 600), color="blue")
        img.save(img_io, format="JPEG")
        img_io.seek(0)

        file = SimpleUploadedFile("valid.jpg", img_io.getvalue(), content_type="image/jpeg")
        validate_image_file(file)


@pytest.mark.django_db
class TestIDORAndHorizontalEscalation:
    """Verifies that authenticated users cannot access or tamper with other users' resources."""

    def test_user_cannot_access_another_users_order(self, auth_client, create_user):
        user_a = create_user(email="victim_order@example.com")
        user_b = create_user(email="attacker_order@example.com")

        from apps.orders.models import Order
        order = Order.objects.create(
            user=user_a,
            order_number="ORD-SEC-001",
            subtotal=100000,
            total=100000,
            status=Order.OrderStatus.PENDING,
        )

        client_b = auth_client(user_b)
        url = reverse("api_v1:orders:detail", kwargs={"pk": order.id})
        res = client_b.get(url)
        assert res.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

    def test_user_cannot_access_another_users_payment(self, auth_client, create_user):
        user_a = create_user(email="victim_payment@example.com")
        user_b = create_user(email="attacker_payment@example.com")

        from apps.orders.models import Order
        from apps.payments.models import Payment
        order = Order.objects.create(
            user=user_a,
            order_number="ORD-SEC-002",
            subtotal=200000,
            total=200000,
            status=Order.OrderStatus.PENDING,
        )
        payment = Payment.objects.create(
            order=order,
            amount=200000,
            status=Payment.PaymentStatus.PENDING,
        )

        client_b = auth_client(user_b)
        url = reverse("api_v1:payments:detail", kwargs={"pk": payment.id})
        res = client_b.get(url)
        assert res.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

    def test_user_cannot_modify_another_users_address(self, auth_client, create_user):
        user_a = create_user(email="victim_address@example.com")
        user_b = create_user(email="attacker_address@example.com")

        from apps.users.models import Address
        address = Address.objects.create(
            user=user_a,
            title="Victim Home",
            recipient_name="Victim",
            recipient_phone="09121111111",
            province="Tehran",
            city="Tehran",
            postal_code="1234567890",
            address_line="Secret Address Line",
        )

        client_b = auth_client(user_b)
        url = reverse("api_v1:users:address-detail", kwargs={"pk": address.id})
        res = client_b.patch(url, {"title": "Hacked Title"}, format="json")
        assert res.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)
        address.refresh_from_db()
        assert address.title == "Victim Home"
