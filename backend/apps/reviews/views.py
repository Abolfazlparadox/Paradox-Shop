from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ProductQuestion, Review
from .selectors import QASelector, ReviewSelector
from .serializers import (
    CreateProductQuestionSerializer,
    CreateReviewSerializer,
    ProductQuestionSerializer,
    QuestionReportSerializer,
    ReviewReportSerializer,
    ReviewSerializer,
    ReviewVoteSerializer,
    UpdateReviewSerializer,
    UserProductQuestionSerializer,
    UserReviewSerializer,
)
from .services import QAService, ReviewService


@extend_schema(tags=["Reviews"])
class ReviewsHealthCheckView(APIView):
    """Module health check endpoint."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"module": "reviews", "status": "initialized"})


@extend_schema(
    tags=["Reviews"],
    parameters=[
        OpenApiParameter("rating", OpenApiTypes.INT, description="Filter by star rating (1-5)"),
        OpenApiParameter("verified", OpenApiTypes.BOOL, description="Filter by verified purchase status"),
        OpenApiParameter("has_images", OpenApiTypes.BOOL, description="Filter reviews with images"),
        OpenApiParameter(
            "sort",
            OpenApiTypes.STR,
            description="Sorting criteria: newest, oldest, helpful, rating_desc, rating_asc",
        ),
    ],
    responses={200: ReviewSerializer(many=True)},
)
class ProductReviewListView(generics.ListAPIView):
    """Lists approved (public) reviews for a specific product."""

    serializer_class = ReviewSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        product_id = self.kwargs.get("product_id")
        rating_param = self.request.query_params.get("rating")
        rating = int(rating_param) if rating_param and rating_param.isdigit() else None
        
        verified_param = self.request.query_params.get("verified")
        verified = True if verified_param in ("true", "1", "True") else None
        
        has_images_param = self.request.query_params.get("has_images")
        has_images = True if has_images_param in ("true", "1", "True") else None
        
        sort_by = self.request.query_params.get("sort", "newest")

        return ReviewSelector.get_product_reviews(
            product_id=product_id,
            rating=rating,
            is_verified_purchase=verified,
            has_images=has_images,
            sort_by=sort_by,
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Pre-fetch user votes map for the paginated page to eliminate N+1 queries
        if self.request.user.is_authenticated:
            page = getattr(self, "_paginator_page", None)
            if page:
                review_ids = [r.id for r in page]
                context["user_votes_map"] = ReviewSelector.get_user_votes_for_reviews(
                    user=self.request.user, review_ids=review_ids
                )
        return context


@extend_schema(tags=["Reviews"], responses={200: OpenApiTypes.OBJECT})
class ProductReviewSummaryView(APIView):
    """Retrieves aggregated rating summary and star distribution for a product."""

    permission_classes = [AllowAny]

    def get(self, request, product_id):
        summary = ReviewSelector.get_product_review_summary(product_id)
        return Response(summary, status=status.HTTP_200_OK)


@extend_schema(tags=["Reviews"], responses={200: OpenApiTypes.OBJECT})
class ProductReviewEligibilityView(APIView):
    """Checks whether the authenticated user is eligible to review the given product."""

    permission_classes = [IsAuthenticated]

    def get(self, request, product_id):
        eligibility = ReviewSelector.get_user_review_eligibility(
            user=request.user, product_id=product_id
        )
        return Response(eligibility, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Reviews"],
    request=CreateReviewSerializer,
    responses={201: ReviewSerializer},
)
class CreateReviewView(APIView):
    """
    Submits a new review for a product by an authenticated verified purchaser.
    Supports multipart image uploads (up to 5 images).
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        images = request.FILES.getlist("images") if hasattr(request, "FILES") else []

        review = ReviewService.create_review(
            user=request.user,
            product_id=serializer.validated_data["product_id"],
            rating=serializer.validated_data["rating"],
            title=serializer.validated_data.get("title"),
            body=serializer.validated_data.get("body"),
            pros=serializer.validated_data.get("pros"),
            cons=serializer.validated_data.get("cons"),
            images=images,
            request=request,
        )

        return Response(ReviewSerializer(review, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ReviewDetailView(APIView):
    """Retrieves, updates, or deletes a specific review."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_object(self, pk):
        review = Review.objects.select_related("user", "staff_response").prefetch_related("images").filter(pk=pk).first()
        if not review:
            raise NotFound("Review not found.")
        return review

    @extend_schema(tags=["Reviews"], responses={200: ReviewSerializer})
    def get(self, request, pk):
        review = self.get_object(pk)
        return Response(ReviewSerializer(review, context={"request": request}).data)

    @extend_schema(tags=["Reviews"], request=UpdateReviewSerializer, responses={200: ReviewSerializer})
    def patch(self, request, pk):
        review = self.get_object(pk)
        serializer = UpdateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_images = request.FILES.getlist("new_images") if hasattr(request, "FILES") else []

        updated = ReviewService.update_review(
            review=review,
            user=request.user,
            rating=serializer.validated_data.get("rating"),
            title=serializer.validated_data.get("title"),
            body=serializer.validated_data.get("body"),
            pros=serializer.validated_data.get("pros"),
            cons=serializer.validated_data.get("cons"),
            new_images=new_images,
            delete_image_ids=serializer.validated_data.get("delete_image_ids"),
            request=request,
        )

        return Response(ReviewSerializer(updated, context={"request": request}).data)

    @extend_schema(tags=["Reviews"], responses={204: None})
    def delete(self, request, pk):
        review = self.get_object(pk)
        ReviewService.delete_review(review=review, user=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)



@extend_schema(tags=["Reviews"], request=ReviewVoteSerializer, responses={200: OpenApiTypes.OBJECT})
class ReviewVoteView(APIView):
    """Submits or toggles a helpful vote on a review."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = Review.objects.filter(pk=pk).first()
        if not review:
            raise NotFound("Review not found.")

        serializer = ReviewVoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = ReviewService.vote_review(
            review=review,
            user=request.user,
            is_helpful=serializer.validated_data["is_helpful"],
        )
        return Response(result, status=status.HTTP_200_OK)


@extend_schema(tags=["Reviews"], request=ReviewReportSerializer, responses={201: OpenApiTypes.OBJECT})
class ReviewReportView(APIView):
    """Submits an abuse or inappropriate content report for a review."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = Review.objects.filter(pk=pk).first()
        if not review:
            raise NotFound("Review not found.")

        serializer = ReviewReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ReviewService.report_review(
            review=review,
            user=request.user,
            reason=serializer.validated_data["reason"],
            details=serializer.validated_data.get("details"),
        )
        return Response({"detail": "Report submitted for moderation."}, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Reviews"], responses={200: UserReviewSerializer(many=True)})
class UserReviewListView(generics.ListAPIView):
    """Lists all reviews submitted by the authenticated user in their dashboard."""

    serializer_class = UserReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReviewSelector.get_user_reviews(self.request.user)


# =====================================================================
# Q&A VIEWS
# =====================================================================

@extend_schema(tags=["Reviews / Q&A"], responses={200: ProductQuestionSerializer(many=True)})
class ProductQuestionListView(generics.ListAPIView):
    """Lists approved technical inquiries and staff answers for a product."""

    serializer_class = ProductQuestionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        product_id = self.kwargs.get("product_id")
        return QASelector.get_product_questions(product_id)


@extend_schema(
    tags=["Reviews / Q&A"],
    request=CreateProductQuestionSerializer,
    responses={201: ProductQuestionSerializer},
)
class CreateProductQuestionView(APIView):
    """Submits a new technical inquiry regarding an artifact."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateProductQuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = QAService.create_question(
            user=request.user,
            product_id=serializer.validated_data["product_id"],
            question_text=serializer.validated_data["question"],
            request=request,
        )

        return Response(ProductQuestionSerializer(question).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Reviews / Q&A"], responses={204: None})
class ProductQuestionDetailView(APIView):
    """Deletes an inquiry by the author or admin."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        question = ProductQuestion.objects.filter(pk=pk).first()
        if not question:
            raise NotFound("Question not found.")

        QAService.delete_question(question=question, user=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Reviews / Q&A"], request=QuestionReportSerializer, responses={201: OpenApiTypes.OBJECT})
class ProductQuestionReportView(APIView):
    """Reports a product inquiry for moderation."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        question = ProductQuestion.objects.filter(pk=pk).first()
        if not question:
            raise NotFound("Question not found.")

        serializer = QuestionReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        QAService.report_question(
            question=question,
            user=request.user,
            reason=serializer.validated_data["reason"],
            details=serializer.validated_data.get("details"),
        )
        return Response({"detail": "Inquiry report submitted."}, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Reviews / Q&A"], responses={200: UserProductQuestionSerializer(many=True)})
class UserProductQuestionListView(generics.ListAPIView):
    """Lists questions asked by the authenticated user."""

    serializer_class = UserProductQuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QASelector.get_user_questions(self.request.user)
