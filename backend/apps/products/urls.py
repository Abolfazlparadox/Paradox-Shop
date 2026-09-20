from django.urls import path

from .views import (
    ProductCommentListCreateView,
    ProductDetailView,
    ProductListView,
)

app_name = "products"

urlpatterns = [
    path("", ProductListView.as_view(), name="list"),
    path("<uuid:product_id>/comments/", ProductCommentListCreateView.as_view(), name="product-comments"),
    path("<slug:slug>/comments/", ProductCommentListCreateView.as_view(), name="product-comments-by-slug"),
    path("<slug:slug>/", ProductDetailView.as_view(), name="detail"),
]
