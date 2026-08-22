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


@extend_schema(tags=["Products"])
class ProductCommentListCreateView(generics.ListCreateAPIView):
    """
    List approved comments for a Product (public) or submit a new comment (verified users).
    Staff members can provide a `parent` ID in POST payload to publish an official reply.
    """

    def get_permissions(self):
        if self.request.method == "POST":
            from .permissions import IsVerifiedUser

            return [IsVerifiedUser()]
        return [AllowAny()]

    def get_throttles(self):
        if self.request.method == "POST":
            from .throttling import CommentRateThrottle

            return [CommentRateThrottle()]
        return []

    def get_serializer_class(self):
        if self.request.method == "POST":
            from .serializers import ProductCommentCreateSerializer

            return ProductCommentCreateSerializer
        from .serializers import ProductCommentSerializer

        return ProductCommentSerializer

    def _get_product(self):
        from django.shortcuts import get_object_or_404
        from .models import Product

        product_id = self.kwargs.get("product_id")
        if product_id:
            return get_object_or_404(Product, id=product_id)
        slug = self.kwargs.get("slug")
        return get_object_or_404(Product, slug=slug)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method == "POST":
            context["product"] = self._get_product()
        return context

    def get_queryset(self):
        from django.db.models import Prefetch
        from .models import ProductComment

        product = self._get_product()
        replies_prefetch = Prefetch(
            "replies",
            queryset=ProductComment.objects.filter(is_approved=True).select_related("user"),
        )
        return (
            ProductComment.objects.filter(product=product, parent__isnull=True, is_approved=True)
            .select_related("user")
            .prefetch_related(replies_prefetch)
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        product = self._get_product()
        serializer.save(user=self.request.user, product=product)

    def create(self, request, *args, **kwargs):
        from rest_framework import status
        from rest_framework.response import Response
        from .serializers import ProductCommentSerializer

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance

        # Return full privacy-safe serialized payload
        output_serializer = ProductCommentSerializer(instance, context={"request": request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


@extend_schema(tags=["Products"])
class ProductCommentListViewBySlug(generics.ListAPIView):
    """
    Public listing of approved threaded comments for a Product looked up by its Slug.
    """

    permission_classes = [AllowAny]

    def get_serializer_class(self):
        from .serializers import ProductCommentSerializer

        return ProductCommentSerializer

    def get_queryset(self):
        from django.db.models import Prefetch
        from django.shortcuts import get_object_or_404
        from .models import Product, ProductComment

        slug = self.kwargs.get("slug")
        product = get_object_or_404(Product, slug=slug)
        replies_prefetch = Prefetch(
            "replies",
            queryset=ProductComment.objects.filter(is_approved=True).select_related("user"),
        )
        return (
            ProductComment.objects.filter(product=product, parent__isnull=True, is_approved=True)
            .select_related("user")
            .prefetch_related(replies_prefetch)
            .order_by("-created_at")
        )
