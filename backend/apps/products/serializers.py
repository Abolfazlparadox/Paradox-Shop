from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.categories.serializers import CategoryMiniSerializer

from .models import Brand, Product, ProductAttributeValue, ProductImage, ProductVariant


class BrandSerializer(serializers.ModelSerializer):
    """Lightweight Brand representation embedded in Product responses."""

    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo"]


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for a Product's gallery images."""

    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "sort_order", "is_primary", "variant"]


class ProductVariantSerializer(serializers.ModelSerializer):
    """Serializer for a Product's purchasable SKU/variant."""

    final_price = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    discounted_price = serializers.SerializerMethodField()
    is_discounted = serializers.SerializerMethodField()
    active_promotion = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "sku",
            "name",
            "price_override",
            "final_price",
            "discounted_price",
            "is_discounted",
            "active_promotion",
            "stock",
            "is_active",
            "attributes",
        ]

    def _get_pricing(self, obj):
        if not hasattr(obj, "_promo_cache"):
            from apps.promotions.selectors import PromotionSelector
            from apps.promotions.services import PromotionEngine

            matching_promos = PromotionSelector.get_promotions_for_product(obj.product)
            best_promo, discount = PromotionEngine._find_best_promotion_for_product(
                obj.product, matching_promos, obj.final_price
            )
            discounted = obj.final_price - discount if discount > 0 else None
            promo_info = None
            if best_promo and discount > 0:
                pct = (
                    round((discount / obj.final_price) * 100)
                    if obj.final_price > 0
                    else 0
                )
                promo_info = {
                    "id": str(best_promo.id),
                    "name": best_promo.name,
                    "discount_type": best_promo.discount_type,
                    "discount_value": best_promo.discount_value,
                    "savings": discount,
                    "discount_percentage": pct,
                }
            obj._promo_cache = {
                "discounted_price": discounted,
                "is_discounted": discounted is not None,
                "active_promotion": promo_info,
            }
        return obj._promo_cache

    @extend_schema_field({"type": "number", "nullable": True})
    def get_discounted_price(self, obj):
        return self._get_pricing(obj)["discounted_price"]

    @extend_schema_field({"type": "boolean"})
    def get_is_discounted(self, obj):
        return self._get_pricing(obj)["is_discounted"]

    @extend_schema_field(
        {
            "type": "object",
            "nullable": True,
            "properties": {
                "id": {"type": "string"},
                "name": {"type": "string"},
                "discount_type": {"type": "string"},
                "discount_value": {"type": "number"},
                "savings": {"type": "number"},
                "discount_percentage": {"type": "integer"},
            },
        }
    )
    def get_active_promotion(self, obj):
        return self._get_pricing(obj)["active_promotion"]


