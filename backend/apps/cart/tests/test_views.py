import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_cart_module_health(client):
    url = reverse('api_v1:cart:module_health')
    response = client.get(url)
    assert response.status_code == 200
    assert response.json()['module'] == 'cart'
    assert response.json()['status'] == 'initialized'
