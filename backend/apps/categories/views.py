from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .selectors import CategorySelector
from .serializers import CategoryDetailSerializer, CategoryListSerializer


class CategoryTreeView(APIView):
    """Returns the full active category hierarchy as a nested tree."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(CategorySelector.get_category_tree())


class CategoryListView(generics.ListAPIView):
    """Returns a flat, paginated listing of active categories."""

    serializer_class = CategoryListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = CategorySelector.get_category_list_queryset()

        parent_slug = self.request.query_params.get('parent')
        if parent_slug:
            queryset = queryset.filter(parent__slug=parent_slug)

        is_root = self.request.query_params.get('is_root')
        if is_root and is_root.lower() in ('1', 'true', 'yes'):
            queryset = queryset.filter(parent__isnull=True)

        return queryset


class CategoryDetailView(generics.RetrieveAPIView):
    """Returns a single Category with its parent, direct children and dynamic attributes."""

    serializer_class = CategoryDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return CategorySelector.get_category_detail_queryset()