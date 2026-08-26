from django.urls import path

from .views import (
    WishlistCheckView,
    WishlistItemCreateView,
    WishlistItemDetailView,
    WishlistMergeView,
    WishlistRemoveByProductView,
    WishlistView,
)

app_name = "wishlist"

urlpatterns = [
    path("", WishlistView.as_view(), name="detail"),
    path("items/", WishlistItemCreateView.as_view(), name="item-create"),
    path("items/<uuid:item_id>/", WishlistItemDetailView.as_view(), name="item-detail"),
    path("items/remove-by-product/", WishlistRemoveByProductView.as_view(), name="remove-by-product"),
    path("merge/", WishlistMergeView.as_view(), name="merge"),
    path("check/", WishlistCheckView.as_view(), name="check"),
]
