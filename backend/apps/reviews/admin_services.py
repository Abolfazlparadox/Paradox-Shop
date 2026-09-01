from typing import Optional
from django.db import transaction

from apps.products.models import ProductComment
from apps.reviews.models import (
    ProductQuestion,
    QuestionAnswer,
    QuestionReport,
    Review,
    ReviewReport,
    ReviewResponse,
)
from apps.reviews.selectors import ReviewSelector
from common.audit_services import record_audit_log
from common.notification_services import create_user_notification


class AdminReviewService:
    """
    Administrative moderation operations for Reviews and Q&A Inquiries.
    """

    @staticmethod
    @transaction.atomic
    def moderate_review(
        review: Review,
        status: Optional[str] = None,
        is_approved: Optional[bool] = None,
        rejection_reason: Optional[str] = None,
        actor_user=None,
        request=None,
    ) -> Review:
        if status:
            review.status = status.upper()
        elif is_approved is not None:
            review.status = Review.ReviewStatus.APPROVED if is_approved else Review.ReviewStatus.REJECTED

        if rejection_reason is not None:
            review.rejection_reason = rejection_reason

        review.save(update_fields=["status", "is_approved", "rejection_reason", "updated_at"])
        ReviewSelector.invalidate_product_review_summary(review.product_id)

        # Notify review author of editorial decision
        if review.status == Review.ReviewStatus.APPROVED:
            create_user_notification(
                user=review.user,
                title="Review Approved & Published",
                message=f"Your review on {review.product.name} has been published to the storefront.",
                notification_type="REVIEW_APPROVED",
                action_url=f"/products/{review.product.slug}",
                resource_id=str(review.id),
            )
        elif review.status == Review.ReviewStatus.REJECTED:
            create_user_notification(
                user=review.user,
                title="Review Editorial Notice",
                message=f"Your review on {review.product.name} could not be approved. Reason: {rejection_reason or 'Policy non-compliance'}",
                notification_type="REVIEW_REJECTED",
                resource_id=str(review.id),
            )

        record_audit_log(
            action=f"REVIEW_{review.status}",
            resource_type="REVIEW",
            resource_id=str(review.id),
            user=actor_user,
            request=request,
            metadata={
                "product": review.product.name,
                "user": review.user.email,
                "rating": review.rating,
                "status": review.status,
            },
        )

        return review

    @staticmethod
    @transaction.atomic
    def delete_review(review: Review, actor_user=None, request=None) -> None:
        r_id = str(review.id)
        product_name = review.product.name
        product_id = review.product_id
        review.delete()
        ReviewSelector.invalidate_product_review_summary(product_id)

        record_audit_log(
            action="REVIEW_DELETE",
            resource_type="REVIEW",
            resource_id=r_id,
            user=actor_user,
            request=request,
            metadata={"product": product_name},
        )

    @staticmethod
    @transaction.atomic
    def add_staff_response(review: Review, response_text: str, staff_user, request=None) -> ReviewResponse:
        from apps.reviews.services import ReviewService
        return ReviewService.add_or_update_staff_response(
            review=review, staff_user=staff_user, response_text=response_text, request=request
        )

    # =====================================================================
    # Q&A MODERATION
    # =====================================================================

    @staticmethod
    @transaction.atomic
    def moderate_question(
        question: ProductQuestion,
        status: Optional[str] = None,
        is_approved: Optional[bool] = None,
        rejection_reason: Optional[str] = None,
        actor_user=None,
        request=None,
    ) -> ProductQuestion:
        if status:
            question.status = status.upper()
        elif is_approved is not None:
            question.status = ProductQuestion.QuestionStatus.APPROVED if is_approved else ProductQuestion.QuestionStatus.REJECTED

        if rejection_reason is not None:
            question.rejection_reason = rejection_reason

        question.save(update_fields=["status", "rejection_reason", "updated_at"])

        if question.status == ProductQuestion.QuestionStatus.APPROVED:
            create_user_notification(
                user=question.user,
                title="Product Inquiry Approved",
                message=f"Your technical inquiry on {question.product.name} is now visible to the atelier community.",
                notification_type="QUESTION_APPROVED",
                action_url=f"/products/{question.product.slug}",
                resource_id=str(question.id),
            )
        elif question.status == ProductQuestion.QuestionStatus.REJECTED:
            create_user_notification(
                user=question.user,
                title="Product Inquiry Notice",
                message=f"Your inquiry on {question.product.name} could not be approved.",
                notification_type="QUESTION_REJECTED",
                resource_id=str(question.id),
            )

        record_audit_log(
            action=f"QUESTION_{question.status}",
            resource_type="QUESTION",
            resource_id=str(question.id),
            user=actor_user,
            request=request,
            metadata={"product": question.product.name, "user": question.user.email},
        )

        return question

    @staticmethod
    @transaction.atomic
    def answer_question(
        question: ProductQuestion, answer_text: str, staff_user, request=None
    ) -> QuestionAnswer:
        from apps.reviews.services import QAService
        return QAService.answer_question(
            question=question, staff_user=staff_user, answer_text=answer_text, request=request
        )

    @staticmethod
    @transaction.atomic
    def delete_question(question: ProductQuestion, actor_user=None, request=None) -> None:
        q_id = str(question.id)
        product_name = question.product.name
        question.delete()

        record_audit_log(
            action="QUESTION_DELETE",
            resource_type="QUESTION",
            resource_id=q_id,
            user=actor_user,
            request=request,
            metadata={"product": product_name},
        )

    @staticmethod
    @transaction.atomic
    def resolve_review_report(report: ReviewReport, status: str, actor_user=None, request=None) -> ReviewReport:
        report.status = status.upper()
        report.save(update_fields=["status", "updated_at"])

        record_audit_log(
            action=f"REVIEW_REPORT_{report.status}",
            resource_type="REVIEW_REPORT",
            resource_id=str(report.id),
            user=actor_user,
            request=request,
            metadata={"review_id": str(report.review_id)},
        )
        return report

    # =====================================================================
    # LEGACY COMMENT SUPPORT
    # =====================================================================

    @staticmethod
    @transaction.atomic
    def moderate_comment(comment: ProductComment, is_approved: bool, actor_user=None, request=None) -> ProductComment:
        comment.is_approved = is_approved
        comment.save(update_fields=["is_approved", "updated_at"])

        record_audit_log(
            action=f"COMMENT_{'APPROVED' if is_approved else 'REJECTED'}",
            resource_type="COMMENT",
            resource_id=str(comment.id),
            user=actor_user,
            request=request,
            metadata={"product": comment.product.name, "user": comment.user.email},
        )
        return comment

    @staticmethod
    @transaction.atomic
    def reply_to_comment(parent_comment: ProductComment, content: str, staff_user, request=None) -> ProductComment:
        reply = ProductComment.objects.create(
            product=parent_comment.product,
            user=staff_user,
            parent=parent_comment,
            content=content,
            is_approved=True,
        )

        if not parent_comment.is_approved:
            parent_comment.is_approved = True
            parent_comment.save(update_fields=["is_approved", "updated_at"])

        record_audit_log(
            action="COMMENT_STAFF_REPLY",
            resource_type="COMMENT",
            resource_id=str(reply.id),
            user=staff_user,
            request=request,
            metadata={"parent_id": str(parent_comment.id), "product": parent_comment.product.name},
        )
        return reply

    @staticmethod
    @transaction.atomic
    def delete_comment(comment: ProductComment, actor_user=None, request=None) -> None:
        c_id = str(comment.id)
        product_name = comment.product.name
        comment.delete()

        record_audit_log(
            action="COMMENT_DELETE",
            resource_type="COMMENT",
            resource_id=c_id,
            user=actor_user,
            request=request,
            metadata={"product": product_name},
        )
