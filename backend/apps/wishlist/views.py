import uuid
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAuthenticated
from .selectors import get_user_wishlist, is_in_wishlist
from .serializers import (
    AddWishlistItemSerializer,
    MergeWishlistSerializer,
    WishlistItemSerializer,
    WishlistSerializer,
)
from .services import (
    add_to_wishlist,
    clear_wishlist,
    get_or_create_wishlist,
    merge_guest_wishlist,
    remove_by_product,
    remove_from_wishlist,
)


class WishlistView(APIView):
    """
    Manage the authenticated user's persistent wishlist.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Retrieve user wishlist",
        description="Returns all products currently saved in the authenticated user's wishlist.",
        responses={200: WishlistSerializer},
        tags=["Wishlist"],
    )
    def get(self, request):
        wishlist = get_user_wishlist(request.user)
        if not wishlist:
            wishlist = get_or_create_wishlist(request.user)
        serializer = WishlistSerializer(wishlist)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Clear entire wishlist",
        description="Removes all products from the authenticated user's wishlist.",
        responses={200: dict},
        tags=["Wishlist"],
    )
    def delete(self, request):
        deleted_count = clear_wishlist(request.user)
        return Response(
            {"detail": "Wishlist cleared successfully.", "deleted_count": deleted_count},
            status=status.HTTP_200_OK,
        )


class WishlistItemCreateView(APIView):
    """
    Add a product or variant to the wishlist.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Add item to wishlist",
        description="Adds a specified product and optional variant to the authenticated user's wishlist.",
        request=AddWishlistItemSerializer,
        responses={201: WishlistItemSerializer, 200: WishlistItemSerializer},
        tags=["Wishlist"],
    )
    def post(self, request):
        serializer = AddWishlistItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data["product_id"]
        variant_id = serializer.validated_data.get("variant_id")

        item, created = add_to_wishlist(
            user=request.user,
            product_id=product_id,
            variant_id=variant_id,
        )

        resp_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(WishlistItemSerializer(item).data, status=resp_status)


class WishlistItemDetailView(APIView):
    """
    Remove an individual item from the wishlist by its item ID.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Remove item from wishlist",
        description="Removes an item from the wishlist by its UUID.",
        responses={200: dict},
        tags=["Wishlist"],
    )
    def delete(self, request, item_id):
        remove_from_wishlist(user=request.user, item_id=item_id)
        wishlist = get_user_wishlist(request.user)
        serializer = WishlistSerializer(wishlist)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WishlistRemoveByProductView(APIView):
    """
    Remove an item from the wishlist using product_id (toggle support).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Remove item by product ID",
        description="Removes product from wishlist directly using product UUID and optional variant UUID.",
        request=AddWishlistItemSerializer,
        responses={200: dict},
        tags=["Wishlist"],
    )
    def post(self, request):
        serializer = AddWishlistItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data["product_id"]
        variant_id = serializer.validated_data.get("variant_id")

        removed = remove_by_product(request.user, product_id, variant_id)
        return Response(
            {"detail": "Item removed from wishlist.", "removed": removed},
            status=status.HTTP_200_OK,
        )


class WishlistMergeView(APIView):
    """
    Merge guest local wishlist items into the user's account upon login.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Merge guest wishlist",
        description="Merges guest stored product UUIDs into the authenticated user's wishlist.",
        request=MergeWishlistSerializer,
        responses={200: WishlistSerializer},
        tags=["Wishlist"],
    )
    def post(self, request):
        serializer = MergeWishlistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_ids = serializer.validated_data["product_ids"]
        merge_guest_wishlist(request.user, product_ids)

        wishlist = get_user_wishlist(request.user)
        return Response(WishlistSerializer(wishlist).data, status=status.HTTP_200_OK)


class WishlistCheckView(APIView):
    """
    Check if a product is currently in the authenticated user's wishlist.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Check product in wishlist",
        description="Checks whether a given product is saved in the user's wishlist.",
        parameters=[
            OpenApiParameter(
                name="product_id",
                type=uuid.UUID,
                location=OpenApiParameter.QUERY,
                required=True,
            ),
            OpenApiParameter(
                name="variant_id",
                type=uuid.UUID,
                location=OpenApiParameter.QUERY,
                required=False,
            ),
        ],
        responses={200: dict},
        tags=["Wishlist"],
    )
    def get(self, request):
        product_id_raw = request.query_params.get("product_id")
        if not product_id_raw:
            return Response(
                {"in_wishlist": False, "error": "product_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product_id = uuid.UUID(product_id_raw)
        except ValueError:
            return Response(
                {"in_wishlist": False, "error": "Invalid product_id UUID format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        variant_id_raw = request.query_params.get("variant_id")
        variant_id = None
        if variant_id_raw:
            try:
                variant_id = uuid.UUID(variant_id_raw)
            except ValueError:
                return Response(
                    {"in_wishlist": False, "error": "Invalid variant_id UUID format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        in_list = is_in_wishlist(request.user, product_id, variant_id)
        return Response({"in_wishlist": in_list}, status=status.HTTP_200_OK)
