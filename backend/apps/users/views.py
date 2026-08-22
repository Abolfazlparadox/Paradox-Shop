from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsOwner
from .selectors import AddressSelector, UserSelector
from .serializers import (
    AddressSerializer,
    ConfirmPhoneSerializer,
    EmailTokenObtainPairSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RequestPhoneVerificationSerializer,
    ResendOTPSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
    VerifyEmailSerializer,
)
from .services import AddressService, UserService

User = get_user_model()


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


@extend_schema(tags=["Users"])
class RegisterView(generics.CreateAPIView):
    """Registers a new User account with is_active=False and dispatches an initial email verification OTP."""

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        client_ip = get_client_ip(request)

        user, cooldown, ttl = UserService.register_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            phone_number=validated_data.get("phone_number"),
            client_ip=client_ip,
        )

        return Response(
            {
                "detail": "Account created. A 6-digit verification code has been dispatched to your email.",
                "email": user.email,
                "requires_verification": True,
                "cooldown": cooldown,
                "ttl": ttl,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Users"])
class VerifyEmailView(generics.GenericAPIView):
    """Validates the 6-digit OTP to activate user account and issues JWT tokens."""

    serializer_class = VerifyEmailSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        user, tokens = UserService.verify_email_otp(email=email, otp=otp)
        user_data = UserProfileSerializer(UserSelector.get_user_with_profile(user.id)).data

        return Response(
            {
                "detail": "Email verified successfully.",
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": user_data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Users"])
class ResendOTPView(generics.GenericAPIView):
    """Resends a 6-digit OTP code for email verification or password reset with rate limiting."""

    serializer_class = ResendOTPSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        otp_type = serializer.validated_data.get("type", "verify")
        client_ip = get_client_ip(request)

        cooldown, ttl = UserService.resend_otp(email=email, otp_type=otp_type, client_ip=client_ip)

        return Response(
            {
                "detail": "Verification code resent successfully.",
                "cooldown": cooldown,
                "ttl": ttl,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Users"])
class VerifyPhoneView(generics.GenericAPIView):
    """Requests an SMS OTP to verify mobile number in user profile."""

    serializer_class = RequestPhoneVerificationSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone_number = serializer.validated_data["phone_number"]
        client_ip = get_client_ip(request)

        cooldown, ttl = UserService.request_phone_verification(
            user=request.user,
            phone_number=phone_number,
            client_ip=client_ip,
        )

        return Response(
            {
                "detail": "Mobile verification code sent.",
                "cooldown": cooldown,
                "ttl": ttl,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Users"])
class ConfirmPhoneView(generics.GenericAPIView):
    """Validates the mobile OTP code and marks phone_verified=True."""

    serializer_class = ConfirmPhoneSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp = serializer.validated_data["otp"]

        user = UserService.confirm_phone_verification(user=request.user, otp=otp)
        user_data = UserProfileSerializer(UserSelector.get_user_with_profile(user.id)).data

        return Response(
            {
                "detail": "Mobile number verified successfully.",
                "user": user_data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Users"])
class PasswordResetRequestView(generics.GenericAPIView):
    """Initiates password reset by sending an OTP to the user's email."""

    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        client_ip = get_client_ip(request)

        cooldown, ttl = UserService.request_password_reset(email=email, client_ip=client_ip)

        return Response(
            {
                "detail": "If your email is registered, a password reset code has been dispatched.",
                "cooldown": cooldown,
                "ttl": ttl,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Users"])
class PasswordResetConfirmView(generics.GenericAPIView):
    """Validates reset OTP and sets a new password for the user."""

    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]
        new_password = serializer.validated_data["new_password"]

        UserService.confirm_password_reset(email=email, otp=otp, new_password=new_password)

        return Response(
            {"detail": "Password has been successfully reset. You can now sign in."},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Users"])
class LoginView(TokenObtainPairView):
    """Authenticates a user with email/password credentials and issues JWT tokens."""

    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_scope = "login"


@extend_schema(tags=["Users"])
class ProfileView(generics.RetrieveUpdateAPIView):
    """Retrieves or partially/fully updates the authenticated user's account and profile."""

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return UserSelector.get_user_with_profile(self.request.user.id)


@extend_schema(tags=["Users"])
class PasswordChangeView(generics.GenericAPIView):
    """Changes the authenticated user's password."""

    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        UserService.change_password(
            user=request.user,
            old_password=serializer.validated_data["old_password"],
            new_password=serializer.validated_data["new_password"],
        )

        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


@extend_schema(tags=["Users"])
class LogoutView(generics.GenericAPIView):
    """Blacklists the provided refresh token to log the user out."""

    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        UserService.logout(refresh_token=serializer.validated_data["refresh"])

        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)


@extend_schema(tags=["Users"])
class AddressViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for the authenticated user's address book."""

    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return AddressSelector.get_user_addresses(self.request.user)

    def perform_create(self, serializer):
        address = AddressService.create_address(
            user=self.request.user,
            validated_data=serializer.validated_data,
        )
        serializer.instance = address

    def perform_update(self, serializer):
        address = AddressService.update_address(
            address=serializer.instance,
            validated_data=serializer.validated_data,
        )
        serializer.instance = address

    def perform_destroy(self, instance):
        AddressService.delete_address(address=instance)
