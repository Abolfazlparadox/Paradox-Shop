import logging

from django.db import transaction
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Address, User, UserProfile
from .otp_service import OTPService
from .selectors import AddressSelector

logger = logging.getLogger(__name__)


class UserService:
    """Business logic for creating, verifying, and mutating User accounts."""

    @staticmethod
    @transaction.atomic
    def register_user(
        *,
        email: str,
        password: str,
        first_name: str = "",
        last_name: str = "",
        phone_number: str | None = None,
        client_ip: str | None = None,
    ) -> tuple[User, int, int]:
        """
        Creates a new User account with is_active=False and an unverified UserProfile.
        Generates and logs an initial 6-digit OTP code to terminal console.
        Returns (user, cooldown_seconds, ttl_seconds).
        """
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            is_active=False,
        )
        UserProfile.objects.create(user=user, email_verified=False, phone_verified=False)
        logger.info("User registered (inactive pending OTP): user_id=%s email=%s", user.id, user.email)

        _, cooldown, ttl = OTPService.send_email_verification_otp(user, client_ip=client_ip)
        return user, cooldown, ttl

    @staticmethod
    @transaction.atomic
    def verify_email_otp(*, email: str, otp: str) -> tuple[User, dict]:
        """
        Validates the 6-digit email verification OTP.
        Upon success: activates user (is_active=True, email_verified=True),
        dispatches welcome notification, and returns (user, token_pair_dict).
        """
        try:
            user = User.objects.select_related("profile").get(email__iexact=email.strip())
        except User.DoesNotExist:
            raise ValidationError({"email": "No account found with this email address."})

        is_valid = OTPService.verify_email_otp(user, otp)
        if not is_valid:
            raise ValidationError({"otp": "Invalid or expired verification code."})

        user.is_active = True
        user.save(update_fields=["is_active"])

        profile = user.profile
        profile.email_verified = True
        profile.save(update_fields=["email_verified"])

        logger.info("User activated via OTP verification: user_id=%s email=%s", user.id, user.email)

        # Dispatch background welcome notification safely on transaction commit
        user_id_str = str(user.id)
        user_email = user.email
        user_name = f"{user.first_name} {user.last_name}".strip()
        from .tasks import send_welcome_email

        transaction.on_commit(lambda: send_welcome_email.delay(user_id_str, user_email, user_name))

        refresh = RefreshToken.for_user(user)
        tokens = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
        return user, tokens

    @staticmethod
    def resend_otp(*, email: str, otp_type: str = "verify", client_ip: str | None = None) -> tuple[int, int]:
        """
        Resends an OTP for email verification or password reset with rate limiting.
        Returns (cooldown_seconds, ttl_seconds).
        """
        try:
            user = User.objects.select_related("profile").get(email__iexact=email.strip())
        except User.DoesNotExist:
            raise ValidationError({"email": "No account found with this email address."})

        if otp_type == "verify":
            if user.is_active and getattr(user.profile, "email_verified", False):
                raise ValidationError({"detail": "This account is already verified."})
            _, cooldown, ttl = OTPService.send_email_verification_otp(user, client_ip=client_ip)
        elif otp_type == "reset":
            _, cooldown, ttl = OTPService.send_password_reset_otp(user, client_ip=client_ip)
        else:
            raise ValidationError({"type": "Invalid OTP type. Must be 'verify' or 'reset'."})

        return cooldown, ttl

    @staticmethod
    def request_phone_verification(*, user: User, phone_number: str, client_ip: str | None = None) -> tuple[int, int]:
        """
        Initiates mobile number OTP verification for authenticated user profile.
        Returns (cooldown_seconds, ttl_seconds).
        """
        cleaned_phone = phone_number.strip()
        if User.objects.filter(phone_number=cleaned_phone).exclude(pk=user.pk).exists():
            raise ValidationError({"phone_number": "This phone number is already associated with another account."})

        _, cooldown, ttl = OTPService.send_phone_verification_otp(user, cleaned_phone, client_ip=client_ip)
        return cooldown, ttl

    @staticmethod
    @transaction.atomic
    def confirm_phone_verification(*, user: User, otp: str) -> User:
        """
        Validates mobile OTP and marks phone_verified=True in UserProfile.
        """
        is_valid, verified_phone = OTPService.verify_phone_otp(user, otp)
        if not is_valid or not verified_phone:
            raise ValidationError({"otp": "Invalid or expired mobile verification code."})

        user.phone_number = verified_phone
        user.save(update_fields=["phone_number"])

        profile = user.profile
        profile.phone_verified = True
        profile.save(update_fields=["phone_verified"])

        logger.info("Mobile verified via OTP: user_id=%s phone=%s", user.id, verified_phone)
        return user

    @staticmethod
    def request_password_reset(*, email: str, client_ip: str | None = None) -> tuple[int, int]:
        """
        Generates and prints a password reset OTP for the user if account exists.
        Returns (cooldown_seconds, ttl_seconds).
        """
        try:
            user = User.objects.get(email__iexact=email.strip())
            _, cooldown, ttl = OTPService.send_password_reset_otp(user, client_ip=client_ip)
            return cooldown, ttl
        except User.DoesNotExist:
            # Return generic default cooldown/ttl to prevent user enumeration
            return 60, 120

    @staticmethod
    @transaction.atomic
    def confirm_password_reset(*, email: str, otp: str, new_password: str) -> None:
        """
        Validates password reset OTP and updates user's password atomically.
        """
        try:
            user = User.objects.get(email__iexact=email.strip())
        except User.DoesNotExist:
            raise ValidationError({"email": "No account found with this email address."})

        is_valid = OTPService.verify_password_reset_otp(user, otp)
        if not is_valid:
            raise ValidationError({"otp": "Invalid or expired password reset code."})

        user.set_password(new_password)
        user.save(update_fields=["password"])
        logger.info("Password reset successful: user_id=%s email=%s", user.id, user.email)

    @staticmethod
    def change_password(*, user: User, old_password: str, new_password: str) -> None:
        """
        Changes the user's password after verifying the current one.
        """
        if not user.check_password(old_password):
            raise ValidationError({"old_password": "Current password is incorrect."})

        user.set_password(new_password)
        user.save(update_fields=["password"])
        logger.info("Password changed: user_id=%s", user.id)

    @staticmethod
    def logout(*, refresh_token: str) -> None:
        """
        Blacklists the provided refresh token, effectively logging the user out.
        """
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            raise ValidationError({"refresh": "Token is invalid or already blacklisted."})


