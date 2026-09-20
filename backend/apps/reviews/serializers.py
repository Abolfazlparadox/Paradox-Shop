from rest_framework import serializers

from .models import (
    ProductQuestion,
    QuestionAnswer,
    QuestionReport,
    Review,
    ReviewImage,
    ReviewReport,
    ReviewResponse,
    ReviewVote,
)


class ReviewImageSerializer(serializers.ModelSerializer):
    """Media attachment serialization for a customer review."""

    class Meta:
        model = ReviewImage
        fields = [
            "id",
            "image",
            "thumbnail",
            "original_filename",
            "file_size",
            "mime_type",
            "is_processed",
            "sort_order",
            "created_at",
        ]
        read_only_fields = fields


class ReviewResponseSerializer(serializers.ModelSerializer):
    """Authoritative staff response serialization."""

    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = ReviewResponse
        fields = [
            "id",
            "staff_name",
            "response_text",
            "is_official",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_staff_name(self, obj) -> str:
        return "Paradox Team"


class ReviewSerializer(serializers.ModelSerializer):
    """Public representation of an approved review on storefront."""

    user_display_name = serializers.SerializerMethodField(read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)
    staff_response = ReviewResponseSerializer(read_only=True)
    user_vote = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product",
            "user_display_name",
            "rating",
            "title",
            "body",
            "pros",
            "cons",
            "is_verified_purchase",
            "helpful_count",
            "unhelpful_count",
            "user_vote",
            "images",
            "staff_response",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_user_display_name(self, obj) -> str:
        full_name = obj.user.full_name
        if full_name and full_name.strip() and full_name != obj.user.email:
            return full_name
        return "Anonymous Patron"

    def get_user_vote(self, obj) -> bool | None:
        # Context may pass pre-fetched user_votes mapping {review_id: bool}
        user_votes_map = self.context.get("user_votes_map")
        if user_votes_map is not None:
            return user_votes_map.get(str(obj.id))
        
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            vote = ReviewVote.objects.filter(review=obj, user=request.user).first()
            return vote.is_helpful if vote else None
        return None


class UserReviewSerializer(serializers.ModelSerializer):
    """Representation for reviews owned by the authenticated user in Dashboard."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)
    staff_response = ReviewResponseSerializer(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product",
            "product_name",
            "product_slug",
            "rating",
            "title",
            "body",
            "pros",
            "cons",
            "status",
            "rejection_reason",
            "is_verified_purchase",
            "helpful_count",
            "unhelpful_count",
            "images",
            "staff_response",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class CreateReviewSerializer(serializers.Serializer):
    """Validates payload for creating a new review."""

    product_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    title = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=255)
    body = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    pros = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False, default=list
    )
    cons = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False, default=list
    )


class UpdateReviewSerializer(serializers.Serializer):
    """Validates payload for updating an existing review."""

    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    title = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=255)
    body = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    pros = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False
    )
    cons = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False
    )
    delete_image_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )


class ReviewVoteSerializer(serializers.Serializer):
    """Validates voting on a review."""

    is_helpful = serializers.BooleanField(default=True)


class ReviewReportSerializer(serializers.Serializer):
    """Validates abuse reporting for a review."""

    reason = serializers.ChoiceField(choices=ReviewReport.ReportReason.choices)
    details = serializers.CharField(required=False, allow_null=True, allow_blank=True)


# =====================================================================
# Q&A SERIALIZERS
# =====================================================================

class QuestionAnswerSerializer(serializers.ModelSerializer):
    """Staff answer representation."""

    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = QuestionAnswer
        fields = [
            "id",
            "staff_name",
            "answer",
            "is_official",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_staff_name(self, obj) -> str:
        return "Paradox Support"


class ProductQuestionSerializer(serializers.ModelSerializer):
    """Public representation of an approved product question."""

    user_display_name = serializers.SerializerMethodField()
    answer = QuestionAnswerSerializer(read_only=True)

    class Meta:
        model = ProductQuestion
        fields = [
            "id",
            "product",
            "user_display_name",
            "question",
            "answer",
            "created_at",
        ]
        read_only_fields = fields

    def get_user_display_name(self, obj) -> str:
        full_name = obj.user.full_name
        if full_name and full_name.strip() and full_name != obj.user.email:
            return full_name
        return "Patron Inquiry"


class UserProductQuestionSerializer(serializers.ModelSerializer):
    """Customer Dashboard representation of their own questions."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    answer = QuestionAnswerSerializer(read_only=True)

    class Meta:
        model = ProductQuestion
        fields = [
            "id",
            "product",
            "product_name",
            "product_slug",
            "question",
            "status",
            "rejection_reason",
            "answer",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class CreateProductQuestionSerializer(serializers.Serializer):
    """Validates payload for asking a question."""

    product_id = serializers.UUIDField()
    question = serializers.CharField(min_length=5, max_length=1000)


class QuestionReportSerializer(serializers.Serializer):
    """Validates abuse reporting for a question."""

    reason = serializers.CharField(max_length=50)
    details = serializers.CharField(required=False, allow_null=True, allow_blank=True)
