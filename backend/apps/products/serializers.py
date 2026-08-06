from rest_framework import serializers

from apps.categories.serializers import CategoryMiniSerializer

from .models import Brand, Product, ProductAttributeValue, ProductImage, ProductVariant


class BrandSerializer(serializers.ModelSerializer):
    """Lightweight Brand representation embedded in Product responses."""

    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo']


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for a Product's gallery images."""

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'sort_order', 'is_primary', 'variant']


class ProductVariantSerializer(serializers.ModelSerializer):
    """Serializer for a Product's purchasable SKU/variant."""

    final_price = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = ProductVariant
        fields = ['id', 'sku', 'name', 'price_override', 'final_price', 'stock', 'is_active', 'attributes']


class ProductAttributeValueSerializer(serializers.ModelSerializer):
    """Serializer exposing a Product's concrete value for a Category-defined dynamic attribute."""

    attribute_id = serializers.UUIDField(source='attribute.id', read_only=True)
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)
    attribute_type = serializers.CharField(source='attribute.attribute_type', read_only=True)
    value = serializers.SerializerMethodField()

    class Meta:
        model = ProductAttributeValue
        fields = ['id', 'attribute_id', 'attribute_name', 'attribute_type', 'value']

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

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'short_description',
            'base_price',
            'product_type',
            'is_featured',
            'brand',
            'category',
            'primary_image',
        ]

    def get_primary_image(self, obj):
        request = self.context.get('request')
        primary_images = getattr(obj, 'primary_images', None)
        image_obj = primary_images[0] if primary_images else None

        if image_obj is None or not image_obj.image:
            return None

        url = image_obj.image.url
        return request.build_absolute_uri(url) if request else url


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full Product representation including brand, category, images, variants and attributes."""

    brand = BrandSerializer(read_only=True)
    category = CategoryMiniSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    attribute_values = ProductAttributeValueSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'short_description',
            'base_price',
            'product_type',
            'is_active',
            'is_featured',
            'brand',
            'category',
            'images',
            'variants',
            'attribute_values',
            'created_at',
        ]