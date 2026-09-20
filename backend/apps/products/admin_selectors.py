from django.db.models import Q, Sum
from apps.products.models import Product, ProductVariant


class AdminProductSelector:
    """
    Selectors for administrative catalog management and inventory telemetry.
    """

    @staticmethod
    def get_products_queryset(
        category: str = None,
        stock: str = None,
        search: str = None,
        is_active: bool = None,
    ):
        qs = (
            Product.objects.select_related("category", "brand")
            .prefetch_related("variants", "images", "attribute_values__attribute")
            .order_by("-created_at")
        )

        if category and category.upper() != "ALL":
            qs = qs.filter(Q(category__slug=category) | Q(category__id__iexact=category) | Q(category__name__icontains=category))

        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        if search:
            q = search.strip()
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(slug__icontains=q)
                | Q(short_description__icontains=q)
                | Q(variants__sku__icontains=q)
                | Q(variants__name__icontains=q)
            ).distinct()

        if stock == "LOW":
            qs = qs.filter(variants__stock__gt=0, variants__stock__lte=10).distinct()
        elif stock == "OUT":
            qs = qs.filter(variants__stock=0).distinct()

        return qs

    @staticmethod
    def get_product_detail(product_id: str) -> Product:
        return (
            Product.objects.select_related("category", "brand")
            .prefetch_related("variants", "images", "attribute_values__attribute", "comments")
            .get(id=product_id)
        )

    @staticmethod
    def get_inventory_queryset(
        category: str = None,
        stock_filter: str = None,
        search: str = None,
    ):
        qs = (
            ProductVariant.objects.select_related("product", "product__category", "product__brand")
            .prefetch_related("images")
            .order_by("product__name", "name")
        )

        if category and category.upper() != "ALL":
            qs = qs.filter(
                Q(product__category__slug=category)
                | Q(product__category__id__iexact=category)
                | Q(product__category__name__icontains=category)
            )

        if stock_filter == "LOW":
            qs = qs.filter(stock__gt=0, stock__lte=10)
        elif stock_filter == "OUT":
            qs = qs.filter(stock=0)

        if search:
            q = search.strip()
            qs = qs.filter(
                Q(sku__icontains=q)
                | Q(name__icontains=q)
                | Q(product__name__icontains=q)
                | Q(product__slug__icontains=q)
            )

        return qs