class AddressService:
    """Business logic for creating and mutating User Addresses."""

    @staticmethod
    @transaction.atomic
    def create_address(*, user, validated_data: dict) -> Address:
        """
        Creates a new Address for the user. The first address a user ever creates,
        or any address explicitly requested as default, becomes the default address.
        """
        is_requested_default = validated_data.get("is_default", False)
        has_existing_addresses = AddressSelector.get_user_addresses(user).exists()

        if is_requested_default or not has_existing_addresses:
            AddressService._unset_current_default(user)
            validated_data["is_default"] = True
        else:
            validated_data["is_default"] = False

        return Address.objects.create(user=user, **validated_data)

    @staticmethod
    @transaction.atomic
    def update_address(*, address: Address, validated_data: dict) -> Address:
        """Updates an existing Address, keeping the default-address invariant consistent."""
        if validated_data.get("is_default"):
            AddressService._unset_current_default(address.user, exclude_address=address)

        for field, value in validated_data.items():
            setattr(address, field, value)
        address.save()
        return address

    @staticmethod
    @transaction.atomic
    def delete_address(*, address: Address) -> None:
        """
        Soft-deletes an Address. If the deleted address was the default one,
        promotes the most recently created remaining address to default.
        """
        was_default = address.is_default
        address.soft_delete()

        if was_default:
            next_default = AddressSelector.get_user_addresses(address.user).first()
            if next_default:
                next_default.is_default = True
                next_default.save(update_fields=["is_default"])

    @staticmethod
    def _unset_current_default(user, exclude_address: Address | None = None) -> None:
        """Clears the is_default flag on all of the user's other addresses."""
        queryset = Address.objects.filter(user=user, is_deleted=False, is_default=True)
        if exclude_address is not None:
            queryset = queryset.exclude(pk=exclude_address.pk)
        queryset.update(is_default=False)
