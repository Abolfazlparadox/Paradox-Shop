from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AddressViewSet,
    ConfirmPhoneView,
    LoginView,
    LogoutView,
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    ResendOTPView,
    VerifyEmailView,
    VerifyPhoneView,
)

app_name = "users"

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-otp/", ResendOTPView.as_view(), name="resend-otp"),
    path("login/", LoginView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="login-refresh"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("profile/verify-phone/", VerifyPhoneView.as_view(), name="verify-phone"),
    path("profile/confirm-phone/", ConfirmPhoneView.as_view(), name="confirm-phone"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    path("logout/", LogoutView.as_view(), name="logout"),
] + router.urls
