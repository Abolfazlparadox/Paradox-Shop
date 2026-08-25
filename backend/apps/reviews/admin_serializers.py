from rest_framework import serializers
from apps.reviews.models import Review
from apps.products.models import ProductComment


class AdminReviewListSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    author_name = serializers.CharField(source="user.full_name", read_only=True)
    author_email = serializers.CharField(source="user.email", read_only=True)

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
            "is_verified_purchase",
            "is_approved",
            "created_at",
            "updated_at",
        ]


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
    sentiment = serializers.SerializerMethodField()

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
            "sentiment",
            "created_at",
            "updated_at",
        ]

    def get_sentiment(self, obj):
        # Tone sentiment classification indicator
        content = obj.content.lower()
        if any(w in content for w in ["scratch", "broken", "issue", "problem", "delay", "fake"]):
            return "NEGATIVE"
        if any(w in content for w in ["perfect", "great", "excellent", "amazing", "beautiful", "love", "masterpiece"]):
            return "POSITIVE"
        return "NEUTRAL"


class AdminModerationActionSerializer(serializers.Serializer):
    is_approved = serializers.BooleanField(required=True)


class AdminCommentReplyCreateSerializer(serializers.Serializer):
    content = serializers.CharField(required=True, min_length=2)
