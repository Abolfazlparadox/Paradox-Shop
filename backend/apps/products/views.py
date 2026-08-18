from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .selectors import ProductSelector
from .serializers import ProductDetailSerializer, ProductListSerializer


@extend_schema(
    tags=["Products"],
    parameters=[
        OpenApiParameter(
            name="category", description="Filter by Category slug", required=False, type=str
        ),
        OpenApiParameter(
            name="brand", description="Filter by Brand slug", required=False, type=str
        ),
        OpenApiParameter(
            name="is_featured",
            description="Filter by featured flag (true/false)",
            required=False,
            type=bool,
        ),
        OpenApiParameter(
            name="min_price", description="Minimum base price (inclusive)", required=False, type=int
        ),
        OpenApiParameter(
            name="max_price", description="Maximum base price (inclusive)", required=False, type=int
        ),
        OpenApiParameter(
            name="search",
            description="Search term in name or description",
            required=False,
            type=str,
        ),
    ],
)
class ProductListView(generics.ListAPIView):
    """
    Returns a paginated, filterable Product catalog listing.

    Supported query params:
        category      - filter by Category slug
        brand         - filter by Brand slug
        is_featured   - filter by featured flag (true/false)
        min_price     - minimum base_price (inclusive)
        max_price     - maximum base_price (inclusive)
        search        - case-insensitive match against name / short_description
    """

    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        params = self.request.query_params
        return ProductSelector.get_filtered_products(
            category_slug=params.get("category"),
            brand_slug=params.get("brand"),
            is_featured=self._parse_bool(params.get("is_featured")),
            min_price=params.get("min_price") or None,
            max_price=params.get("max_price") or None,
            search=params.get("search"),
        )

    @staticmethod
    def _parse_bool(value):
        if value is None:
            return None
        return value.lower() in ("1", "true", "yes")


@extend_schema(tags=["Products"])
class ProductDetailView(generics.RetrieveAPIView):
    """Returns a single Product with its brand, category, images, variants and attribute values."""

    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return ProductSelector.get_product_detail_queryset()
