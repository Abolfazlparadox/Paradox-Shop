from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class UserManager(BaseUserManager):
    """
    Custom user manager where email is the unique identifier for authentication
    instead of usernames.
    """

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_("The Email field must be set."))
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self.create_user(email, password, **extra_fields)


class User(
    AbstractBaseUser, PermissionsMixin, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin
):
    """
    Custom User model using email as the primary authentication field and UUID as primary key.
    """

    email = models.EmailField(_("email address"), unique=True, db_index=True, max_length=255)
    first_name = models.CharField(_("first name"), max_length=150, blank=True)
    last_name = models.CharField(_("last name"), max_length=150, blank=True)
    phone_number = models.CharField(
        _("phone number"), max_length=20, unique=True, null=True, blank=True, db_index=True
    )

    is_staff = models.BooleanField(
        _("staff status"),
        default=False,
        help_text=_("Designates whether the user can log into this admin site."),
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_(
            "Designates whether this user should be treated as active. "
            "Unselect this instead of deleting accounts."
        ),
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-created_at"]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.email


class UserProfile(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Profile information linked OneToOne with a User.
    """

    class GenderChoices(models.TextChoices):
        MALE = "M", _("Male")
        FEMALE = "F", _("Female")
        OTHER = "O", _("Other")

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="profile", verbose_name=_("User")
    )
    avatar = models.ImageField(
        upload_to="avatars/", null=True, blank=True, verbose_name=_("Avatar")
    )
    national_id = models.CharField(
        max_length=10, unique=True, null=True, blank=True, verbose_name=_("National ID")
    )
    date_of_birth = models.DateField(null=True, blank=True, verbose_name=_("Date of Birth"))
    gender = models.CharField(
        max_length=1, choices=GenderChoices.choices, null=True, blank=True, verbose_name=_("Gender")
    )
    email_verified = models.BooleanField(default=False, verbose_name=_("Email Verified"))
    phone_verified = models.BooleanField(default=False, verbose_name=_("Phone Verified"))

    class Meta:
        verbose_name = _("User Profile")
        verbose_name_plural = _("User Profiles")

    def __str__(self):
        return f"Profile of {self.user.email}"


class Address(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Address model for user shipping/billing locations.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="addresses", verbose_name=_("User")
    )
    title = models.CharField(
        max_length=100, help_text=_("e.g. Home, Work"), verbose_name=_("Title")
    )
    recipient_name = models.CharField(max_length=200, verbose_name=_("Recipient Name"))
    recipient_phone = models.CharField(max_length=20, verbose_name=_("Recipient Phone"))
    province = models.CharField(max_length=100, verbose_name=_("Province"))
    city = models.CharField(max_length=100, verbose_name=_("City"))
    postal_code = models.CharField(max_length=20, verbose_name=_("Postal Code"))
    address_line = models.TextField(verbose_name=_("Address Line"))
    is_default = models.BooleanField(default=False, verbose_name=_("Is Default Address"))

    class Meta:
        verbose_name = _("Address")
        verbose_name_plural = _("Addresses")
        ordering = ["-is_default", "-created_at"]
        indexes = [
            models.Index(fields=["user", "is_deleted"], name="idx_address_user_is_deleted"),
        ]

    def __str__(self):
        return f"{self.title} - {self.recipient_name} ({self.user.email})"
