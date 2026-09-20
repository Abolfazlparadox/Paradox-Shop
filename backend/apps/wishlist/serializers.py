import uuid
from rest_framework import serializers

from apps.products.models import Product, ProductImage, ProductVariant
from .models import Wishlist, WishlistItem


class WishlistProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "sort_order", "is_primary"]


class WishlistVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "name", "price_override", "stock", "is_active"]


class WishlistProductSerializer(serializers.ModelSerializer):
    images = WishlistProductImageSerializer(many=True, read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True, default=None)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "base_price",
            "brand_name",
            "category_name",
            "images",
            "is_active",
            "is_featured",
        ]


class WishlistItemSerializer(serializers.ModelSerializer):
    product = WishlistProductSerializer(read_only=True)
    variant = WishlistVariantSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = [
            "id",
            "product",
            "variant",
            "created_at",
        ]


class WishlistSerializer(serializers.ModelSerializer):
    items = WishlistItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = [
            "id",
            "items_count",
            "items",
            "created_at",
            "updated_at",
        ]

    def get_items_count(self, obj) -> int:
        return obj.items.count()


class AddWishlistItemSerializer(serializers.Serializer):
    product_id = serializers.UUIDField(required=True)
    variant_id = serializers.UUIDField(required=False, allow_null=True)


class MergeWishlistSerializer(serializers.Serializer):
    product_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        required=True,
    )
