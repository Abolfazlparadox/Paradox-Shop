from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import TimestampMixin, UUIDPrimaryKeyMixin


class Review(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Product Review and Rating entity submitted by verified buyers.
    Governed by an editorial moderation state machine.
    """

    class ReviewStatus(models.TextChoices):
        PENDING = "PENDING", _("Pending Moderation")
        APPROVED = "APPROVED", _("Approved / Public")
        REJECTED = "REJECTED", _("Rejected")
        HIDDEN = "HIDDEN", _("Hidden")

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name=_("product"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name=_("user"),
    )
    rating = models.PositiveSmallIntegerField(_("rating (1-5)"))
    title = models.CharField(_("review title"), max_length=255, null=True, blank=True)
    body = models.TextField(_("review body"), null=True, blank=True)
    pros = models.JSONField(_("pros / highlights"), default=list, blank=True)
    cons = models.JSONField(_("cons / critiques"), default=list, blank=True)
    
    status = models.CharField(
        _("moderation status"),
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
        db_index=True,
    )
    rejection_reason = models.TextField(_("rejection reason"), null=True, blank=True)
    is_verified_purchase = models.BooleanField(_("is verified purchase"), default=False, db_index=True)
    is_approved = models.BooleanField(_("is approved"), default=False, db_index=True)

    helpful_count = models.PositiveIntegerField(_("helpful votes count"), default=0)
    unhelpful_count = models.PositiveIntegerField(_("unhelpful votes count"), default=0)

    class Meta:
        verbose_name = _("Review")
        verbose_name_plural = _("Reviews")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["product", "user"], name="unique_product_user_review"),
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="review_rating_range_1_to_5",
            ),
        ]
        indexes = [
            models.Index(fields=["product", "status", "-created_at"], name="idx_rev_prod_status_created"),
            models.Index(fields=["user", "-created_at"], name="idx_rev_user_created"),
            models.Index(fields=["product", "rating"], name="idx_rev_prod_rating"),
        ]

    def __str__(self):
        return f"Review by {self.user.email} on {self.product.name} ({self.rating}/5) [{self.status}]"

    def save(self, *args, **kwargs):
        self.is_approved = (self.status == self.ReviewStatus.APPROVED)
        super().save(*args, **kwargs)





class ReviewImage(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Media attachment for a product review (up to 5 images).
    Processed asynchronously to generate thumbnail derivatives.
    """

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name=_("review"),
    )
    image = models.ImageField(_("image"), upload_to="reviews/%Y/%m/")
    thumbnail = models.ImageField(_("thumbnail"), upload_to="reviews/thumbs/%Y/%m/", null=True, blank=True)
    original_filename = models.CharField(_("original filename"), max_length=255, null=True, blank=True)
    file_size = models.PositiveIntegerField(_("file size in bytes"), null=True, blank=True)
    mime_type = models.CharField(_("MIME type"), max_length=50, null=True, blank=True)
    is_processed = models.BooleanField(_("is processed"), default=False)
    sort_order = models.PositiveSmallIntegerField(_("sort order"), default=0)

    class Meta:
        verbose_name = _("Review Image")
        verbose_name_plural = _("Review Images")
        ordering = ["sort_order", "created_at"]

    def __str__(self):
        return f"Image for Review {self.review_id} ({self.original_filename or self.id})"


