from django.urls import path
from .views import ReviewsHealthCheckView

app_name = 'reviews'

urlpatterns = [
    path('health/', ReviewsHealthCheckView.as_view(), name='module_health'),
]
