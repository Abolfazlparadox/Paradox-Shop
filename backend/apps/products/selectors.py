from django.db.models import Prefetch, Q, QuerySet

from .models import Product, ProductImage, ProductVariant


class ProductSelector:
    """Read-only, N+1-safe query methods for the Product domain."""

    @staticmethod
    def get_filtered_products(*, category_slug: str | None = None, brand_slug: str | None = None,
                               is_featured: bool | None = None, min_price=None, max_price=None,
                               search: str | None = None) -> QuerySet:
        """Returns the optimized, filtered queryset backing the Product catalog listing endpoint."""
        queryset = Product.objects.filter(is_active=True).select_related('brand', 'category').prefetch_related(
            Prefetch(
                'images',
                queryset=ProductImage.objects.filter(is_primary=True),
                to_attr='primary_images',
            ),
        )

        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if brand_slug:
            queryset = queryset.filter(brand__slug=brand_slug)
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured)
        if min_price is not None:
            queryset = queryset.filter(base_price__gte=min_price)
        if max_price is not None:
            queryset = queryset.filter(base_price__lte=max_price)
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(short_description__icontains=search))

        return queryset.order_by('-is_featured', '-created_at')

    @staticmethod
    def get_product_detail_queryset() -> QuerySet:
        """Returns the optimized queryset backing the Product detail endpoint."""
        return Product.objects.filter(is_active=True).select_related('brand', 'category').prefetch_related(
            'images',
            Prefetch('variants', queryset=ProductVariant.objects.filter(is_active=True).order_by('name')),
            'attribute_values__attribute',
        )