from datetime import timedelta
from decimal import Decimal
import uuid

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.promotions.models import AudienceType, Coupon, CouponUsage, DiscountType, Promotion
from apps.promotions.services import CouponService, PromotionEngine

User = get_user_model()


@pytest.fixture
def create_promotion(db):
    def _create_promotion(
        name="Summer Sale",
        slug=None,
        discount_type=DiscountType.PERCENTAGE,
        discount_value=Decimal("20"),
        max_discount_amount=None,
        start_at=None,
        end_at=None,
        is_active=True,
        priority=0,
        included_products=None,
        excluded_products=None,
        included_categories=None,
        included_brands=None,
    ):
        if slug is None:
            slug = f"promo-{uuid.uuid4().hex[:8]}"
        promo = Promotion.objects.create(
            name=name,
            slug=slug,
            discount_type=discount_type,
            discount_value=discount_value,
            max_discount_amount=max_discount_amount,
            start_at=start_at,
            end_at=end_at,
            is_active=is_active,
            priority=priority,
        )
        if included_products:
            promo.included_products.set(included_products)
        if excluded_products:
            promo.excluded_products.set(excluded_products)
        if included_categories:
            promo.included_categories.set(included_categories)
        if included_brands:
            promo.included_brands.set(included_brands)
        return promo

    return _create_promotion


@pytest.fixture
def create_coupon(db):
    def _create_coupon(
        code="SAVE10",
        discount_type=DiscountType.PERCENTAGE,
        discount_value=Decimal("10"),
        max_discount_amount=None,
        min_order_subtotal=Decimal("0"),
        start_at=None,
        end_at=None,
        is_active=True,
        total_usage_limit=None,
        per_user_usage_limit=1,
        audience_type=AudienceType.ALL,
        eligible_users=None,
        included_products=None,
        excluded_products=None,
        included_categories=None,
        included_brands=None,
    ):
        coupon = Coupon.objects.create(
            code=code,
            discount_type=discount_type,
            discount_value=discount_value,
            max_discount_amount=max_discount_amount,
            min_order_subtotal=min_order_subtotal,
            start_at=start_at,
            end_at=end_at,
            is_active=is_active,
            total_usage_limit=total_usage_limit,
            per_user_usage_limit=per_user_usage_limit,
            audience_type=audience_type,
        )
        if eligible_users:
            coupon.eligible_users.set(eligible_users)
        if included_products:
            coupon.included_products.set(included_products)
        if excluded_products:
            coupon.excluded_products.set(excluded_products)
        if included_categories:
            coupon.included_categories.set(included_categories)
        if included_brands:
            coupon.included_brands.set(included_brands)
        return coupon

    return _create_coupon


@pytest.mark.django_db
class TestPromotionCalculationEngine:
    def test_percentage_discount_calculation(self, create_product, create_promotion):
        product = create_product(base_price=Decimal("100000"))
        promo = create_promotion(
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("15"),
            included_products=[product],
        )

        cart_items = [
            {"product": product, "variant": None, "quantity": 2, "unit_price": product.base_price}
        ]
        result = PromotionEngine.calculate_cart_discounts(cart_items=cart_items)

        assert result.subtotal_before_discounts == Decimal("200000")
        assert result.promotion_total == Decimal("30000")
        assert result.subtotal_after_discounts == Decimal("170000")
        assert result.item_discounts[0].promotion_discount_per_unit == Decimal("15000")
        assert result.item_discounts[0].final_unit_price == Decimal("85000")

    def test_fixed_amount_discount_calculation(self, create_product, create_promotion):
        product = create_product(base_price=Decimal("100000"))
        create_promotion(
            discount_type=DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("25000"),
            included_products=[product],
        )

        cart_items = [
            {"product": product, "variant": None, "quantity": 1, "unit_price": product.base_price}
        ]
        result = PromotionEngine.calculate_cart_discounts(cart_items=cart_items)

        assert result.promotion_total == Decimal("25000")
        assert result.subtotal_after_discounts == Decimal("75000")

    def test_max_discount_cap_enforced(self, create_product, create_promotion):
        product = create_product(base_price=Decimal("1000000"))
        create_promotion(
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("50"),
            max_discount_amount=Decimal("100000"),  # Cap at 100k instead of 500k
            included_products=[product],
        )

        cart_items = [
            {"product": product, "variant": None, "quantity": 1, "unit_price": product.base_price}
        ]
        result = PromotionEngine.calculate_cart_discounts(cart_items=cart_items)

        assert result.promotion_total == Decimal("100000")
        assert result.subtotal_after_discounts == Decimal("900000")

    def test_best_promotion_selected_when_multiple_match(self, create_product, create_promotion):
        product = create_product(base_price=Decimal("100000"))
        # Promo 1: 10% (10,000 Rial)
        create_promotion(
            name="10% Off",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("10"),
            included_products=[product],
        )
        # Promo 2: 25% (25,000 Rial) -> should win
        best_promo = create_promotion(
            name="25% Off",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("25"),
            included_products=[product],
        )

        cart_items = [
            {"product": product, "variant": None, "quantity": 1, "unit_price": product.base_price}
        ]
        result = PromotionEngine.calculate_cart_discounts(cart_items=cart_items)

        assert result.promotion_total == Decimal("25000")
        assert result.item_discounts[0].promotion_id == best_promo.id

    def test_excluded_products_not_discounted(self, create_product, create_promotion):
        product = create_product(base_price=Decimal("100000"))
        create_promotion(
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("20"),
            excluded_products=[product],  # Specifically excluded from global promo
        )

        cart_items = [
            {"product": product, "variant": None, "quantity": 1, "unit_price": product.base_price}
        ]
        result = PromotionEngine.calculate_cart_discounts(cart_items=cart_items)

        assert result.promotion_total == Decimal("0")
        assert result.subtotal_after_discounts == Decimal("100000")

    def test_expired_or_future_promotion_ignored(self, create_product, create_promotion):
        product = create_product(base_price=Decimal("100000"))
        now = timezone.now()
        # Expired yesterday
        create_promotion(
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("50"),
            end_at=now - timedelta(days=1),
            included_products=[product],
        )
        # Starts tomorrow
        create_promotion(
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("50"),
            start_at=now + timedelta(days=1),
            included_products=[product],
        )

        cart_items = [
            {"product": product, "variant": None, "quantity": 1, "unit_price": product.base_price}
        ]
        result = PromotionEngine.calculate_cart_discounts(cart_items=cart_items)

        assert result.promotion_total == Decimal("0")


