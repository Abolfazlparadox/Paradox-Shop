from django.urls import path, include
from common.health import SystemHealthCheckView

app_name = 'api_v1'

urlpatterns = [
    # System Health Endpoint
    path('health/', SystemHealthCheckView.as_view(), name='health'),

    # Domain API Router mounts
    path('users/', include('apps.users.urls', namespace='users')),
    path('products/', include('apps.products.urls', namespace='products')),
    path('categories/', include('apps.categories.urls', namespace='categories')),
    path('cart/', include('apps.cart.urls', namespace='cart')),
    path('orders/', include('apps.orders.urls', namespace='orders')),
    path('payments/', include('apps.payments.urls', namespace='payments')),
    path('reviews/', include('apps.reviews.urls', namespace='reviews')),
]
