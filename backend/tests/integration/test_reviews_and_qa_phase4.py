from decimal import Decimal
import io
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status

from apps.orders.models import Order, OrderItem
from apps.reviews.models import (
    ProductQuestion,
    QuestionAnswer,
    QuestionReport,
    Review,
    ReviewImage,
    ReviewReport,
    ReviewResponse,
    ReviewVote,
)
from apps.reviews.selectors import ReviewSelector


def create_test_image_file(name="test.jpg", width=100, height=100, image_format="JPEG"):
    """Generates an in-memory image for upload testing."""
    file_io = io.BytesIO()
    image = Image.new("RGB", (width, height), color=(73, 109, 137))
    image.save(file_io, format=image_format)
    file_io.seek(0)
    return SimpleUploadedFile(name, file_io.getvalue(), content_type=f"image/{image_format.lower()}")


@pytest.mark.django_db
class TestReviewAndQAPhase4:
    """Comprehensive test suite for Phase 4 Reviews and Q&A subsystem."""

    def test_full_review_lifecycle_and_verified_purchase(
        self, auth_client, create_user, create_product, create_variant
    ):
        user = create_user(email="buyer@paradox.local")
        client = auth_client(user)
        prod = create_product(name="Chronograph Model X")
        variant = create_variant(product=prod)

        # 1. Unpurchased product cannot be reviewed
        create_url = reverse("api_v1:reviews:create")
        payload = {
            "product_id": str(prod.id),
            "rating": 5,
            "title": "Unverified attempt",
            "body": "Should fail",
        }
        resp = client.post(create_url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

        # 2. Add delivered order
        order = Order.objects.create(
            user=user,
            order_number="PDX-ORDER-401",
            status=Order.OrderStatus.DELIVERED,
            subtotal=Decimal("250000"),
            total=Decimal("250000"),
        )
        OrderItem.objects.create(
            order=order,
            product=prod,
            variant=variant,
            product_name=prod.name,
            sku=variant.sku,
            quantity=1,
            unit_price=Decimal("250000"),
            total_price=Decimal("250000"),
        )

        # 3. Check Eligibility endpoint
        eligibility_url = reverse("api_v1:reviews:product-review-eligibility", kwargs={"product_id": prod.id})
        resp = client.get(eligibility_url)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["can_review"] is True
        assert data["has_purchased"] is True
        assert data["has_reviewed"] is False

        # 4. Submit verified review with pros and cons
        valid_payload = {
            "product_id": str(prod.id),
            "rating": 5,
            "title": "Sublime Craftsmanship",
            "body": "Exceptional machining tolerances and flawless finish.",
            "pros": ["Titanium grade 5", "Zero backlash"],
            "cons": ["Heavy bracelet"],
        }
        resp = client.post(create_url, valid_payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        review_data = resp.json()
        assert review_data["rating"] == 5
        assert review_data["is_verified_purchase"] is True
        assert len(review_data["pros"]) == 2

        review_id = review_data["id"]
        review_obj = Review.objects.get(id=review_id)
        assert review_obj.status == Review.ReviewStatus.PENDING

        # 5. Cannot submit duplicate review for same product
        resp = client.post(create_url, valid_payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_review_moderation_and_staff_response(
        self, auth_client, create_user, create_product, create_variant
    ):
        buyer = create_user(email="buyer2@paradox.local")
        admin = create_user(email="curator@paradox.local", is_staff=True, is_superuser=True)
        buyer_client = auth_client(buyer)
        admin_client = auth_client(admin)
        prod = create_product(name="Atelier Desk Matrix")
        variant = create_variant(product=prod)

        # Create delivered order & review
        order = Order.objects.create(
            user=buyer,
            order_number="PDX-ORDER-402",
            status=Order.OrderStatus.DELIVERED,
            subtotal=Decimal("500000"),
            total=Decimal("500000"),
        )
        OrderItem.objects.create(
            order=order,
            product=prod,
            variant=variant,
            product_name=prod.name,
            sku=variant.sku,
            quantity=1,
            unit_price=Decimal("500000"),
            total_price=Decimal("500000"),
        )

        review = Review.objects.create(
            product=prod,
            user=buyer,
            rating=4,
            title="Great piece",
            body="Solid wood feel.",
            status=Review.ReviewStatus.PENDING,
            is_verified_purchase=True,
        )

        # 1. Moderation: Admin Approves Review
        mod_url = reverse("api_v1:admin:reviews-moderate", kwargs={"pk": review.id})
        resp = admin_client.post(mod_url, {"status": "APPROVED"}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        review.refresh_from_db()
        assert review.status == Review.ReviewStatus.APPROVED
        assert review.is_approved is True

        # 2. Staff posts official response
        respond_url = reverse("api_v1:admin:reviews-respond", kwargs={"pk": review.id})
        resp = admin_client.post(respond_url, {"response_text": "Thank you for supporting our atelier."}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert ReviewResponse.objects.filter(review=review).exists()

        # 3. Public storefront product review list exposes approved review + staff response
        list_url = reverse("api_v1:reviews:product-reviews", kwargs={"product_id": prod.id})
        resp = buyer_client.get(list_url)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["count"] == 1
        assert data["results"][0]["staff_response"] is not None
        assert data["results"][0]["staff_response"]["response_text"] == "Thank you for supporting our atelier."

        # 4. User edits approved review -> re-enters PENDING state for re-moderation
        detail_url = reverse("api_v1:reviews:review-detail", kwargs={"pk": review.id})
        resp = buyer_client.patch(detail_url, {"title": "Updated Title After Edit"}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        review.refresh_from_db()
        assert review.status == Review.ReviewStatus.PENDING
        assert review.is_approved is False

    def test_helpful_voting_and_abuse_reporting(
        self, auth_client, create_user, create_product
    ):
        author = create_user(email="author@paradox.local")
        voter1 = create_user(email="voter1@paradox.local")
        voter2 = create_user(email="voter2@paradox.local")
        prod = create_product()

        review = Review.objects.create(
            product=prod,
            user=author,
            rating=5,
            title="Detailed Critique",
            body="Comprehensive breakdown.",
            status=Review.ReviewStatus.APPROVED,
            is_verified_purchase=True,
        )

        author_client = auth_client(author)
        voter1_client = auth_client(voter1)
        voter2_client = auth_client(voter2)

        vote_url = reverse("api_v1:reviews:review-vote", kwargs={"pk": review.id})

        # 1. Author cannot vote on own review
        resp = author_client.post(vote_url, {"is_helpful": True}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

        # 2. Voter1 votes helpful
        resp = voter1_client.post(vote_url, {"is_helpful": True}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["helpful_count"] == 1
        assert resp.json()["user_vote"] is True

        # 3. Voter1 toggles vote off
        resp = voter1_client.post(vote_url, {"is_helpful": True}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["helpful_count"] == 0
        assert resp.json()["user_vote"] is None

        # 4. Voter2 reports review for spam
        report_url = reverse("api_v1:reviews:review-report", kwargs={"pk": review.id})
        resp = voter2_client.post(report_url, {"reason": "SPAM", "details": "Commercial links"}, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert ReviewReport.objects.filter(review=review, user=voter2).exists()

        # Duplicate report fails
        resp = voter2_client.post(report_url, {"reason": "SPAM"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_review_summary_aggregation_and_caching(
        self, api_client, create_user, create_product
    ):
        prod = create_product()
        u1 = create_user(email="u1@pdx.local")
        u2 = create_user(email="u2@pdx.local")
        u3 = create_user(email="u3@pdx.local")

        Review.objects.create(product=prod, user=u1, rating=5, status=Review.ReviewStatus.APPROVED, is_verified_purchase=True)
        Review.objects.create(product=prod, user=u2, rating=4, status=Review.ReviewStatus.APPROVED, is_verified_purchase=True)
        Review.objects.create(product=prod, user=u3, rating=5, status=Review.ReviewStatus.APPROVED, is_verified_purchase=False)

        summary_url = reverse("api_v1:reviews:product-review-summary", kwargs={"product_id": prod.id})
        resp = api_client.get(summary_url)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["total_reviews"] == 3
        assert data["average_rating"] == 4.7
        assert data["verified_purchases_count"] == 2
        assert data["rating_breakdown"]["5"]["count"] == 2
        assert data["rating_breakdown"]["4"]["count"] == 1

    def test_qa_subsystem_workflow(
        self, auth_client, api_client, create_user, create_product
    ):
        user = create_user(email="inquirer@paradox.local")
        staff = create_user(email="specialist@paradox.local", is_staff=True, is_superuser=True)
        prod = create_product(name="Precision Caliper")

        user_client = auth_client(user)
        staff_client = auth_client(staff)

        # 1. Ask question
        ask_url = reverse("api_v1:reviews:question-create")
        resp = user_client.post(ask_url, {"product_id": str(prod.id), "question": "What is the repeatability tolerance?"}, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        q_id = resp.json()["id"]

        q_obj = ProductQuestion.objects.get(id=q_id)
        assert q_obj.status == ProductQuestion.QuestionStatus.PENDING

        # 2. Public storefront questions endpoint does NOT show pending question yet
        list_url = reverse("api_v1:reviews:product-questions", kwargs={"product_id": prod.id})
        resp = api_client.get(list_url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["count"] == 0

        # 3. Staff answers question -> Question automatically approved
        ans_url = reverse("api_v1:admin:questions-answer", kwargs={"pk": q_id})
        resp = staff_client.post(ans_url, {"answer": "Repeatability is within +/- 0.002 mm across all axes."}, format="json")
        assert resp.status_code == status.HTTP_200_OK

        q_obj.refresh_from_db()
        assert q_obj.status == ProductQuestion.QuestionStatus.APPROVED

        # 4. Public storefront questions now exposes the answered inquiry
        resp = api_client.get(list_url)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["count"] == 1
        assert data["results"][0]["answer"]["answer"] == "Repeatability is within +/- 0.002 mm across all axes."
