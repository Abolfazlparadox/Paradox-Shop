from rest_framework import serializers

from apps.products.models import ProductComment
from apps.reviews.models import (
    ProductQuestion,
    QuestionAnswer,
    QuestionReport,
    Review,
    ReviewImage,
    ReviewReport,
    ReviewResponse,
)
from apps.reviews.serializers import (
    QuestionAnswerSerializer,
    ReviewImageSerializer,
    ReviewResponseSerializer,
)


class AdminReviewListSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    author_name = serializers.CharField(source="user.full_name", read_only=True)
    author_email = serializers.CharField(source="user.email", read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)
    staff_response = ReviewResponseSerializer(read_only=True)
    reports_count = serializers.IntegerField(source="reports.count", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_slug",
            "author_name",
            "author_email",
            "rating",
            "title",
            "body",
            "pros",
            "cons",
            "status",
            "rejection_reason",
            "is_verified_purchase",
            "is_approved",
            "helpful_count",
            "unhelpful_count",
            "images",
            "staff_response",
            "reports_count",
            "created_at",
            "updated_at",
        ]


class AdminReviewModerateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Review.ReviewStatus.choices, required=False)
    is_approved = serializers.BooleanField(required=False)
    rejection_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class AdminReviewStaffResponseSerializer(serializers.Serializer):
    response_text = serializers.CharField(required=True, min_length=2)


# =====================================================================
# Q&A ADMIN SERIALIZERS
# =====================================================================

class AdminQuestionListSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    author_name = serializers.CharField(source="user.full_name", read_only=True)
    author_email = serializers.CharField(source="user.email", read_only=True)
    answer = QuestionAnswerSerializer(read_only=True)
    reports_count = serializers.IntegerField(source="reports.count", read_only=True)

    class Meta:
        model = ProductQuestion
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_slug",
            "author_name",
            "author_email",
            "question",
            "status",
            "rejection_reason",
            "answer",
            "reports_count",
            "created_at",
            "updated_at",
        ]


class AdminQuestionModerateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ProductQuestion.QuestionStatus.choices, required=False)
    is_approved = serializers.BooleanField(required=False)
    rejection_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class AdminQuestionAnswerCreateSerializer(serializers.Serializer):
    answer = serializers.CharField(required=True, min_length=2)


class AdminReviewReportListSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="review.product.name", read_only=True)
    reporting_user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = ReviewReport
        fields = [
            "id",
            "review_id",
            "product_name",
            "reporting_user_email",
            "reason",
            "details",
            "status",
            "created_at",
        ]


# =====================================================================
# LEGACY COMMENT SERIALIZERS
# =====================================================================

class AdminCommentReplySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="user.full_name", read_only=True)
    author_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = ProductComment
        fields = [
            "id",
            "author_name",
            "author_email",
            "content",
            "is_approved",
            "created_at",
        ]


class AdminCommentListSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    author_name = serializers.CharField(source="user.full_name", read_only=True)
    author_email = serializers.CharField(source="user.email", read_only=True)
    is_staff_reply = serializers.BooleanField(source="user.is_staff", read_only=True)
    replies_count = serializers.IntegerField(source="replies.count", read_only=True)
    replies = AdminCommentReplySerializer(many=True, read_only=True)

    class Meta:
        model = ProductComment
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_slug",
            "author_name",
            "author_email",
            "parent_id",
            "content",
            "is_approved",
            "is_staff_reply",
            "replies_count",
            "replies",
            "created_at",
            "updated_at",
        ]


class AdminModerationActionSerializer(serializers.Serializer):
    is_approved = serializers.BooleanField(required=True)


class AdminCommentReplyCreateSerializer(serializers.Serializer):
    content = serializers.CharField(required=True, min_length=2)