class ProductAttributeValueSerializer(serializers.ModelSerializer):
    """Serializer exposing a Product's concrete value for a Category-defined dynamic attribute."""

    attribute_id = serializers.UUIDField(source="attribute.id", read_only=True)
    attribute_name = serializers.CharField(source="attribute.name", read_only=True)
    attribute_type = serializers.CharField(source="attribute.attribute_type", read_only=True)
    value = serializers.SerializerMethodField()

    class Meta:
        model = ProductAttributeValue
        fields = [
            "id",
            "attribute_id",
            "attribute_name",
            "attribute_type",
            "value",
        ]

    @extend_schema_field(
        {"oneOf": [{"type": "string"}, {"type": "number"}, {"type": "boolean"}], "nullable": True}
    )
    def get_value(self, obj):
        if obj.value_text is not None:
            return obj.value_text
        if obj.value_number is not None:
            return obj.value_number
        return obj.value_boolean


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight Product representation for the paginated catalog listing endpoint."""

    brand = BrandSerializer(read_only=True)
    category = CategoryMiniSerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()
    is_discounted = serializers.SerializerMethodField()
    active_promotion = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "short_description",
            "base_price",
            "discounted_price",
            "is_discounted",
            "active_promotion",
            "product_type",
            "is_featured",
            "brand",
            "category",
            "primary_image",
        ]

    def _get_pricing(self, obj):
        if not hasattr(obj, "_promo_cache"):
            from apps.promotions.selectors import PromotionSelector
            from apps.promotions.services import PromotionEngine

            matching_promos = PromotionSelector.get_promotions_for_product(obj)
            best_promo, discount = PromotionEngine._find_best_promotion_for_product(
                obj, matching_promos, obj.base_price
            )
            discounted = obj.base_price - discount if discount > 0 else None
            promo_info = None
            if best_promo and discount > 0:
                pct = (
                    round((discount / obj.base_price) * 100)
                    if obj.base_price > 0
                    else 0
                )
                promo_info = {
                    "id": str(best_promo.id),
                    "name": best_promo.name,
                    "discount_type": best_promo.discount_type,
                    "discount_value": best_promo.discount_value,
                    "savings": discount,
                    "discount_percentage": pct,
                }
            obj._promo_cache = {
                "discounted_price": discounted,
                "is_discounted": discounted is not None,
                "active_promotion": promo_info,
            }
        return obj._promo_cache

    @extend_schema_field({"type": "string", "format": "uri", "nullable": True})
    def get_primary_image(self, obj):
        request = self.context.get("request")
        primary_images = getattr(obj, "primary_images", None)
        image_obj = primary_images[0] if primary_images else None

        if image_obj is None or not image_obj.image:
            return None

        url = image_obj.image.url
        return request.build_absolute_uri(url) if request else url

    @extend_schema_field({"type": "number", "nullable": True})
    def get_discounted_price(self, obj):
        return self._get_pricing(obj)["discounted_price"]

    @extend_schema_field({"type": "boolean"})
    def get_is_discounted(self, obj):
        return self._get_pricing(obj)["is_discounted"]

    @extend_schema_field(
        {
            "type": "object",
            "nullable": True,
            "properties": {
                "id": {"type": "string"},
                "name": {"type": "string"},
                "discount_type": {"type": "string"},
                "discount_value": {"type": "number"},
                "savings": {"type": "number"},
                "discount_percentage": {"type": "integer"},
            },
        }
    )
    def get_active_promotion(self, obj):
        return self._get_pricing(obj)["active_promotion"]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full Product representation including brand, category, images, variants and attributes."""

    brand = BrandSerializer(read_only=True)
    category = CategoryMiniSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    attribute_values = ProductAttributeValueSerializer(many=True, read_only=True)
    discounted_price = serializers.SerializerMethodField()
    is_discounted = serializers.SerializerMethodField()
    active_promotion = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "short_description",
            "base_price",
            "discounted_price",
            "is_discounted",
            "active_promotion",
            "product_type",
            "is_active",
            "is_featured",
            "brand",
            "category",
            "images",
            "variants",
            "attribute_values",
            "created_at",
        ]

    def _get_pricing(self, obj):
        if not hasattr(obj, "_promo_cache"):
            from apps.promotions.selectors import PromotionSelector
            from apps.promotions.services import PromotionEngine

            matching_promos = PromotionSelector.get_promotions_for_product(obj)
            best_promo, discount = PromotionEngine._find_best_promotion_for_product(
                obj, matching_promos, obj.base_price
            )
            discounted = obj.base_price - discount if discount > 0 else None
            promo_info = None
            if best_promo and discount > 0:
                pct = (
                    round((discount / obj.base_price) * 100)
                    if obj.base_price > 0
                    else 0
                )
                promo_info = {
                    "id": str(best_promo.id),
                    "name": best_promo.name,
                    "discount_type": best_promo.discount_type,
                    "discount_value": best_promo.discount_value,
                    "savings": discount,
                    "discount_percentage": pct,
                }
            obj._promo_cache = {
                "discounted_price": discounted,
                "is_discounted": discounted is not None,
                "active_promotion": promo_info,
            }
        return obj._promo_cache

    @extend_schema_field({"type": "number", "nullable": True})
    def get_discounted_price(self, obj):
        return self._get_pricing(obj)["discounted_price"]

    @extend_schema_field({"type": "boolean"})
    def get_is_discounted(self, obj):
        return self._get_pricing(obj)["is_discounted"]

    @extend_schema_field(
        {
            "type": "object",
            "nullable": True,
            "properties": {
                "id": {"type": "string"},
                "name": {"type": "string"},
                "discount_type": {"type": "string"},
                "discount_value": {"type": "number"},
                "savings": {"type": "number"},
                "discount_percentage": {"type": "integer"},
            },
        }
    )
    def get_active_promotion(self, obj):
        return self._get_pricing(obj)["active_promotion"]


