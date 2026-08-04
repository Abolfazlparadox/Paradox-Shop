import pytest
from django.urls import reverse
from django.conf import settings

def test_django_settings_loaded():
    assert settings.SECRET_KEY is not None
    assert 'rest_framework' in settings.INSTALLED_APPS

@pytest.mark.django_db
def test_system_health_check_endpoint(api_client):
    url = reverse('api_v1:health')
    response = api_client.get(url)
    assert response.status_code in [200, 503]
    data = response.json()
    assert 'status' in data
    assert 'services' in data
    assert 'database' in data['services']
    assert 'redis' in data['services']
