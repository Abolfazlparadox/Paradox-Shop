from django.contrib.auth import get_user_model
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsOwner
from .selectors import AddressSelector, UserSelector
from .serializers import (
    AddressSerializer,
    EmailTokenObtainPairSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)
from .services import AddressService, UserService

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Registers a new User account and returns the created user's profile representation."""

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        user = UserService.register_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number'),
        )

        output = UserProfileSerializer(UserSelector.get_user_with_profile(user.id))
        return Response(output.data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """Authenticates a user with email/password credentials and issues JWT tokens."""

    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):
    """Retrieves or partially/fully updates the authenticated user's account and profile."""

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return UserSelector.get_user_with_profile(self.request.user.id)


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