@pytest.mark.django_db
class TestCouponValidationAndConstraints:
    def test_coupon_validate_api_success(self, auth_client, create_user, create_coupon):
        user = create_user()
        client = auth_client(user)
        create_coupon(
            code="WELCOME20",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("20"),
            min_order_subtotal=Decimal("50000"),
        )

        url = reverse("api_v1:promotions:coupon-validate")
        resp = client.post(url, {"code": "welcome20"}, format="json")  # lower-case should work

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["valid"] is True
        assert data["code"] == "WELCOME20"
        assert data["discount_type"] == "percentage"
        assert data["discount_value"] == "20"

    def test_coupon_validate_invalid_code_fails(self, auth_client, create_user):
        user = create_user()
        client = auth_client(user)

        url = reverse("api_v1:promotions:coupon-validate")
        resp = client.post(url, {"code": "NONEXISTENT"}, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "coupon_code" in str(resp.json())

    def test_inactive_coupon_fails(self, auth_client, create_user, create_coupon):
        user = create_user()
        client = auth_client(user)
        create_coupon(code="DISABLED", is_active=False)

        url = reverse("api_v1:promotions:coupon-validate")
        resp = client.post(url, {"code": "DISABLED"}, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_expired_coupon_fails(self, auth_client, create_user, create_coupon):
        user = create_user()
        client = auth_client(user)
        now = timezone.now()
        create_coupon(code="EXPIRED", end_at=now - timedelta(hours=1))

        url = reverse("api_v1:promotions:coupon-validate")
        resp = client.post(url, {"code": "EXPIRED"}, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_specific_user_audience_restriction(self, auth_client, create_user, create_coupon):
        allowed_user = create_user(email="vip@example.com")
        denied_user = create_user(email="guest@example.com")

        coupon = create_coupon(
            code="VIPONLY",
            audience_type=AudienceType.SPECIFIC_USERS,
            eligible_users=[allowed_user],
        )

        url = reverse("api_v1:promotions:coupon-validate")

        # Allowed user
        resp_allowed = auth_client(allowed_user).post(url, {"code": "VIPONLY"}, format="json")
        assert resp_allowed.status_code == status.HTTP_200_OK

        # Denied user
        resp_denied = auth_client(denied_user).post(url, {"code": "VIPONLY"}, format="json")
        assert resp_denied.status_code == status.HTTP_400_BAD_REQUEST

    def test_per_user_usage_limit_enforced(
        self, auth_client, create_user, create_coupon, create_product, create_address
    ):
        user = create_user()
        client = auth_client(user)
        address = create_address(user=user)
        prod = create_product(base_price=Decimal("100000"))
        coupon = create_coupon(code="ONCEONLY", per_user_usage_limit=1)

        # First checkout with coupon
        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 1},
            format="json",
        )
        resp1 = client.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address.id), "coupon_code": "ONCEONLY"},
            format="json",
        )
        assert resp1.status_code == status.HTTP_201_CREATED

        # Second attempt should be rejected
        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 1},
            format="json",
        )
        resp2 = client.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address.id), "coupon_code": "ONCEONLY"},
            format="json",
        )
        assert resp2.status_code == status.HTTP_400_BAD_REQUEST

    def test_global_usage_limit_enforced(
        self, auth_client, create_user, create_coupon, create_product, create_address
    ):
        user1 = create_user(email="user1@example.com")
        user2 = create_user(email="user2@example.com")
        address1 = create_address(user=user1)
        address2 = create_address(user=user2)
        prod = create_product(base_price=Decimal("100000"))
        coupon = create_coupon(code="LIMIT1", total_usage_limit=1, per_user_usage_limit=1)

        # User 1 claims the single available redemption
        client1 = auth_client(user1)
        client1.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 1},
            format="json",
        )
        resp1 = client1.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address1.id), "coupon_code": "LIMIT1"},
            format="json",
        )
        assert resp1.status_code == status.HTTP_201_CREATED

        coupon.refresh_from_db()
        assert coupon.usage_count == 1

        # User 2 tries to use it but limit is reached
        client2 = auth_client(user2)
        client2.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 1},
            format="json",
        )
        resp2 = client2.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address2.id), "coupon_code": "LIMIT1"},
            format="json",
        )
        assert resp2.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCartDiscountPreviewAndStorefrontAPI:
    def test_active_promotions_public_listing(self, api_client, create_promotion):
        create_promotion(name="Promo A", is_active=True)
        create_promotion(name="Promo B", is_active=False)

        url = reverse("api_v1:promotions:active-list")
        resp = api_client.get(url)

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Promo A"

    def test_cart_discount_preview_endpoint(
        self, auth_client, create_user, create_product, create_promotion, create_coupon
    ):
        user = create_user()
        client = auth_client(user)
        prod = create_product(base_price=Decimal("200000"))
        create_promotion(
            name="10% Auto",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("10"),
            included_products=[prod],
        )
        create_coupon(
            code="EXTRA50K",
            discount_type=DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("50000"),
        )

        # Add to cart
        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 2},
            format="json",
        )

        # Preview without coupon
        preview_url = reverse("api_v1:promotions:cart-discount-preview")
        resp_no_coupon = client.post(preview_url, {}, format="json")
        assert resp_no_coupon.status_code == status.HTTP_200_OK
        data1 = resp_no_coupon.json()
        assert data1["subtotal_before_discounts"] == "400000"
        assert data1["promotion_total"] == "40000"  # 20k per unit * 2
        assert data1["coupon_discount"] == "0"
        assert data1["subtotal_after_discounts"] == "360000"

        # Preview with coupon
        resp_with_coupon = client.post(preview_url, {"coupon_code": "EXTRA50K"}, format="json")
        assert resp_with_coupon.status_code == status.HTTP_200_OK
        data2 = resp_with_coupon.json()
        assert data2["subtotal_before_discounts"] == "400000"
        assert data2["promotion_total"] == "40000"
        assert data2["coupon_discount"] == "50000"
        assert data2["total_discount"] == "90000"
        assert data2["subtotal_after_discounts"] == "310000"


