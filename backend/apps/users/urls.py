from django.urls import path
from .views import UsersHealthCheckView

app_name = 'users'

urlpatterns = [
    path('health/', UsersHealthCheckView.as_view(), name='module_health'),
]
