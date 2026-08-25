from rest_framework import serializers
from apps.products.models import Brand, Product, ProductImage, ProductVariant, ProductAttributeValue
from apps.categories.models import Category


class AdminCategorySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class AdminBrandSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug"]


class AdminProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "variant", "image", "alt_text", "sort_order", "is_primary"]


class AdminProductVariantSerializer(serializers.ModelSerializer):
    final_price = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "sku",
            "name",
            "price_override",
            "final_price",
            "stock",
            "is_active",
            "attributes",
        ]


class AdminProductAttributeValueSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source="attribute.name", read_only=True)
    attribute_type = serializers.CharField(source="attribute.attribute_type", read_only=True)

    class Meta:
        model = ProductAttributeValue
        fields = ["id", "attribute", "attribute_name", "attribute_type", "value_text", "value_number", "value_boolean"]


class AdminProductListSerializer(serializers.ModelSerializer):
    category = AdminCategorySummarySerializer(read_only=True)
    brand = AdminBrandSummarySerializer(read_only=True)
    variants = AdminProductVariantSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "brand",
            "product_type",
            "base_price",
            "stock",
            "is_active",
            "is_featured",
            "primary_image",
            "variants",
            "created_at",
            "updated_at",
        ]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        return img.image.url if img and img.image else None

    def get_stock(self, obj):
        if obj.variants.exists():
            return sum([v.stock for v in obj.variants.all()])
        return 0


class AdminProductDetailSerializer(AdminProductListSerializer):
    images = AdminProductImageSerializer(many=True, read_only=True)
    attribute_values = AdminProductAttributeValueSerializer(many=True, read_only=True)

    class Meta(AdminProductListSerializer.Meta):
        fields = AdminProductListSerializer.Meta.fields + ["description", "short_description", "images", "attribute_values"]


class AdminProductCreateUpdateSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    variants = AdminProductVariantSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "brand",
            "category",
            "description",
            "short_description",
            "base_price",
            "product_type",
            "is_active",
            "is_featured",
            "variants",
        ]


class AdminInventoryVariantSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    category_name = serializers.CharField(source="product.category.name", read_only=True, default="Uncategorized")
    final_price = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_slug",
            "category_name",
            "sku",
            "name",
            "final_price",
            "stock",
            "is_active",
            "primary_image",
            "updated_at",
        ]

    def get_primary_image(self, obj):
        img = obj.images.first() or obj.product.images.first()
        return img.image.url if img and img.image else None


class AdminInventoryStockUpdateSerializer(serializers.Serializer):
    stock = serializers.IntegerField(min_value=0)


class AdminInventoryBatchStockItemSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    variant_id = serializers.UUIDField(required=False)
    stock = serializers.IntegerField(min_value=0)


class AdminInventoryBatchStockSerializer(serializers.Serializer):
    items = AdminInventoryBatchStockItemSerializer(many=True, allow_empty=False)
