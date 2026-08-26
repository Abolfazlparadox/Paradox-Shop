from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class WishlistConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.wishlist"
    verbose_name = _("Wishlist")