@pytest.mark.django_db
class TestCheckoutPromotionIntegration:
    def test_checkout_with_stacked_promotion_and_coupon_snapshots(
        self, auth_client, create_user, create_product, create_promotion, create_coupon, create_address
    ):
        user = create_user()
        client = auth_client(user)
        address = create_address(user=user)
        prod = create_product(name="Atelier Coat", base_price=Decimal("1000000"))

        promo = create_promotion(
            name="Winter Season",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("20"),
            included_products=[prod],
        )
        coupon = create_coupon(
            code="PARADOX10",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("10"),
        )

        # Add 2 coats: 2 * 1,000,000 = 2,000,000
        # Promo: 20% off 1,000,000 = 200,000 per unit (400,000 total promo)
        # Post-promo subtotal: 1,600,000
        # Coupon: 10% off 1,600,000 = 160,000
        # Subtotal after discount: 1,440,000
        # Total discount: 560,000
        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 2},
            format="json",
        )

        checkout_resp = client.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address.id), "coupon_code": "PARADOX10"},
            format="json",
        )

        assert checkout_resp.status_code == status.HTTP_201_CREATED
        order_data = checkout_resp.json()

        assert order_data["subtotal"] == "2000000"
        assert order_data["discount_amount"] == "560000"
        assert order_data["coupon_code"] == "PARADOX10"
        assert order_data["coupon_snapshot"]["code"] == "PARADOX10"
        assert order_data["coupon_snapshot"]["coupon_discount_applied"] == "160000"

        # Check OrderItem snapshots
        item_data = order_data["items"][0]
        assert item_data["original_unit_price"] == "1000000"
        assert item_data["discount_amount"] == "200000"
        assert item_data["unit_price"] == "800000"
        assert item_data["total_price"] == "1600000"
        assert item_data["promotion_snapshot"]["name"] == "Winter Season"

        # Verify CouponUsage record created
        usage = CouponUsage.objects.get(coupon=coupon, user=user)
        assert usage.discount_amount == Decimal("160000")
        assert usage.order_id == uuid.UUID(order_data["id"])

        # Verify Coupon usage_count incremented
        coupon.refresh_from_db()
        assert coupon.usage_count == 1

    def test_total_never_negative(
        self, auth_client, create_user, create_product, create_coupon, create_address
    ):
        user = create_user()
        client = auth_client(user)
        address = create_address(user=user)
        prod = create_product(base_price=Decimal("50000"))

        # Fixed coupon larger than cart total
        create_coupon(
            code="BIGDISCOUNT",
            discount_type=DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("100000"),
        )

        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 1},
            format="json",
        )

        checkout_resp = client.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address.id), "coupon_code": "BIGDISCOUNT"},
            format="json",
        )

        assert checkout_resp.status_code == status.HTTP_201_CREATED
        order_data = checkout_resp.json()
        assert int(order_data["total"]) >= 0


