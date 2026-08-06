from django.db import models
from django.utils.translation import gettext_lazy as _
from common.models import UUIDPrimaryKeyMixin, TimestampMixin


class Brand(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Brand entity for organizing products by manufacturer or brand name.
    """
    name = models.CharField(_('brand name'), max_length=255, unique=True)
    slug = models.SlugField(_('slug'), max_length=255, unique=True, db_index=True)
    description = models.TextField(_('description'), null=True, blank=True)
    logo = models.ImageField(_('logo'), upload_to='brands/', null=True, blank=True)
    is_active = models.BooleanField(_('is active'), default=True)

    class Meta:
        verbose_name = _('Brand')
        verbose_name_plural = _('Brands')
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Core Product entity representing a catalog item.
    """
    class ProductType(models.TextChoices):
        SIMPLE = 'simple', _('Simple Product')
        VARIABLE = 'variable', _('Variable Product')
        DIGITAL = 'digital', _('Digital Product')

    name = models.CharField(_('product name'), max_length=255)
    slug = models.SlugField(_('slug'), max_length=255, unique=True, db_index=True)
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name=_('brand')
    )
    category = models.ForeignKey(
        'categories.Category',
        on_delete=models.PROTECT,
        related_name='products',
        verbose_name=_('category')
    )
    description = models.TextField(_('description'))
    short_description = models.CharField(_('short description'), max_length=500, null=True, blank=True)
    base_price = models.DecimalField(
        _('base price (Rial)'),
        max_digits=12,
        decimal_places=0,
        help_text=_('Base product price in Iranian Rial without decimals.')
    )
    product_type = models.CharField(
        _('product type'),
        max_length=20,
        choices=ProductType.choices,
        default=ProductType.SIMPLE
    )
    is_active = models.BooleanField(_('is active'), default=True)
    is_featured = models.BooleanField(_('is featured'), default=False)

    class Meta:
        verbose_name = _('Product')
        verbose_name_plural = _('Products')
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ProductVariant(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    SKU/Variant model for Products that have variable options (e.g. Color, Size, Storage).
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants',
        verbose_name=_('product')
    )
    sku = models.CharField(_('SKU'), max_length=100, unique=True, db_index=True)
    name = models.CharField(_('variant name'), max_length=255, help_text=_('e.g., Red / 128GB'))
    price_override = models.DecimalField(
        _('price override (Rial)'),
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
        help_text=_('Overrides base product price if specified.')
    )
    stock = models.PositiveIntegerField(_('stock inventory'), default=0)
    is_active = models.BooleanField(_('is active'), default=True)
    attributes = models.JSONField(
        _('variant attributes'),
        default=dict,
        blank=True,
        help_text=_('JSON dictionary of specific variant attribute key-value pairs.')
    )

    class Meta:
        verbose_name = _('Product Variant')
        verbose_name_plural = _('Product Variants')
        ordering = ['product', 'name']

    def __str__(self):
        return f"{self.product.name} - {self.name} ({self.sku})"

    @property
    def final_price(self):
        """
        Returns price_override if set, otherwise falls back to product.base_price.
        """
        return self.price_override if self.price_override is not None else self.product.base_price


class ProductImage(UUIDPrimaryKeyMixin):
    """
    Media gallery image associated with a Product and optionally tied to a specific Variant.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name=_('product')
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='images',
        verbose_name=_('product variant')
    )
    image = models.ImageField(_('image file'), upload_to='products/')
    alt_text = models.CharField(_('alternative text'), max_length=255, null=True, blank=True)
    sort_order = models.IntegerField(_('sort order'), default=0)
    is_primary = models.BooleanField(_('is primary image'), default=False)

    class Meta:
        verbose_name = _('Product Image')
        verbose_name_plural = _('Product Images')
        ordering = ['-is_primary', 'sort_order']

    def __str__(self):
        return f"Image for {self.product.name} ({'Primary' if self.is_primary else f'Order {self.sort_order}'})"


class ProductAttributeValue(UUIDPrimaryKeyMixin):
    """
    Concrete attribute value assigned to a Product based on a CategoryAttribute specification.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='attribute_values',
        verbose_name=_('product')
    )
    attribute = models.ForeignKey(
        'categories.CategoryAttribute',
        on_delete=models.CASCADE,
        related_name='product_values',
        verbose_name=_('category attribute')
    )
    value_text = models.CharField(_('text value'), max_length=255, null=True, blank=True)
    value_number = models.DecimalField(_('number value'), max_digits=10, decimal_places=2, null=True, blank=True)
    value_boolean = models.BooleanField(_('boolean value'), null=True, blank=True)

    class Meta:
        verbose_name = _('Product Attribute Value')
        verbose_name_plural = _('Product Attribute Values')
        constraints = [
            models.UniqueConstraint(fields=['product', 'attribute'], name='unique_product_attribute')
        ]

    def __str__(self):
        val = self.value_text or self.value_number or self.value_boolean
        return f"{self.product.name} - {self.attribute.name}: {val}"