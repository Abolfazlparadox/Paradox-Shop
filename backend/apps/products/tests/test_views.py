import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_products_module_health(client):
    url = reverse('api_v1:products:module_health')
    response = client.get(url)
    assert response.status_code == 200
    assert response.json()['module'] == 'products'
    assert response.json()['status'] == 'initialized'
