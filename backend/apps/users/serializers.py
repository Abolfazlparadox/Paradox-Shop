from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Address, UserProfile

User = get_user_model()


class UserProfileDetailSerializer(serializers.ModelSerializer):
    """Serializer for the UserProfile model, nested inside UserProfileSerializer."""

    class Meta:
        model = UserProfile
        fields = [
            "avatar",
            "national_id",
            "date_of_birth",
            "gender",
            "email_verified",
            "phone_verified",
        ]
        read_only_fields = ["email_verified", "phone_verified"]


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Validates and creates a new User account."""

    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "phone_number",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        normalized_email = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return normalized_email

    def validate_phone_number(self, value):
        if value and User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Represents the authenticated user's account together with their profile."""

    profile = UserProfileDetailSerializer(required=False)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "first_name",
            "last_name",
            "phone_number",
            "is_staff",
            "is_superuser",
            "profile",
            "created_at",
        ]
        read_only_fields = ["id", "email", "is_staff", "is_superuser", "created_at"]

    def validate_phone_number(self, value):
        if value:
            queryset = User.objects.filter(phone_number=value)
            if self.instance is not None:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError("A user with this phone number already exists.")
        return value

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if profile_data:
            profile = instance.profile
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()

        return instance


class AddressSerializer(serializers.ModelSerializer):
    """Serializer for a User's shipping/billing Address."""

    class Meta:
        model = Address
        fields = [
            "id",
            "title",
            "recipient_name",
            "recipient_phone",
            "province",
            "city",
            "postal_code",
            "address_line",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Issues JWT access/refresh tokens for email/password credentials with basic user info embedded.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": str(self.user.id),
            "email": self.user.email,
            "full_name": self.user.full_name,
        }
        return data


class PasswordChangeSerializer(serializers.Serializer):
    """Validates the payload for changing the authenticated user's password."""

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, write_only=True, validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs.pop("new_password_confirm"):
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        return attrs


class LogoutSerializer(serializers.Serializer):
    """Validates the payload for logging out (blacklisting a refresh token)."""

    refresh = serializers.CharField(required=True)


class VerifyEmailSerializer(serializers.Serializer):
    """Validates the email verification payload."""

    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)


class ResendOTPSerializer(serializers.Serializer):
    """Validates the request to resend an OTP code."""

    email = serializers.EmailField(required=True)
    type = serializers.ChoiceField(choices=["verify", "reset"], default="verify")


class RequestPhoneVerificationSerializer(serializers.Serializer):
    """Validates the mobile number to be verified."""

    phone_number = serializers.CharField(required=True, max_length=20)

    def validate_phone_number(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Phone number cannot be empty.")
        return cleaned


class ConfirmPhoneSerializer(serializers.Serializer):
    """Validates the OTP code sent to user's mobile."""

    otp = serializers.CharField(required=True, min_length=6, max_length=6)


class PasswordResetRequestSerializer(serializers.Serializer):
    """Validates the email for password reset request."""

    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Validates the password reset confirmation payload."""

    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)
    new_password = serializers.CharField(
        required=True, write_only=True, validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs.pop("new_password_confirm"):
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        return attrs
