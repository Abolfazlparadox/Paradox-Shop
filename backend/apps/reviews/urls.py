from django.urls import path

from .views import (
    CreateProductQuestionView,
    CreateReviewView,
    ProductQuestionDetailView,
    ProductQuestionListView,
    ProductQuestionReportView,
    ProductReviewEligibilityView,
    ProductReviewListView,
    ProductReviewSummaryView,
    ReviewDetailView,
    ReviewReportView,
    ReviewsHealthCheckView,
    ReviewVoteView,
    UserProductQuestionListView,
    UserReviewListView,
)

app_name = "reviews"

urlpatterns = [
    # Health check
    path("health/", ReviewsHealthCheckView.as_view(), name="module_health"),
    
    # Review operations
    path("create/", CreateReviewView.as_view(), name="create"),
    path("my/", UserReviewListView.as_view(), name="my-reviews"),
    path("<uuid:pk>/", ReviewDetailView.as_view(), name="review-detail"),
    path("<uuid:pk>/vote/", ReviewVoteView.as_view(), name="review-vote"),
    path("<uuid:pk>/report/", ReviewReportView.as_view(), name="review-report"),
    path("product/<uuid:product_id>/", ProductReviewListView.as_view(), name="product-reviews"),
    path("product/<uuid:product_id>/summary/", ProductReviewSummaryView.as_view(), name="product-review-summary"),
    path("product/<uuid:product_id>/eligibility/", ProductReviewEligibilityView.as_view(), name="product-review-eligibility"),
    
    # Q&A operations
    path("questions/create/", CreateProductQuestionView.as_view(), name="question-create"),
    path("questions/my/", UserProductQuestionListView.as_view(), name="my-questions"),
    path("questions/<uuid:pk>/", ProductQuestionDetailView.as_view(), name="question-detail"),
    path("questions/<uuid:pk>/report/", ProductQuestionReportView.as_view(), name="question-report"),
    path("questions/product/<uuid:product_id>/", ProductQuestionListView.as_view(), name="product-questions"),
]
