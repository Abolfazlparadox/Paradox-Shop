import json
import logging
import secrets
from typing import Optional, Tuple

import redis
from django.conf import settings
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


class OTPService:
    """
    Centralized service for generating, storing, verifying, and rate-limiting
    6-digit OTP codes backed by Redis with brute-force lockout protection.
    """

    OTP_TTL_SECONDS = 120
    COOLDOWN_SECONDS = 60
    MAX_HOURLY_REQUESTS = 5
    HOURLY_WINDOW_SECONDS = 3600
    MAX_VERIFY_ATTEMPTS = 5

    @classmethod
    def get_redis_client(cls) -> redis.Redis:
        """Returns an active, decoded Redis connection client."""
        return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

    @staticmethod
    def generate_otp_code() -> str:
        """Generates a cryptographically secure 6-digit numeric OTP."""
        return f"{secrets.randbelow(900000) + 100000:06d}"

    @classmethod
    def _check_rate_limits(
        cls, r: redis.Redis, identifier: str, otp_type: str, client_ip: Optional[str]
    ) -> None:
        """
        Enforces:
        1. 1 request per 60 seconds per target identifier (cooldown)
        2. Maximum 5 requests per hour per IP address
        """
        # 1. Check Cooldown
        cooldown_key = f"otp:cooldown:{otp_type}:{identifier}"
        remaining_cooldown = r.ttl(cooldown_key)
        if remaining_cooldown > 0:
            raise ValidationError(
                {
                    "detail": f"Please wait {remaining_cooldown} seconds before requesting a new code.",
                    "retry_after": remaining_cooldown,
                }
            )

        # 2. Check Hourly IP Rate Limit
        if client_ip:
            ip_key = f"otp:ratelimit:{client_ip}"
            ip_requests = r.get(ip_key)
            if ip_requests and int(ip_requests) >= cls.MAX_HOURLY_REQUESTS:
                ttl = r.ttl(ip_key)
                raise ValidationError(
                    {
                        "detail": f"Hourly OTP request limit reached for your network. Please retry in {ttl // 60} minutes.",
                        "retry_after": ttl,
                    }
                )

    @classmethod
    def _apply_rate_limits(
        cls, r: redis.Redis, identifier: str, otp_type: str, client_ip: Optional[str]
    ) -> None:
        """Applies cooldown and increments IP rate limit counter."""
        cooldown_key = f"otp:cooldown:{otp_type}:{identifier}"
        r.setex(cooldown_key, cls.COOLDOWN_SECONDS, "1")

        if client_ip:
            ip_key = f"otp:ratelimit:{client_ip}"
            pipeline = r.pipeline()
            pipeline.incr(ip_key)
            pipeline.ttl(ip_key)
            results = pipeline.execute()
            current_ttl = results[1]
            if current_ttl < 0:
                r.expire(ip_key, cls.HOURLY_WINDOW_SECONDS)

    @classmethod
    def _record_failed_attempt(cls, r: redis.Redis, attempt_key: str, otp_key: str) -> None:
        """
        Records a failed OTP verification attempt.
        If failed attempts reach or exceed MAX_VERIFY_ATTEMPTS, deletes the active OTP
        to prevent brute force discovery and raises a ValidationError lockout.
        """
        attempts = r.incr(attempt_key)
        if attempts == 1:
            otp_ttl = r.ttl(otp_key)
            ttl = otp_ttl if otp_ttl > 0 else cls.OTP_TTL_SECONDS
            r.expire(attempt_key, ttl)

        if attempts >= cls.MAX_VERIFY_ATTEMPTS:
            r.delete(otp_key)
            r.delete(attempt_key)
            logger.warning(
                "Security Alert: OTP invalidated due to %s failed verification attempts on %s",
                attempts,
                otp_key,
            )
            raise ValidationError(
                {
                    "otp": "Too many invalid verification attempts. This code has been invalidated for your security. Please request a new one."
                }
            )

    @staticmethod
    def _log_otp_to_console(
        title: str, target: str, user_id: str, otp: str, ttl: int = 120
    ) -> None:
        """
        Logs OTP dispatch. In DEBUG mode, outputs the code for local dev/testing.
        In production, conceals the code to prevent credential leakage in logs.
        """
        if getattr(settings, "DEBUG", False):
            border = "=" * 74
            msg = (
                f"\n{border}\n"
                f" [MOCK OTP SERVICE] {title}\n"
                f" Target: {target} | User ID: {user_id}\n"
                f" OTP Code: [ {otp} ] (Valid for {ttl}s)\n"
                f"{border}\n"
            )
            print(msg, flush=True)
            logger.info("[MOCK OTP] %s for %s (%s): %s", title, target, user_id, otp)
        else:
            logger.info(
                "[OTP SERVICE] Dispatched %s to target %s (User ID: %s, TTL: %ss)",
                title,
                target,
                user_id,
                ttl,
            )

    # -------------------------------------------------------------------------
    # 1. Email Verification OTP
    # -------------------------------------------------------------------------
    @classmethod
    def send_email_verification_otp(
        cls, user, client_ip: Optional[str] = None
    ) -> Tuple[str, int, int]:
        """
        Generates and stores an email verification OTP for the user.
        Resets any previous failed attempt counter.
        Returns (otp, cooldown_seconds, ttl_seconds).
        """
        r = cls.get_redis_client()
        user_id_str = str(user.id)
        cls._check_rate_limits(r, user_id_str, "verify", client_ip)

        otp = cls.generate_otp_code()
        verify_key = f"otp:verify:{user_id_str}"
        attempt_key = f"otp:attempts:verify:{user_id_str}"

        r.setex(verify_key, cls.OTP_TTL_SECONDS, otp)
        r.delete(attempt_key)

        cls._apply_rate_limits(r, user_id_str, "verify", client_ip)
        cls._log_otp_to_console(
            title="Email Verification Code",
            target=user.email,
            user_id=user_id_str,
            otp=otp,
            ttl=cls.OTP_TTL_SECONDS,
        )
        return otp, cls.COOLDOWN_SECONDS, cls.OTP_TTL_SECONDS

    @classmethod
    def verify_email_otp(cls, user, otp: str) -> bool:
        """
        Validates the email verification OTP.
        Clears OTP and attempt counter upon success; tracks failed attempts and locks out if exceeded.
        """
        r = cls.get_redis_client()
        user_id_str = str(user.id)
        verify_key = f"otp:verify:{user_id_str}"
        attempt_key = f"otp:attempts:verify:{user_id_str}"
        stored_otp = r.get(verify_key)

        if not stored_otp:
            return False

        if stored_otp != otp.strip():
            cls._record_failed_attempt(r, attempt_key, verify_key)
            return False

        r.delete(verify_key)
        r.delete(attempt_key)
        return True

    # -------------------------------------------------------------------------
    # 2. Phone / Mobile Verification OTP
    # -------------------------------------------------------------------------
    @classmethod
    def send_phone_verification_otp(
        cls, user, phone_number: str, client_ip: Optional[str] = None
    ) -> Tuple[str, int, int]:
        """
        Generates and stores a phone verification OTP and target phone number.
        Resets any previous failed attempt counter.
        Returns (otp, cooldown_seconds, ttl_seconds).
        """
        r = cls.get_redis_client()
        user_id_str = str(user.id)
        cls._check_rate_limits(r, user_id_str, "phone", client_ip)

        otp = cls.generate_otp_code()
        phone_key = f"otp:phone:{user_id_str}"
        attempt_key = f"otp:attempts:phone:{user_id_str}"
        payload = json.dumps({"otp": otp, "phone_number": phone_number.strip()})

        r.setex(phone_key, cls.OTP_TTL_SECONDS, payload)
        r.delete(attempt_key)

        cls._apply_rate_limits(r, user_id_str, "phone", client_ip)
        cls._log_otp_to_console(
            title="Mobile SMS Verification Code",
            target=phone_number,
            user_id=user_id_str,
            otp=otp,
            ttl=cls.OTP_TTL_SECONDS,
        )
        return otp, cls.COOLDOWN_SECONDS, cls.OTP_TTL_SECONDS

    @classmethod
    def verify_phone_otp(cls, user, otp: str) -> Tuple[bool, Optional[str]]:
        """
        Validates the mobile OTP.
        Returns (is_valid, verified_phone_number).
        Tracks failed attempts and locks out if exceeded.
        """
        r = cls.get_redis_client()
        user_id_str = str(user.id)
        phone_key = f"otp:phone:{user_id_str}"
        attempt_key = f"otp:attempts:phone:{user_id_str}"
        data = r.get(phone_key)

        if not data:
            return False, None

        try:
            parsed = json.loads(data)
            stored_otp = parsed.get("otp")
            phone_number = parsed.get("phone_number")
            if stored_otp != otp.strip():
                cls._record_failed_attempt(r, attempt_key, phone_key)
                return False, None

            r.delete(phone_key)
            r.delete(attempt_key)
            return True, phone_number
        except ValidationError:
            raise
        except Exception:
            return False, None

    # -------------------------------------------------------------------------
    # 3. Password Reset OTP
    # -------------------------------------------------------------------------
    @classmethod
    def send_password_reset_otp(
        cls, user, client_ip: Optional[str] = None
    ) -> Tuple[str, int, int]:
        """
        Generates and stores a password reset OTP for the user.
        Resets any previous failed attempt counter.
        Returns (otp, cooldown_seconds, ttl_seconds).
        """
        r = cls.get_redis_client()
        user_id_str = str(user.id)
        cls._check_rate_limits(r, user_id_str, "reset", client_ip)

        otp = cls.generate_otp_code()
        reset_key = f"otp:reset:{user_id_str}"
        attempt_key = f"otp:attempts:reset:{user_id_str}"

        r.setex(reset_key, cls.OTP_TTL_SECONDS, otp)
        r.delete(attempt_key)

        cls._apply_rate_limits(r, user_id_str, "reset", client_ip)
        cls._log_otp_to_console(
            title="Password Reset Code",
            target=user.email,
            user_id=user_id_str,
            otp=otp,
            ttl=cls.OTP_TTL_SECONDS,
        )
        return otp, cls.COOLDOWN_SECONDS, cls.OTP_TTL_SECONDS

    @classmethod
    def verify_password_reset_otp(cls, user, otp: str) -> bool:
        """
        Validates the password reset OTP and removes it upon success.
        Tracks failed attempts and locks out if exceeded.
        """
        r = cls.get_redis_client()
        user_id_str = str(user.id)
        reset_key = f"otp:reset:{user_id_str}"
        attempt_key = f"otp:attempts:reset:{user_id_str}"
        stored_otp = r.get(reset_key)

        if not stored_otp:
            return False

        if stored_otp != otp.strip():
            cls._record_failed_attempt(r, attempt_key, reset_key)
            return False

        r.delete(reset_key)
        r.delete(attempt_key)
        return True
