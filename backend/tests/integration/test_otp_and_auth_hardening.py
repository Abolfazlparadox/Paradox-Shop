import json
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

from apps.users.otp_service import OTPService

User = get_user_model()


@pytest.fixture(autouse=True)
def flush_redis_otp():
    """Flush Redis keys before and after each OTP test to ensure determinism."""
    try:
        r = OTPService.get_redis_client()
        r.flushdb()
    except Exception:
        pass
    yield
    try:
        r = OTPService.get_redis_client()
        r.flushdb()
    except Exception:
        pass


@pytest.mark.django_db
class TestEmailVerificationAndActivation:
    def test_registration_creates_inactive_user_with_redis_otp(self, api_client):
        url = reverse("api_v1:users:register")
        payload = {
            "email": "verify_me@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "first_name": "Reza",
            "last_name": "Karimi",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["requires_verification"] is True
        assert data["email"] == "verify_me@example.com"
        assert data["cooldown"] == 60
        assert data["ttl"] == 120

        # Verify DB state
        user = User.objects.get(email="verify_me@example.com")
        assert user.is_active is False
        assert user.profile.email_verified is False

        # Verify Redis state
        r = OTPService.get_redis_client()
        otp = r.get(f"otp:verify:{user.id}")
        assert otp is not None
        assert len(otp) == 6
        assert otp.isdigit()

    def test_login_blocked_before_email_verification(self, api_client, create_user):
        user = create_user(email="unverified@example.com", password="Password123!")
        user.is_active = False
        user.save()

        login_url = reverse("api_v1:users:login")
        response = api_client.post(
            login_url,
            {"email": "unverified@example.com", "password": "Password123!"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_verify_email_success_activates_user_and_issues_jwt(self, api_client, create_user):
        user = create_user(email="activate_me@example.com", password="Password123!")
        user.is_active = False
        user.profile.email_verified = False
        user.save()
        user.profile.save()

        r = OTPService.get_redis_client()
        r.setex(f"otp:verify:{user.id}", 120, "654321")

        verify_url = reverse("api_v1:users:verify-email")
        payload = {"email": "activate_me@example.com", "otp": "654321"}
        response = api_client.post(verify_url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access" in data
        assert "refresh" in data
        assert data["user"]["email"] == "activate_me@example.com"

        # Check DB activation
        user.refresh_from_db()
        assert user.is_active is True
        assert user.profile.email_verified is True

        # Check OTP removed from Redis
        assert r.get(f"otp:verify:{user.id}") is None

        # Verify subsequent login succeeds
        login_url = reverse("api_v1:users:login")
        login_resp = api_client.post(
            login_url,
            {"email": "activate_me@example.com", "password": "Password123!"},
            format="json",
        )
        assert login_resp.status_code == status.HTTP_200_OK

    def test_verify_email_invalid_otp_fails(self, api_client, create_user):
        user = create_user(email="invalid_otp@example.com", password="Password123!")
        user.is_active = False
        user.save()

        r = OTPService.get_redis_client()
        r.setex(f"otp:verify:{user.id}", 120, "111111")

        verify_url = reverse("api_v1:users:verify-email")
        payload = {"email": "invalid_otp@example.com", "otp": "999999"}
        response = api_client.post(verify_url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "otp" in data.get("error", {}).get("details", {}) or "otp" in data


@pytest.mark.django_db
class TestResendOTPAndRateLimiting:
    def test_resend_otp_success_and_cooldown(self, api_client, create_user):
        user = create_user(email="resend@example.com")
        user.is_active = False
        user.profile.email_verified = False
        user.save()
        user.profile.save()

        resend_url = reverse("api_v1:users:resend-otp")
        payload = {"email": "resend@example.com", "type": "verify"}

        # 1st request succeeds
        resp1 = api_client.post(resend_url, payload, format="json")
        assert resp1.status_code == status.HTTP_200_OK
        data1 = resp1.json()
        assert data1["cooldown"] == 60

        # 2nd request within cooldown fails
        resp2 = api_client.post(resend_url, payload, format="json")
        assert resp2.status_code == status.HTTP_400_BAD_REQUEST
        data2 = resp2.json()
        assert "seconds" in str(data2) or "detail" in data2

    def test_resend_otp_already_verified_fails(self, api_client, create_user):
        user = create_user(email="already_active@example.com")
        user.is_active = True
        user.profile.email_verified = True
        user.save()
        user.profile.save()

        resend_url = reverse("api_v1:users:resend-otp")
        payload = {"email": "already_active@example.com", "type": "verify"}
        response = api_client.post(resend_url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMobileVerification:
    def test_phone_verification_request_and_confirm_success(self, auth_client, create_user):
        user = create_user(email="phone_user@example.com")
        client = auth_client(user)

        # 1. Request verification
        req_url = reverse("api_v1:users:verify-phone")
        req_payload = {"phone_number": "09129998877"}
        req_resp = client.post(req_url, req_payload, format="json")
        assert req_resp.status_code == status.HTTP_200_OK
        assert "cooldown" in req_resp.json()

        # Retrieve generated OTP from Redis
        r = OTPService.get_redis_client()
        stored = r.get(f"otp:phone:{user.id}")
        assert stored is not None
        parsed = json.loads(stored)
        otp = parsed["otp"]
        assert parsed["phone_number"] == "09129998877"

        # 2. Confirm verification
        confirm_url = reverse("api_v1:users:confirm-phone")
        confirm_resp = client.post(confirm_url, {"otp": otp}, format="json")
        assert confirm_resp.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.phone_number == "09129998877"
        assert user.profile.phone_verified is True
        assert r.get(f"otp:phone:{user.id}") is None

    def test_phone_verification_wrong_otp_fails(self, auth_client, create_user):
        user = create_user()
        client = auth_client(user)

        r = OTPService.get_redis_client()
        payload = json.dumps({"otp": "555555", "phone_number": "09123334455"})
        r.setex(f"otp:phone:{user.id}", 120, payload)

        confirm_url = reverse("api_v1:users:confirm-phone")
        confirm_resp = client.post(confirm_url, {"otp": "000000"}, format="json")
        assert confirm_resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPasswordResetFlow:
    def test_password_reset_request_and_confirm_success(self, api_client, create_user):
        user = create_user(email="reset_me@example.com", password="OldPassword123!")

        # 1. Request Password Reset
        req_url = reverse("api_v1:users:password-reset-request")
        req_resp = api_client.post(req_url, {"email": "reset_me@example.com"}, format="json")
        assert req_resp.status_code == status.HTTP_200_OK

        r = OTPService.get_redis_client()
        otp = r.get(f"otp:reset:{user.id}")
        assert otp is not None

        # 2. Confirm Password Reset
        confirm_url = reverse("api_v1:users:password-reset-confirm")
        confirm_payload = {
            "email": "reset_me@example.com",
            "otp": otp,
            "new_password": "NewSecurePassword456!",
            "new_password_confirm": "NewSecurePassword456!",
        }
        confirm_resp = api_client.post(confirm_url, confirm_payload, format="json")
        assert confirm_resp.status_code == status.HTTP_200_OK

        # 3. Verify login with new password works
        login_url = reverse("api_v1:users:login")
        login_resp = api_client.post(
            login_url,
            {"email": "reset_me@example.com", "password": "NewSecurePassword456!"},
            format="json",
        )
        assert login_resp.status_code == status.HTTP_200_OK

        # 4. Old password fails
        old_login_resp = api_client.post(
            login_url,
            {"email": "reset_me@example.com", "password": "OldPassword123!"},
            format="json",
        )
        assert old_login_resp.status_code == status.HTTP_401_UNAUTHORIZED
