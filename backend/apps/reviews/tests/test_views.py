import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_reviews_module_health(client):
    url = reverse('api_v1:reviews:module_health')
    response = client.get(url)
    assert response.status_code == 200
    assert response.json()['module'] == 'reviews'
    assert response.json()['status'] == 'initialized'
