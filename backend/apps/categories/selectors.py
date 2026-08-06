from django.db.models import Prefetch, QuerySet

from .models import Category, CategoryAttribute


class CategorySelector:
    """Read-only query methods for the Category domain."""

    @staticmethod
    def get_active_categories() -> QuerySet:
        """Returns the base queryset of active categories, ordered for display."""
        return Category.objects.filter(is_active=True).order_by('sort_order', 'name')

    @staticmethod
    def get_category_list_queryset() -> QuerySet:
        """Returns the optimized queryset backing the flat Category list endpoint."""
        return CategorySelector.get_active_categories().select_related('parent')

    @staticmethod
    def get_category_detail_queryset() -> QuerySet:
        """Returns the optimized queryset backing the Category detail endpoint."""
        return Category.objects.filter(is_active=True).select_related('parent').prefetch_related(
            Prefetch('children', queryset=Category.objects.filter(is_active=True).order_by('sort_order', 'name')),
            Prefetch('attributes', queryset=CategoryAttribute.objects.order_by('sort_order')),
        )

    @staticmethod
    def get_category_tree() -> list:
        """
        Builds the full active-category hierarchy as nested plain dictionaries in a
        single query, avoiding N+1 lookups for arbitrarily deep category trees.
        """
        categories = list(
            Category.objects.filter(is_active=True)
            .order_by('sort_order', 'name')
            .values('id', 'name', 'slug', 'image', 'sort_order', 'parent_id')
        )

        nodes_by_id = {category['id']: {**category, 'children': []} for category in categories}
        roots = []

        for category in categories:
            node = nodes_by_id[category['id']]
            parent_id = node.pop('parent_id')
            if parent_id and parent_id in nodes_by_id:
                nodes_by_id[parent_id]['children'].append(node)
            else:
                roots.append(node)

        return roots