@pytest.mark.django_db
class TestAdminPromotionsAndCouponsAPI:
    def test_non_staff_forbidden_from_admin_promotions(self, auth_client, create_user):
        user = create_user(is_staff=False)
        client = auth_client(user)

        url = reverse("api_v1:admin:promotions-list")
        resp = client.get(url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_superuser_admin_promotion_crud_and_toggle(self, auth_client, create_user, create_product):
        admin = create_user(is_staff=True, is_superuser=True)
        client = auth_client(admin)
        prod = create_product()

        # 1. Create promotion
        list_url = reverse("api_v1:admin:promotions-list")
        create_payload = {
            "name": "Black Friday",
            "slug": "black-friday",
            "description": "Massive holiday discounts",
            "discount_type": "percentage",
            "discount_value": 30,
            "is_active": False,
            "priority": 1,
            "included_products": [str(prod.id)],
        }
        create_resp = client.post(list_url, create_payload, format="json")
        assert create_resp.status_code == status.HTTP_201_CREATED
        promo_id = create_resp.json()["id"]

        # 2. List promotions
        list_resp = client.get(list_url)
        assert list_resp.status_code == status.HTTP_200_OK
        assert len(list_resp.json()) >= 1

        # 3. Retrieve promotion
        detail_url = reverse("api_v1:admin:promotions-detail", kwargs={"pk": promo_id})
        get_resp = client.get(detail_url)
        assert get_resp.status_code == status.HTTP_200_OK
        assert get_resp.json()["name"] == "Black Friday"

        # 4. Patch promotion
        patch_resp = client.patch(detail_url, {"discount_value": 35}, format="json")
        assert patch_resp.status_code == status.HTTP_200_OK
        assert patch_resp.json()["discount_value"] == "35"

        # 5. Toggle promotion activation
        toggle_url = reverse("api_v1:admin:promotions-toggle", kwargs={"pk": promo_id})
        toggle_resp = client.post(toggle_url)
        assert toggle_resp.status_code == status.HTTP_200_OK
        assert toggle_resp.json()["is_active"] is True

        # 6. Delete promotion
        del_resp = client.delete(detail_url)
        assert del_resp.status_code == status.HTTP_204_NO_CONTENT
        assert not Promotion.objects.filter(id=promo_id).exists()

    def test_superuser_admin_coupon_crud_and_usages(self, auth_client, create_user):
        admin = create_user(is_staff=True, is_superuser=True)
        client = auth_client(admin)

        # 1. Create coupon
        list_url = reverse("api_v1:admin:coupons-list")
        create_payload = {
            "code": "SPRINGSALE",
            "description": "Spring season voucher",
            "discount_type": "fixed_amount",
            "discount_value": 50000,
            "min_order_subtotal": 100000,
            "is_active": True,
            "total_usage_limit": 100,
            "per_user_usage_limit": 2,
            "audience_type": "all",
        }
        create_resp = client.post(list_url, create_payload, format="json")
        assert create_resp.status_code == status.HTTP_201_CREATED
        coupon_id = create_resp.json()["id"]

        # 2. Retrieve coupon
        detail_url = reverse("api_v1:admin:coupons-detail", kwargs={"pk": coupon_id})
        get_resp = client.get(detail_url)
        assert get_resp.status_code == status.HTTP_200_OK
        assert get_resp.json()["code"] == "SPRINGSALE"

        # 3. Toggle coupon activation
        toggle_url = reverse("api_v1:admin:coupons-toggle", kwargs={"pk": coupon_id})
        toggle_resp = client.post(toggle_url)
        assert toggle_resp.status_code == status.HTTP_200_OK
        assert toggle_resp.json()["is_active"] is False

        # 4. Coupon usages endpoint
        usages_url = reverse("api_v1:admin:coupons-usages", kwargs={"pk": coupon_id})
        usages_resp = client.get(usages_url)
        assert usages_resp.status_code == status.HTTP_200_OK
        assert isinstance(usages_resp.json(), list)

    def test_admin_promotion_reports_and_notifications(
        self, auth_client, create_user
    ):
        from common.models import AdminNotification, AuditLog
        from apps.promotions.services import PromotionService, CouponService

        admin = create_user(is_staff=True, is_superuser=True)
        client = auth_client(admin)

        promo = PromotionService.create_promotion(
            data={
                "name": "Winter Sale",
                "slug": "winter-sale",
                "discount_type": "percentage",
                "discount_value": Decimal("15"),
                "is_active": True,
            }
        )
        coupon = CouponService.create_coupon(
            data={
                "code": "WINTER15",
                "discount_type": "percentage",
                "discount_value": Decimal("15"),
                "is_active": True,
            }
        )

        # Test reports endpoint
        reports_url = reverse("api_v1:admin:promotions-reports")
        reports_resp = client.get(reports_url)
        assert reports_resp.status_code == status.HTTP_200_OK
        report_data = reports_resp.json()
        assert "total_discounts_given" in report_data
        assert "active_campaigns" in report_data
        assert report_data["active_campaigns"] >= 2
        assert "most_used_coupons" in report_data
        assert "least_used_coupons" in report_data

        # Test reports with query param days
        days_resp = client.get(f"{reports_url}?days=30")
        assert days_resp.status_code == status.HTTP_200_OK

        # Verify AuditLog and AdminNotification entries created by services
        assert AuditLog.objects.filter(resource_type="Promotion").exists()
        assert AuditLog.objects.filter(resource_type="Coupon").exists()
        assert AdminNotification.objects.filter(title__icontains="Promotion").exists()
        assert AdminNotification.objects.filter(title__icontains="Coupon").exists()




@pytest.mark.django_db
class TestProductEffectivePriceExposure:
    def test_product_list_and_detail_expose_discounted_price(
        self, api_client, create_product, create_promotion
    ):
        prod = create_product(base_price=Decimal("500000"))
        create_promotion(
            name="Special Offer",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("20"),
            included_products=[prod],
        )

        # List endpoint
        list_url = reverse("api_v1:products:list")
        list_resp = api_client.get(list_url)
        assert list_resp.status_code == status.HTTP_200_OK
        results = list_resp.json()["results"]
        prod_item = next(p for p in results if p["id"] == str(prod.id))
        assert prod_item["is_discounted"] is True
        assert prod_item["discounted_price"] == 400000
        assert prod_item["active_promotion"]["name"] == "Special Offer"
        assert prod_item["active_promotion"]["savings"] == Decimal("100000")
        assert prod_item["active_promotion"]["discount_percentage"] == 20

        # Detail endpoint
        detail_url = reverse("api_v1:products:detail", kwargs={"slug": prod.slug})
        detail_resp = api_client.get(detail_url)
        assert detail_resp.status_code == status.HTTP_200_OK
        detail_data = detail_resp.json()
        assert detail_data["is_discounted"] is True
        assert detail_data["discounted_price"] == 400000
        assert detail_data["active_promotion"]["name"] == "Special Offer"
        assert detail_data["active_promotion"]["savings"] == Decimal("100000")
        assert detail_data["active_promotion"]["discount_percentage"] == 20


@pytest.mark.django_db
class TestCartAuthoritativePricing:
    def test_cart_api_exposes_promotion_discounts_and_totals(
        self, auth_client, create_user, create_product, create_promotion
    ):
        user = create_user()
        client = auth_client(user)
        prod1 = create_product(name="Watch", slug="watch", base_price=Decimal("500000"))
        prod2 = create_product(name="Strap", slug="strap", base_price=Decimal("100000"))

        promo = create_promotion(
            name="Watch 10% Off",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("10"),
            included_products=[prod1],
        )

        # Add items to cart
        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod1.id), "quantity": 2},
            format="json",
        )
        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod2.id), "quantity": 1},
            format="json",
        )

        cart_resp = client.get(reverse("api_v1:cart:detail"))
        assert cart_resp.status_code == status.HTTP_200_OK
        data = cart_resp.json()

        # Subtotal = (2 * 500,000) + (1 * 100,000) = 1,100,000
        assert data["subtotal"] == "1100000"
        # Discount = 2 * 50,000 = 100,000
        assert data["discount_amount"] == "100000"
        # Total = 1,000,000
        assert data["total"] == "1000000"
        assert data["savings"] == "100000"
        assert len(data["applied_promotions"]) == 1
        assert data["applied_promotions"][0]["name"] == "Watch 10% Off"

        # Check line item breakdown
        items = data["items"]
        watch_item = next(i for i in items if i["product"]["id"] == str(prod1.id))
        assert watch_item["original_unit_price"] == "500000"
        assert watch_item["discount_amount"] == "50000"
        assert watch_item["unit_price"] == "450000"
        assert watch_item["original_total_price"] == "1000000"
        assert watch_item["total_price"] == "900000"
        assert watch_item["is_discounted"] is True
        assert watch_item["applied_promotion"]["name"] == "Watch 10% Off"

        strap_item = next(i for i in items if i["product"]["id"] == str(prod2.id))
        assert strap_item["original_unit_price"] == "100000"
        assert strap_item["discount_amount"] == "0"
        assert strap_item["unit_price"] == "100000"
        assert strap_item["total_price"] == "100000"
        assert strap_item["is_discounted"] is False
        assert strap_item["applied_promotion"] is None


