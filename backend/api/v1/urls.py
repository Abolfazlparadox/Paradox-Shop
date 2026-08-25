from django.urls import include, path

from common.health import (
    LivenessHealthCheckView,
    ReadinessHealthCheckView,
    SystemHealthCheckView,
)

app_name = 'api_v1'

urlpatterns = [
    # System Health Endpoints
    path('health/', SystemHealthCheckView.as_view(), name='health'),
    path('health/live/', LivenessHealthCheckView.as_view(), name='health-live'),
    path('health/ready/', ReadinessHealthCheckView.as_view(), name='health-ready'),

    # Domain API Router mounts
    path('users/', include('apps.users.urls', namespace='users')),
    path('products/', include('apps.products.urls', namespace='products')),
    path('categories/', include('apps.categories.urls', namespace='categories')),
    path('cart/', include('apps.cart.urls', namespace='cart')),
    path('orders/', include('apps.orders.urls', namespace='orders')),
    path('payments/', include('apps.payments.urls', namespace='payments')),
    path('reviews/', include('apps.reviews.urls', namespace='reviews')),
    # Admin Control Center Router mount
    path('admin/', include('api.v1.admin_urls', namespace='admin')),
]

