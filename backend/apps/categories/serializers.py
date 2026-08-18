from rest_framework import serializers

from .models import Category, CategoryAttribute


class CategoryAttributeSerializer(serializers.ModelSerializer):
    """Serializer for a Category's dynamic attribute definitions."""

    class Meta:
        model = CategoryAttribute
        fields = [
            "id",
            "name",
            "attribute_type",
            "is_required",
            "is_filterable",
            "is_variant",
            "sort_order",
        ]


class CategoryMiniSerializer(serializers.ModelSerializer):
    """
    Lightweight Category representation used for embedding (parent, children, product.category).
    """

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "image"]


class CategoryTreeNodeSerializer(serializers.Serializer):
    """Recursive serializer schema for nested category tree nodes."""

    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.SlugField()
    image = serializers.ImageField(allow_null=True)
    sort_order = serializers.IntegerField()
    children = serializers.ListField(child=serializers.DictField(), default=[])


class CategoryListSerializer(serializers.ModelSerializer):
    """Serializer for the flat, paginated Category listing endpoint."""

    parent = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "image", "sort_order"]


class CategoryDetailSerializer(serializers.ModelSerializer):
    """Full Category representation including parent, direct children and dynamic attributes."""

    parent = CategoryMiniSerializer(read_only=True)
    children = CategoryMiniSerializer(many=True, read_only=True)
    attributes = CategoryAttributeSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "image",
            "parent",
            "children",
            "attributes",
            "sort_order",
            "created_at",
        ]
