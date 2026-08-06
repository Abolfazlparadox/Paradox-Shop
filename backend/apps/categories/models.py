from django.db import models
from django.utils.translation import gettext_lazy as _
from common.models import UUIDPrimaryKeyMixin, TimestampMixin

class Category(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Hierarchical product category model supporting nested parent-child relationships.
    """
    name = models.CharField(_('name'), max_length=255)
    slug = models.SlugField(_('slug'), max_length=255, unique=True, db_index=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_('parent category')
    )
    description = models.TextField(_('description'), null=True, blank=True)
    image = models.ImageField(_('image'), upload_to='categories/', null=True, blank=True)
    is_active = models.BooleanField(_('is active'), default=True)
    sort_order = models.IntegerField(_('sort order'), default=0)

    class Meta:
        verbose_name = _('Category')
        verbose_name_plural = _('Categories')
        ordering = ['parent__id', 'sort_order']

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} -> {self.name}"
        return self.name

class CategoryAttribute(UUIDPrimaryKeyMixin):
    """
    Dynamic attribute definitions assigned to a Category (e.g., Color, Screen Size, RAM).
    """
    class AttributeType(models.TextChoices):
        TEXT = 'text', _('Text')
        NUMBER = 'number', _('Number')
        BOOLEAN = 'boolean', _('Boolean')
        SELECT = 'select', _('Select')

    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='attributes',
        verbose_name=_('category')
    )
    name = models.CharField(_('attribute name'), max_length=255)
    attribute_type = models.CharField(
        _('attribute type'),
        max_length=20,
        choices=AttributeType.choices,
        default=AttributeType.TEXT
    )
    is_required = models.BooleanField(_('is required'), default=False)
    is_filterable = models.BooleanField(_('is filterable'), default=False, help_text=_('Used for search/catalog filters'))
    is_variant = models.BooleanField(_('is variant'), default=False, help_text=_('Used to define product SKUs/variants'))
    sort_order = models.IntegerField(_('sort order'), default=0)

    class Meta:
        verbose_name = _('Category Attribute')
        verbose_name_plural = _('Category Attributes')
        ordering = ['category', 'sort_order']

    def __str__(self):
        return f"{self.category.name} - {self.name} ({self.get_attribute_type_display()})"
