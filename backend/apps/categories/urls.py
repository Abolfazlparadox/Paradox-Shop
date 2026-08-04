from django.urls import path
from .views import CategoriesHealthCheckView

app_name = 'categories'

urlpatterns = [
    path('health/', CategoriesHealthCheckView.as_view(), name='module_health'),
]
