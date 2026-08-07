from django.urls import path
from .views import CreateReviewView, ProductReviewListView, ReviewsHealthCheckView

app_name = 'reviews'

urlpatterns = [
    path('health/', ReviewsHealthCheckView.as_view(), name='module_health'),
    path('create/', CreateReviewView.as_view(), name='create'),
    path('product/<uuid:product_id>/', ProductReviewListView.as_view(), name='product-reviews'),
]