import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestCategoriesAPI:
    def test_category_tree(self, api_client, create_category):
        root = create_category(name="Electronics", slug="electronics")
        child = create_category(name="Smartphones", slug="smartphones", parent=root)

        url = reverse("api_v1:categories:tree")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        root_node = next(item for item in data if item["slug"] == "electronics")
        assert len(root_node["children"]) == 1
        assert root_node["children"][0]["slug"] == "smartphones"

    def test_category_list(self, api_client, create_category):
        create_category(name="Home & Kitchen", slug="home-kitchen")
        create_category(name="Books", slug="books")

        url = reverse("api_v1:categories:list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] >= 2

    def test_category_detail(self, api_client, create_category):
        create_category(name="Fashion", slug="fashion")

        url = reverse("api_v1:categories:detail", kwargs={"slug": "fashion"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "Fashion"
