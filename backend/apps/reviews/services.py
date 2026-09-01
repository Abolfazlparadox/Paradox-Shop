import os
from typing import Any, Dict, List, Optional
import django.db.utils
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Count, Q
from PIL import Image
from rest_framework.exceptions import ValidationError

from common.audit_services import record_audit_log
from common.models import AdminNotification
from common.notification_services import create_admin_notification, create_user_notification
from .models import (
    ProductQuestion,
    QuestionAnswer,
    QuestionReport,
    Review,
    ReviewImage,
    ReviewReport,
    ReviewResponse,
    ReviewVote,
)
from .selectors import ReviewSelector
from .tasks import process_review_image_task

ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_IMAGES_PER_REVIEW = 5


def validate_image_file(uploaded_file):
    """
    Validates image file size, MIME type, and Pillow integrity.
    """
    if uploaded_file.size > MAX_IMAGE_FILE_SIZE:
        raise ValidationError(
            f"Image '{uploaded_file.name}' exceeds the maximum allowed size of 5MB."
        )

    # Check content with Pillow
    try:
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as img:
            img.verify()
            format_lower = (img.format or "").lower()
            if format_lower not in ("jpeg", "png", "webp", "jpg"):
                raise ValidationError(
                    f"Unsupported image format '{img.format}' in file '{uploaded_file.name}'."
                )
        uploaded_file.seek(0)
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(f"Invalid image file '{uploaded_file.name}': {str(e)}")


