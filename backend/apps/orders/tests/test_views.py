import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_orders_module_health(client):
    url = reverse('api_v1:orders:module_health')
    response = client.get(url)
    assert response.status_code == 200
    assert response.json()['module'] == 'orders'
    assert response.json()['status'] == 'initialized'