@pytest.mark.django_db
class TestEnhancedCouponValidation:
    def test_validate_coupon_with_affected_items_and_min_order(
        self, auth_client, create_user, create_product, create_coupon
    ):
        user = create_user()
        client = auth_client(user)
        prod = create_product(base_price=Decimal("200000"))
        coupon = create_coupon(
            code="SAVE50K",
            discount_type=DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("50000"),
            min_order_subtotal=Decimal("300000"),
            per_user_usage_limit=3,
        )

        # Cart with 2 items = 400,000 Rial (meets min_order 300,000)
        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 2},
            format="json",
        )

        url = reverse("api_v1:promotions:coupon-validate")
        resp = client.post(url, {"code": "SAVE50K"}, format="json")

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["valid"] is True
        assert data["discount_amount"] == "50000"
        assert data["min_order_status"]["met"] is True
        assert data["min_order_status"]["required_amount"] == "300000"
        assert data["min_order_status"]["current_amount"] == "400000"
        assert data["remaining_eligibility"] == 3
        assert len(data["affected_items"]) == 1
        assert data["affected_items"][0]["eligible_for_coupon"] is True


@pytest.mark.django_db
class TestPaymentAndHistoricalSnapshots:
    def test_payment_amount_strictly_equals_order_total(
        self, auth_client, create_user, create_product, create_promotion, create_coupon, create_address
    ):
        user = create_user()
        client = auth_client(user)
        address = create_address(user=user)
        prod = create_product(base_price=Decimal("400000"))

        create_promotion(
            name="Promo 50k",
            discount_type=DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("50000"),
            included_products=[prod],
        )
        create_coupon(
            code="COUPON20K",
            discount_type=DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("20000"),
        )

        # Add 1 item = 400,000. Promo = 50,000 -> 350,000. Coupon = 20,000 -> 330,000.
        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 1},
            format="json",
        )
        order_resp = client.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address.id), "coupon_code": "COUPON20K"},
            format="json",
        )
        assert order_resp.status_code == status.HTTP_201_CREATED
        order_data = order_resp.json()
        order_id = order_data["id"]

        # Process payment
        pay_url = reverse("api_v1:payments:create-payment")
        pay_resp = client.post(pay_url, {"order_id": order_id}, format="json")
        assert pay_resp.status_code == status.HTTP_201_CREATED
        pay_data = pay_resp.json()

        assert pay_data["amount"] == order_data["total"]
        assert pay_data["status"] == "succeeded"

    def test_historical_order_and_items_survive_promotion_and_coupon_deletion(
        self, auth_client, create_user, create_product, create_promotion, create_coupon, create_address
    ):
        user = create_user()
        client = auth_client(user)
        address = create_address(user=user)
        prod = create_product(name="Timeless Chronograph", base_price=Decimal("1000000"))

        promo = create_promotion(
            name="Flash 20",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("20"),
            included_products=[prod],
        )
        coupon = create_coupon(
            code="SPECIAL100K",
            discount_type=DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("100000"),
        )

        client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 1},
            format="json",
        )
        order_resp = client.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address.id), "coupon_code": "SPECIAL100K"},
            format="json",
        )
        assert order_resp.status_code == status.HTTP_201_CREATED
        order_id = order_resp.json()["id"]

        # NOW: Delete the Promotion and Coupon from the database!
        promo.delete()
        coupon.delete()

        # Re-fetch order via detail API
        detail_url = reverse("api_v1:orders:detail", kwargs={"pk": order_id})
        detail_resp = client.get(detail_url)
        assert detail_resp.status_code == status.HTTP_200_OK
        historical_order = detail_resp.json()

        # Assert all historical discount snapshots are 100% preserved
        assert historical_order["subtotal"] == "1000000"
        assert historical_order["discount_amount"] == "300000"  # 200k promo + 100k coupon
        assert historical_order["coupon_code"] == "SPECIAL100K"
        assert historical_order["coupon_snapshot"]["code"] == "SPECIAL100K"
        assert historical_order["coupon_snapshot"]["coupon_discount_applied"] == "100000"

        historical_item = historical_order["items"][0]
        assert historical_item["original_unit_price"] == "1000000"
        assert historical_item["discount_amount"] == "200000"
        assert historical_item["unit_price"] == "800000"
        assert historical_item["total_price"] == "800000"
        assert historical_item["promotion_snapshot"]["name"] == "Flash 20"


