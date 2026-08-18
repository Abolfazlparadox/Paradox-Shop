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
    EmailTokenObtainPairSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)
from .services import AddressService, UserService

User = get_user_model()


@extend_schema(tags=["Users"])
class RegisterView(generics.CreateAPIView):
    """Registers a new User account and returns the created user's profile representation."""

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        user = UserService.register_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            phone_number=validated_data.get("phone_number"),
        )

        output = UserProfileSerializer(UserSelector.get_user_with_profile(user.id))
        return Response(output.data, status=status.HTTP_201_CREATED)


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