class ReviewService:
    """Core domain business operations for customer Reviews."""

    @staticmethod
    @transaction.atomic
    def create_review(
        *,
        user,
        product_id,
        rating: int,
        title: Optional[str] = None,
        body: Optional[str] = None,
        pros: Optional[List[str]] = None,
        cons: Optional[List[str]] = None,
        images: Optional[List[Any]] = None,
        request=None,
    ) -> Review:
        """
        Creates a new customer review for a product.
        Strict server-side validation of verified delivered purchase.
        """
        if not (1 <= rating <= 5):
            raise ValidationError({"rating": "Rating must be between 1 and 5 stars."})

        if ReviewSelector.user_has_review_for_product(user=user, product_id=product_id):
            raise ValidationError({"review": "You have already submitted a review for this product."})

        has_purchased = ReviewSelector.user_has_purchased_product(user=user, product_id=product_id)
        if not has_purchased:
            raise ValidationError(
                {"review": "Only clients who have purchased and received this artifact are eligible to review."}
            )

        # Validate image attachments if provided
        uploaded_images = images or []
        if len(uploaded_images) > MAX_IMAGES_PER_REVIEW:
            raise ValidationError(
                {"images": f"You cannot attach more than {MAX_IMAGES_PER_REVIEW} images."}
            )

        for img_file in uploaded_images:
            validate_image_file(img_file)

        review = Review(
            product_id=product_id,
            user=user,
            rating=rating,
            title=title.strip() if title else None,
            body=body.strip() if body else None,
            pros=pros or [],
            cons=cons or [],
            is_verified_purchase=True,
            status=Review.ReviewStatus.PENDING,
        )

        try:
            review.save()
        except django.db.utils.IntegrityError:
            raise ValidationError({"review": "You have already reviewed this product."})

        # Save images and schedule asynchronous thumbnail processing
        for idx, img_file in enumerate(uploaded_images):
            img_obj = ReviewImage.objects.create(
                review=review,
                image=img_file,
                original_filename=img_file.name,
                file_size=img_file.size,
                sort_order=idx,
            )
            # Dispatch Celery background task
            try:
                process_review_image_task.delay(str(img_obj.id))
            except Exception:
                pass  # Task dispatch fallback

        ReviewSelector.invalidate_product_review_summary(product_id)

        # Operational alert for administrators
        create_admin_notification(
            title=f"New Review Waiting Moderation ({rating}★)",
            message=f"Review submitted by {user.email} on artifact requires editorial curation.",
            notification_type=AdminNotification.NotificationType.REVIEW,
            action_url="/admin/reviews",
            resource_id=str(review.id),
        )

        record_audit_log(
            action="REVIEW_CREATE",
            resource_type="REVIEW",
            resource_id=str(review.id),
            user=user,
            request=request,
            metadata={"product_id": str(product_id), "rating": rating},
        )

        return review

    @staticmethod
    @transaction.atomic
    def update_review(
        *,
        review: Review,
        user,
        rating: Optional[int] = None,
        title: Optional[str] = None,
        body: Optional[str] = None,
        pros: Optional[List[str]] = None,
        cons: Optional[List[str]] = None,
        new_images: Optional[List[Any]] = None,
        delete_image_ids: Optional[List[str]] = None,
        request=None,
    ) -> Review:
        """
        Updates an existing review by author.
        Returns status to PENDING if previously APPROVED to prevent moderation bypass.
        """
        if review.user_id != user.id and not (user.is_staff or user.is_superuser):
            raise PermissionDenied("You are not authorized to edit this review.")

        if rating is not None:
            if not (1 <= rating <= 5):
                raise ValidationError({"rating": "Rating must be between 1 and 5."})
            review.rating = rating

        if title is not None:
            review.title = title.strip() if title else None

        if body is not None:
            review.body = body.strip() if body else None

        if pros is not None:
            review.pros = pros

        if cons is not None:
            review.cons = cons

        # Delete requested images
        if delete_image_ids:
            ReviewImage.objects.filter(review=review, id__in=delete_image_ids).delete()

        # Add new images with validation
        if new_images:
            current_image_count = review.images.count()
            if current_image_count + len(new_images) > MAX_IMAGES_PER_REVIEW:
                raise ValidationError(
                    {"images": f"Total images cannot exceed {MAX_IMAGES_PER_REVIEW}."}
                )
            for img_file in new_images:
                validate_image_file(img_file)
                img_obj = ReviewImage.objects.create(
                    review=review,
                    image=img_file,
                    original_filename=img_file.name,
                    file_size=img_file.size,
                )
                try:
                    process_review_image_task.delay(str(img_obj.id))
                except Exception:
                    pass

        # Re-moderation rule: if was approved, change back to pending
        if review.status == Review.ReviewStatus.APPROVED:
            review.status = Review.ReviewStatus.PENDING

        review.save()
        ReviewSelector.invalidate_product_review_summary(review.product_id)

        record_audit_log(
            action="REVIEW_UPDATE",
            resource_type="REVIEW",
            resource_id=str(review.id),
            user=user,
            request=request,
            metadata={"rating": review.rating, "status": review.status},
        )

        return review

    @staticmethod
    @transaction.atomic
    def delete_review(*, review: Review, user, request=None) -> None:
        """Deletes a review by author or admin."""
        if review.user_id != user.id and not (user.is_staff or user.is_superuser):
            raise PermissionDenied("You are not authorized to delete this review.")

        product_id = review.product_id
        review_id = str(review.id)
        review.delete()
        ReviewSelector.invalidate_product_review_summary(product_id)

        record_audit_log(
            action="REVIEW_DELETE",
            resource_type="REVIEW",
            resource_id=review_id,
            user=user,
            request=request,
            metadata={"product_id": str(product_id)},
        )

    @staticmethod
    @transaction.atomic
    def vote_review(*, review: Review, user, is_helpful: bool) -> Dict[str, Any]:
        """
        Submits or toggles a helpful vote on a review.
        """
        if review.user_id == user.id:
            raise ValidationError({"vote": "You cannot vote on your own review."})

        existing_vote = ReviewVote.objects.filter(review=review, user=user).first()
        user_vote_state: Optional[bool] = None

        if existing_vote:
            if existing_vote.is_helpful == is_helpful:
                # Toggle off (remove vote)
                existing_vote.delete()
                user_vote_state = None
            else:
                # Switch vote direction
                existing_vote.is_helpful = is_helpful
                existing_vote.save(update_fields=["is_helpful", "updated_at"])
                user_vote_state = is_helpful
        else:
            ReviewVote.objects.create(review=review, user=user, is_helpful=is_helpful)
            user_vote_state = is_helpful

        # Recalculate denormalized counts atomically
        vote_counts = ReviewVote.objects.filter(review=review).aggregate(
            helpful=Count("id", filter=Q(is_helpful=True)),
            unhelpful=Count("id", filter=Q(is_helpful=False)),
        )
        review.helpful_count = vote_counts["helpful"] or 0
        review.unhelpful_count = vote_counts["unhelpful"] or 0
        review.save(update_fields=["helpful_count", "unhelpful_count", "updated_at"])

        return {
            "user_vote": user_vote_state,
            "helpful_count": review.helpful_count,
            "unhelpful_count": review.unhelpful_count,
        }

    @staticmethod
    @transaction.atomic
    def report_review(*, review: Review, user, reason: str, details: Optional[str] = None) -> ReviewReport:
        """Files a community report for moderation review."""
        if ReviewReport.objects.filter(review=review, user=user).exists():
            raise ValidationError({"report": "You have already submitted a report for this review."})

        report = ReviewReport.objects.create(
            review=review,
            user=user,
            reason=reason,
            details=details,
        )

        create_admin_notification(
            title="Review Abuse Report Filed",
            message=f"A review on {review.product.name} was reported for '{reason}'.",
            notification_type=AdminNotification.NotificationType.REVIEW,
            action_url="/admin/reviews",
            resource_id=str(review.id),
        )

        return report

    @staticmethod
    @transaction.atomic
    def add_or_update_staff_response(
        *, review: Review, staff_user, response_text: str, request=None
    ) -> ReviewResponse:
        """Staff posts or updates an authoritative response to a review."""
        if not (staff_user.is_staff or staff_user.is_superuser):
            raise PermissionDenied("Only authorized staff can post official responses.")

        response_obj, _ = ReviewResponse.objects.update_or_create(
            review=review,
            defaults={"staff_user": staff_user, "response_text": response_text.strip()},
        )

        # Notify review author of official response
        create_user_notification(
            user=review.user,
            title="Official Response from Paradox Atelier",
            message=f"Our curation team has responded to your review on {review.product.name}.",
            notification_type="STAFF_REPLY",
            action_url=f"/products/{review.product.slug}",
            resource_id=str(review.id),
        )

        record_audit_log(
            action="REVIEW_STAFF_RESPONSE",
            resource_type="REVIEW",
            resource_id=str(review.id),
            user=staff_user,
            request=request,
            metadata={"product_id": str(review.product_id)},
        )

        return response_obj