@pytest.mark.django_db(transaction=True)
class TestConcurrentCouponRedemptionAndCheckout:
    """Rigorous concurrency and limit enforcement test suite."""

    def test_concurrent_coupon_redemption_respects_global_limit(
        self, create_user, create_product, create_coupon
    ):
        import threading
        from apps.orders.models import Order
        from rest_framework.exceptions import ValidationError

        coupon = create_coupon(
            code="RACE100",
            discount_type=DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("50000"),
            total_usage_limit=1,
            per_user_usage_limit=1,
        )

        user1 = create_user(email="race1@example.com")
        user2 = create_user(email="race2@example.com")

        order1 = Order.objects.create(
            user=user1,
            order_number="ORD-RACE-1",
            subtotal=Decimal("200000"),
            shipping_cost=Decimal("0"),
            discount_amount=Decimal("50000"),
            total=Decimal("150000"),
        )
        order2 = Order.objects.create(
            user=user2,
            order_number="ORD-RACE-2",
            subtotal=Decimal("200000"),
            shipping_cost=Decimal("0"),
            discount_amount=Decimal("50000"),
            total=Decimal("150000"),
        )

        results = []
        errors = []

        def redeem(u, o):
            from django.db import connection
            try:
                usage = CouponService.redeem_coupon(
                    coupon=coupon,
                    user=u,
                    order=o,
                    discount_amount=Decimal("50000"),
                )
                results.append(usage)
            except ValidationError as e:
                errors.append(e)
            finally:
                connection.close()

        t1 = threading.Thread(target=redeem, args=(user1, order1))
        t2 = threading.Thread(target=redeem, args=(user2, order2))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Exactly 1 redemption must succeed and 1 must fail with ValidationError
        assert len(results) == 1
        assert len(errors) == 1
        coupon.refresh_from_db()
        assert coupon.usage_count == 1
        assert CouponUsage.objects.filter(coupon=coupon).count() == 1

    def test_full_17_step_manual_business_scenario(
        self, auth_client, create_user, create_product, create_address
    ):
        """
        Executes the exact 17-step end-to-end scenario:
        1. Admin creates 20% promotion.
        2. Promotion targets a real product.
        3. Customer opens product.
        4. Discount is displayed.
        5. Customer adds product.
        6. Cart shows original price and discount.
        7. Customer enters valid coupon.
        8. Backend validates coupon.
        9. Cart shows correct savings.
        10. Customer checks out.
        11. Order stores immutable discount snapshot.
        12. Payment uses final order total.
        13. Admin opens order.
        14. Admin sees discount breakdown.
        15. Promotion is disabled.
        16. Existing order remains unchanged.
        17. New order no longer receives promotion.
        """
        # Step 1 & 2: Admin creates 20% promotion targeting product
        admin = create_user(email="chief.admin@paradox.local", is_staff=True, is_superuser=True)
        admin_client = auth_client(admin)

        prod = create_product(base_price=Decimal("1000000"), is_active=True)

        promo_payload = {
            "name": "Mid-Season 20%",
            "slug": "mid-season-20",
            "discount_type": "percentage",
            "discount_value": 20,
            "is_active": True,
            "priority": 1,
            "included_products": [str(prod.id)],
        }
        create_promo_resp = admin_client.post(
            reverse("api_v1:admin:promotions-list"), promo_payload, format="json"
        )
        assert create_promo_resp.status_code == status.HTTP_201_CREATED
        promo_id = create_promo_resp.json()["id"]

        # Also create a 50k coupon
        coupon_payload = {
            "code": "LOYALTY50K",
            "description": "50k Toman VIP voucher",
            "discount_type": "fixed_amount",
            "discount_value": 50000,
            "min_order_subtotal": 500000,
            "is_active": True,
            "total_usage_limit": 10,
            "per_user_usage_limit": 1,
            "audience_type": "all",
        }
        create_cpn_resp = admin_client.post(
            reverse("api_v1:admin:coupons-list"), coupon_payload, format="json"
        )
        assert create_cpn_resp.status_code == status.HTTP_201_CREATED

        # Step 3 & 4: Customer opens product, discount is displayed
        customer = create_user(email="patron@paradox.local")
        customer_client = auth_client(customer)
        address = create_address(user=customer)

        prod_resp = customer_client.get(reverse("api_v1:products:detail", kwargs={"slug": prod.slug}))
        assert prod_resp.status_code == status.HTTP_200_OK
        prod_data = prod_resp.json()
        assert prod_data["base_price"] == "1000000"
        assert prod_data["discounted_price"] == 800000
        assert prod_data["is_discounted"] is True
        assert prod_data["active_promotion"]["discount_percentage"] == 20
        assert prod_data["active_promotion"]["savings"] == 200000

        # Step 5 & 6: Customer adds product; Cart shows original price and discount
        add_cart_resp = customer_client.post(
            reverse("api_v1:cart:item-list"),
            {"product_id": str(prod.id), "quantity": 1},
            format="json",
        )
        assert add_cart_resp.status_code == status.HTTP_201_CREATED

        cart_resp = customer_client.get(reverse("api_v1:cart:detail"))
        assert cart_resp.status_code == status.HTTP_200_OK
        cart_data = cart_resp.json()
        assert cart_data["subtotal"] == "1000000"
        assert cart_data["discount_amount"] == "200000"
        assert cart_data["total"] == "800000"
        assert cart_data["savings"] == "200000"

        # Step 7 & 8: Customer enters valid coupon; Backend validates coupon
        validate_resp = customer_client.post(
            reverse("api_v1:promotions:coupon-validate"),
            {"code": "loyalty50k"},
            format="json",
        )
        assert validate_resp.status_code == status.HTTP_200_OK
        assert validate_resp.json()["valid"] is True
        assert validate_resp.json()["discount_value"] == "50000"

        # Step 9: Cart Preview with coupon
        preview_resp = customer_client.post(
            reverse("api_v1:promotions:cart-discount-preview"),
            {"coupon_code": "LOYALTY50K"},
            format="json",
        )
        assert preview_resp.status_code == status.HTTP_200_OK
        preview_data = preview_resp.json()
        assert preview_data["subtotal_before_discounts"] == "1000000"
        assert preview_data["promotion_total"] == "200000"
        assert preview_data["coupon_discount"] == "50000"
        assert preview_data["total_discount"] == "250000"
        assert preview_data["subtotal_after_discounts"] == "750000"

        # Step 10 & 11: Customer checks out; Order stores immutable discount snapshot
        checkout_resp = customer_client.post(
            reverse("api_v1:orders:checkout"),
            {"address_id": str(address.id), "coupon_code": "LOYALTY50K"},
            format="json",
        )
        assert checkout_resp.status_code == status.HTTP_201_CREATED
        order_data = checkout_resp.json()
        order_id = order_data["id"]
        assert order_data["subtotal"] == "1000000"
        assert order_data["discount_amount"] == "250000"  # 200k promo + 50k coupon
        assert order_data["coupon_code"] == "LOYALTY50K"
        assert order_data["coupon_snapshot"]["code"] == "LOYALTY50K"
        assert order_data["coupon_snapshot"]["coupon_discount_applied"] == "50000"
        expected_total = str(Decimal("1000000") - Decimal("250000") + Decimal(order_data["shipping_cost"]))
        assert order_data["total"] == expected_total

        # Step 12: Payment uses final order total
        pay_resp = customer_client.post(
            reverse("api_v1:payments:create-payment"),
            {"order_id": order_id, "idempotency_key": f"pay-key-{order_id}"},
            format="json",
        )
        assert pay_resp.status_code == status.HTTP_201_CREATED
        assert pay_resp.json()["amount"] == expected_total
        assert pay_resp.json()["status"] == "succeeded"

        # Step 13 & 14: Admin opens order; sees discount breakdown
        admin_order_resp = admin_client.get(
            reverse("api_v1:admin:orders-detail", kwargs={"pk": order_id})
        )
        assert admin_order_resp.status_code == status.HTTP_200_OK
        admin_order = admin_order_resp.json()
        assert admin_order["subtotal"] == "1000000"
        assert admin_order["discount_amount"] == "250000"
        assert admin_order["coupon_code"] == "LOYALTY50K"
        assert admin_order["items"][0]["original_unit_price"] == "1000000"
        assert admin_order["items"][0]["discount_amount"] == "200000"
        assert admin_order["items"][0]["unit_price"] == "800000"

        # Step 15: Promotion is disabled
        toggle_promo_resp = admin_client.post(
            reverse("api_v1:admin:promotions-toggle", kwargs={"pk": promo_id})
        )
        assert toggle_promo_resp.status_code == status.HTTP_200_OK
        assert toggle_promo_resp.json()["is_active"] is False

        # Step 16: Existing order remains unchanged
        refetched_order = customer_client.get(
            reverse("api_v1:orders:detail", kwargs={"pk": order_id})
        ).json()
        assert refetched_order["subtotal"] == "1000000"
        assert refetched_order["discount_amount"] == "250000"
        assert refetched_order["total"] == expected_total

        # Step 17: New order / product no longer receives promotion
        new_prod_resp = customer_client.get(
            reverse("api_v1:products:detail", kwargs={"slug": prod.slug})
        ).json()
        assert new_prod_resp["discounted_price"] is None
        assert new_prod_resp["is_discounted"] is False
        assert new_prod_resp["active_promotion"] is None


