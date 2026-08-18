from django.urls import path

from .views import CartItemDetailView, CartItemListView, CartView, MergeCartView

app_name = "cart"

urlpatterns = [
    path("", CartView.as_view(), name="detail"),
    path("items/", CartItemListView.as_view(), name="item-list"),
    path("items/<uuid:item_id>/", CartItemDetailView.as_view(), name="item-detail"),
    path("merge/", MergeCartView.as_view(), name="merge"),
]