class QAService:
    """Core domain business operations for Product Q&A inquiries."""

    @staticmethod
    @transaction.atomic
    def create_question(*, user, product_id, question_text: str, request=None) -> ProductQuestion:
        """Submits a new technical inquiry regarding an artifact."""
        clean_text = question_text.strip()
        if len(clean_text) < 5:
            raise ValidationError({"question": "Question must be at least 5 characters long."})

        question = ProductQuestion.objects.create(
            product_id=product_id,
            user=user,
            question=clean_text,
            status=ProductQuestion.QuestionStatus.PENDING,
        )

        create_admin_notification(
            title="New Product Inquiry Waiting Moderation",
            message=f"Client {user.email} asked a question regarding an artifact.",
            notification_type=AdminNotification.NotificationType.SYSTEM,
            action_url="/admin/questions",
            resource_id=str(question.id),
        )

        record_audit_log(
            action="QUESTION_CREATE",
            resource_type="QUESTION",
            resource_id=str(question.id),
            user=user,
            request=request,
            metadata={"product_id": str(product_id)},
        )

        return question

    @staticmethod
    @transaction.atomic
    def delete_question(*, question: ProductQuestion, user, request=None) -> None:
        """Deletes a client inquiry."""
        if question.user_id != user.id and not (user.is_staff or user.is_superuser):
            raise PermissionDenied("You are not authorized to delete this question.")

        q_id = str(question.id)
        prod_id = str(question.product_id)
        question.delete()

        record_audit_log(
            action="QUESTION_DELETE",
            resource_type="QUESTION",
            resource_id=q_id,
            user=user,
            request=request,
            metadata={"product_id": prod_id},
        )

    @staticmethod
    @transaction.atomic
    def report_question(
        *, question: ProductQuestion, user, reason: str, details: Optional[str] = None
    ) -> QuestionReport:
        """Reports a question for moderation."""
        if QuestionReport.objects.filter(question=question, user=user).exists():
            raise ValidationError({"report": "You have already reported this question."})

        return QuestionReport.objects.create(
            question=question,
            user=user,
            reason=reason,
            details=details,
        )

    @staticmethod
    @transaction.atomic
    def answer_question(
        *, question: ProductQuestion, staff_user, answer_text: str, request=None
    ) -> QuestionAnswer:
        """Staff posts an authoritative technical answer to a question."""
        if not (staff_user.is_staff or staff_user.is_superuser):
            raise PermissionDenied("Only authorized staff can answer product inquiries.")

        answer_obj, _ = QuestionAnswer.objects.update_or_create(
            question=question,
            defaults={"staff_user": staff_user, "answer": answer_text.strip()},
        )

        # Automatically approve question when answered
        if question.status != ProductQuestion.QuestionStatus.APPROVED:
            question.status = ProductQuestion.QuestionStatus.APPROVED
            question.save(update_fields=["status", "updated_at"])

        # Notify question author
        create_user_notification(
            user=question.user,
            title="Your Product Inquiry Was Answered",
            message=f"Our team provided an authoritative answer to your question on {question.product.name}.",
            notification_type="QUESTION_ANSWERED",
            action_url=f"/products/{question.product.slug}",
            resource_id=str(question.id),
        )

        record_audit_log(
            action="QUESTION_STAFF_ANSWER",
            resource_type="QUESTION",
            resource_id=str(question.id),
            user=staff_user,
            request=request,
            metadata={"product_id": str(question.product_id)},
        )

        return answer_obj
