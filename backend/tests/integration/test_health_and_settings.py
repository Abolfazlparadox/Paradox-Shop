import pytest
from django.conf import settings
from django.urls import reverse


def test_django_settings_loaded():
    assert settings.SECRET_KEY is not None
    assert "rest_framework" in settings.INSTALLED_APPS


@pytest.mark.django_db
def test_system_health_check_endpoint(api_client):
    url = reverse("api_v1:health")
    response = api_client.get(url)
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "services" in data
    assert "database" in data["services"]
    assert "redis" in data["services"]


@pytest.mark.django_db
@pytest.mark.parametrize("module_name", ["orders", "payments", "reviews"])
def test_domain_module_health_endpoints(api_client, module_name):
    url = reverse(f"api_v1:{module_name}:module_health")
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == module_name
    assert data["status"] == "initialized"
