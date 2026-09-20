from django.urls import path

from .views import ActivePromotionListView, CartDiscountPreviewView, ValidateCouponView

app_name = "promotions"

urlpatterns = [
    path("", ActivePromotionListView.as_view(), name="list"),
    path("active/", ActivePromotionListView.as_view(), name="active-list"),
    path("coupons/validate/", ValidateCouponView.as_view(), name="coupon-validate"),
    path("cart-preview/", CartDiscountPreviewView.as_view(), name="cart-discount-preview"),
    path("cart/preview/", CartDiscountPreviewView.as_view(), name="cart-preview-alias"),
]
