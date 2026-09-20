import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestUserRegistration:
    def test_registration_success(self, api_client):
        url = reverse("api_v1:users:register")
        payload = {
            "email": "newuser@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "first_name": "Ali",
            "last_name": "Rezaei",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["requires_verification"] is True
        assert "cooldown" in data
        assert "ttl" in data

    def test_registration_duplicate_email(self, api_client, create_user):
        create_user(email="existing@example.com")
        url = reverse("api_v1:users:register")
        payload = {
            "email": "existing@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_registration_password_mismatch(self, api_client):
        url = reverse("api_v1:users:register")
        payload = {
            "email": "mismatch@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "DifferentPassword123!",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserAuthentication:
    def test_login_success(self, api_client, create_user):
        create_user(email="loginuser@example.com", password="ValidPassword123!")
        url = reverse("api_v1:users:login")
        payload = {
            "email": "loginuser@example.com",
            "password": "ValidPassword123!",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access" in data
        assert "refresh" in data
        assert data["user"]["email"] == "loginuser@example.com"

    def test_login_invalid_password(self, api_client, create_user):
        create_user(email="loginuser@example.com", password="ValidPassword123!")
        url = reverse("api_v1:users:login")
        payload = {
            "email": "loginuser@example.com",
            "password": "WrongPassword123!",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh(self, api_client, create_user):
        create_user(email="refreshuser@example.com", password="ValidPassword123!")
        login_url = reverse("api_v1:users:login")
        login_resp = api_client.post(
            login_url,
            {
                "email": "refreshuser@example.com",
                "password": "ValidPassword123!",
            },
            format="json",
        )
        refresh_token = login_resp.json()["refresh"]

        refresh_url = reverse("api_v1:users:login-refresh")
        response = api_client.post(refresh_url, {"refresh": refresh_token}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.json()

    def test_logout(self, auth_client, create_user, api_client):
        user = create_user(email="logoutuser@example.com", password="ValidPassword123!")
        client = auth_client(user)

        login_url = reverse("api_v1:users:login")
        login_resp = api_client.post(
            login_url,
            {
                "email": "logoutuser@example.com",
                "password": "ValidPassword123!",
            },
            format="json",
        )
        refresh_token = login_resp.json()["refresh"]

        logout_url = reverse("api_v1:users:logout")
        response = client.post(logout_url, {"refresh": refresh_token}, format="json")
        assert response.status_code == status.HTTP_200_OK

        # Trying to refresh with the blacklisted token should now fail
        refresh_url = reverse("api_v1:users:login-refresh")
        ref_response = api_client.post(refresh_url, {"refresh": refresh_token}, format="json")
        assert ref_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_password_change(self, auth_client, create_user):
        user = create_user(email="pwduser@example.com", password="OldPassword123!")
        client = auth_client(user)
        url = reverse("api_v1:users:password-change")
        payload = {
            "old_password": "OldPassword123!",
            "new_password": "BrandNewPassword123!",
            "new_password_confirm": "BrandNewPassword123!",
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestUserProfileAndAddresses:
    def test_get_profile(self, auth_client, create_user):
        user = create_user(first_name="Sara", last_name="Ahmadi")
        client = auth_client(user)
        url = reverse("api_v1:users:profile")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["first_name"] == "Sara"

    def test_address_crud(self, auth_client, create_user):
        user = create_user()
        client = auth_client(user)

        # Create Address
        list_url = reverse("api_v1:users:address-list")
        payload = {
            "title": "Office",
            "recipient_name": "Sara",
            "recipient_phone": "09121112233",
            "province": "Tehran",
            "city": "Tehran",
            "postal_code": "1111122222",
            "address_line": "Azadi St, No 10",
            "is_default": True,
        }
        create_resp = client.post(list_url, payload, format="json")
        assert create_resp.status_code == status.HTTP_201_CREATED
        address_id = create_resp.json()["id"]

        # Retrieve Address
        detail_url = reverse("api_v1:users:address-detail", kwargs={"pk": address_id})
        get_resp = client.get(detail_url)
        assert get_resp.status_code == status.HTTP_200_OK
        assert get_resp.json()["title"] == "Office"

        # Delete Address (soft delete)
        del_resp = client.delete(detail_url)
        assert del_resp.status_code == status.HTTP_204_NO_CONTENT