class ReviewVote(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Helpful / Unhelpful voter engagement record on a public review.
    Guarantees strict one-vote-per-user-per-review constraint.
    """

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="votes",
        verbose_name=_("review"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="review_votes",
        verbose_name=_("user"),
    )
    is_helpful = models.BooleanField(_("is helpful"), default=True)

    class Meta:
        verbose_name = _("Review Vote")
        verbose_name_plural = _("Review Votes")
        constraints = [
            models.UniqueConstraint(fields=["review", "user"], name="unique_review_user_vote"),
        ]

    def __str__(self):
        vote_label = "Helpful" if self.is_helpful else "Not Helpful"
        return f"{self.user.email} voted {vote_label} on {self.review_id}"


class ReviewReport(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Community abuse report filed against a review.
    Enters administrator moderation queue.
    """

    class ReportReason(models.TextChoices):
        SPAM = "SPAM", _("Spam / Commercial Solicitation")
        OFFENSIVE = "OFFENSIVE", _("Offensive / Abusive Language")
        FAKE = "FAKE", _("Fake or Inauthentic Review")
        IRRELEVANT = "IRRELEVANT", _("Irrelevant to Artifact Quality")
        INAPPROPRIATE_IMAGE = "INAPPROPRIATE_IMAGE", _("Inappropriate Image Attachment")
        OTHER = "OTHER", _("Other Policy Violation")

    class ReportStatus(models.TextChoices):
        PENDING = "PENDING", _("Pending Review")
        RESOLVED = "RESOLVED", _("Resolved / Action Taken")
        DISMISSED = "DISMISSED", _("Dismissed / False Alarm")

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="reports",
        verbose_name=_("review"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="review_reports",
        verbose_name=_("reporting user"),
    )
    reason = models.CharField(_("report reason"), max_length=50, choices=ReportReason.choices)
    details = models.TextField(_("additional details"), null=True, blank=True)
    status = models.CharField(
        _("report status"),
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.PENDING,
        db_index=True,
    )

    class Meta:
        verbose_name = _("Review Report")
        verbose_name_plural = _("Review Reports")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["review", "user"], name="unique_review_user_report"),
        ]

    def __str__(self):
        return f"Report ({self.reason}) by {self.user.email} on Review {self.review_id}"


class ReviewResponse(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Official authoritative response from Paradox Staff or Atelier Curators.
    """

    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name="staff_response",
        verbose_name=_("review"),
    )
    staff_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="review_staff_responses",
        verbose_name=_("staff member"),
    )
    response_text = models.TextField(_("response text"))
    is_official = models.BooleanField(_("is official team response"), default=True)

    class Meta:
        verbose_name = _("Review Staff Response")
        verbose_name_plural = _("Review Staff Responses")

    def __str__(self):
        return f"Official Response to Review {self.review_id}"


# =====================================================================
# PRODUCT QUESTIONS & ANSWERS (Q&A)
# =====================================================================

class ProductQuestion(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Client technical inquiry or question regarding an artifact.
    Moderated by staff before public display.
    """

    class QuestionStatus(models.TextChoices):
        PENDING = "PENDING", _("Pending Moderation")
        APPROVED = "APPROVED", _("Approved / Public")
        REJECTED = "REJECTED", _("Rejected")
        HIDDEN = "HIDDEN", _("Hidden")

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="questions",
        verbose_name=_("product"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_questions",
        verbose_name=_("inquirer"),
    )
    question = models.TextField(_("question text"))
    status = models.CharField(
        _("moderation status"),
        max_length=20,
        choices=QuestionStatus.choices,
        default=QuestionStatus.PENDING,
        db_index=True,
    )
    rejection_reason = models.TextField(_("rejection reason"), null=True, blank=True)

    class Meta:
        verbose_name = _("Product Question")
        verbose_name_plural = _("Product Questions")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "status", "-created_at"], name="idx_q_prod_status_created"),
            models.Index(fields=["user", "-created_at"], name="idx_q_user_created"),
        ]

    def __str__(self):
        return f"Question by {self.user.email} on {self.product.name} [{self.status}]"


class QuestionAnswer(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Authoritative answer from Paradox Staff / Technical Specialists to a client question.
    """

    question = models.OneToOneField(
        ProductQuestion,
        on_delete=models.CASCADE,
        related_name="answer",
        verbose_name=_("question"),
    )
    staff_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="question_staff_answers",
        verbose_name=_("staff member"),
    )
    answer = models.TextField(_("answer text"))
    is_official = models.BooleanField(_("is official staff answer"), default=True)

    class Meta:
        verbose_name = _("Question Answer")
        verbose_name_plural = _("Question Answers")

    def __str__(self):
        return f"Staff Answer to Question {self.question_id}"


class QuestionReport(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Abuse report filed against a client inquiry.
    """

    question = models.ForeignKey(
        ProductQuestion,
        on_delete=models.CASCADE,
        related_name="reports",
        verbose_name=_("question"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="question_reports",
        verbose_name=_("reporting user"),
    )
    reason = models.CharField(_("report reason"), max_length=50)
    details = models.TextField(_("additional details"), null=True, blank=True)
    status = models.CharField(
        _("report status"),
        max_length=20,
        default="PENDING",
        db_index=True,
    )

    class Meta:
        verbose_name = _("Question Report")
        verbose_name_plural = _("Question Reports")
        constraints = [
            models.UniqueConstraint(fields=["question", "user"], name="unique_question_user_report"),
        ]

    def __str__(self):
        return f"Report on Question {self.question_id} by {self.user.email}"