class ProductCommentReplySerializer(serializers.ModelSerializer):
    """Serializer for admin reply comments attached to a parent root comment."""

    author_name = serializers.SerializerMethodField()
    is_staff_reply = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        from .models import ProductComment

        model = ProductComment
        fields = [
            "id",
            "author_name",
            "is_staff_reply",
            "content",
            "created_at",
        ]

    def get_author_name(self, obj) -> str:
        if obj.user.is_staff:
            name = obj.user.first_name.strip() if obj.user.first_name else ""
            return f"{name} (Atelier Support)" if name else "Paradox Support"
        if obj.user.first_name:
            last = f" {obj.user.last_name[:1]}." if obj.user.last_name else ""
            return f"{obj.user.first_name}{last}"
        local = obj.user.email.split("@")[0]
        return f"{local[:3]}***" if len(local) >= 3 else "Verified Client"


class ProductCommentSerializer(serializers.ModelSerializer):
    """
    Public Threaded Product Comment representation with nested approved replies.
    Strictly excludes sensitive user credentials (email, phone, user UUID).
    """

    author_name = serializers.SerializerMethodField()
    is_staff_reply = serializers.BooleanField(source="user.is_staff", read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        from .models import ProductComment

        model = ProductComment
        fields = [
            "id",
            "author_name",
            "is_staff_reply",
            "content",
            "created_at",
            "replies",
        ]

    def get_author_name(self, obj) -> str:
        if obj.user.is_staff:
            name = obj.user.first_name.strip() if obj.user.first_name else ""
            return f"{name} (Atelier Support)" if name else "Paradox Support"
        if obj.user.first_name:
            last = f" {obj.user.last_name[:1]}." if obj.user.last_name else ""
            return f"{obj.user.first_name}{last}"
        local = obj.user.email.split("@")[0]
        return f"{local[:3]}***" if len(local) >= 3 else "Verified Client"

    @extend_schema_field(ProductCommentReplySerializer(many=True))
    def get_replies(self, obj):
        approved_replies = [r for r in obj.replies.all() if r.is_approved]
        return ProductCommentReplySerializer(approved_replies, many=True).data


class ProductCommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating root comments (verified users) or replies (staff only)."""

    content = serializers.CharField(
        min_length=3,
        max_length=1000,
        error_messages={
            "min_length": "Comment must be at least 3 characters long.",
            "max_length": "Comment cannot exceed 1000 characters.",
        },
    )

    class Meta:
        from .models import ProductComment

        model = ProductComment
        fields = ["id", "parent", "content"]

    def validate(self, attrs):
        request = self.context.get("request")
        parent = attrs.get("parent")
        product = self.context.get("product")

        if parent:
            # 1. Staff permission gate for replies
            if not bool(request and request.user and request.user.is_staff):
                raise serializers.ValidationError(
                    {"parent": "Only staff administrators are permitted to reply to comments."}
                )

            # 2. Parent must belong to the exact same product
            if product and parent.product_id != product.id:
                raise serializers.ValidationError(
                    {"parent": "Parent comment does not belong to this product."}
                )

            # 3. Maximum 1-level deep hierarchy: Cannot reply to a reply
            if parent.parent_id is not None:
                raise serializers.ValidationError(
                    {"parent": "Nested replies to existing replies are not permitted."}
                )

        return attrs
