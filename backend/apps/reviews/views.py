from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .selectors import ReviewSelector
from .serializers import CreateReviewSerializer, ReviewSerializer
from .services import ReviewService


class ReviewsHealthCheckView(APIView):
    """Module health check endpoint."""
    def get(self, request):
        return Response({'module': 'reviews', 'status': 'initialized'})


class ProductReviewListView(generics.ListAPIView):
    """Lists approved (public) reviews for a specific product."""

    serializer_class = ReviewSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        product_id = self.kwargs.get('product_id')
        return ReviewSelector.get_product_reviews(product_id)


class CreateReviewView(APIView):
    """
    Submits a new product Review by an authenticated user.

    The user must have purchased the product in a paid order.
    Only one review per product per user is allowed.
    New reviews are set to is_approved=False (pending moderation).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = ReviewService.create_review(
            user=request.user,
            product_id=serializer.validated_data['product_id'],
            rating=serializer.validated_data['rating'],
            title=serializer.validated_data.get('title'),
            body=serializer.validated_data.get('body'),
        )

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)