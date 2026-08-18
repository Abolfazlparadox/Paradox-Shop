from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for a public Review representation."""

    user_display_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product",
            "user_display_name",
            "rating",
            "title",
            "body",
            "is_verified_purchase",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_user_display_name(self, obj) -> str:
        """
        Returns a privacy-safe display name for the reviewer.
        Uses the user's full name if available, otherwise returns 'Anonymous'.
        The user's email is never exposed on the public review endpoint.
        """
        full_name = obj.user.full_name
        if full_name and full_name.strip() and full_name != obj.user.email:
            return full_name
        return "Anonymous"


class CreateReviewSerializer(serializers.Serializer):
    """Validates the payload for submitting a new product Review."""

    product_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    title = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=255)
    body = serializers.CharField(required=False, allow_null=True, allow_blank=True)
