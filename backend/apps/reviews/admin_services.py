from django.db import transaction
from apps.reviews.models import Review
from apps.products.models import ProductComment
from common.audit_services import record_audit_log


class AdminReviewService:
    """
    Administrative moderation operations for Reviews and Q&A Comments.
    """

    @staticmethod
    @transaction.atomic
    def moderate_review(review: Review, is_approved: bool, actor_user=None, request=None) -> Review:
        review.is_approved = is_approved
        review.save(update_fields=["is_approved", "updated_at"])

        record_audit_log(
            action=f"REVIEW_{'APPROVED' if is_approved else 'REJECTED'}",
            resource_type="REVIEW",
            resource_id=str(review.id),
            user=actor_user,
            request=request,
            metadata={"product": review.product.name, "user": review.user.email, "rating": review.rating},
        )

        return review

    @staticmethod
    @transaction.atomic
    def delete_review(review: Review, actor_user=None, request=None) -> None:
        r_id = str(review.id)
        product_name = review.product.name
        review.delete()

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

        # Ensure parent comment is also marked approved
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
