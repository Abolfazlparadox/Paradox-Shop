from django.db import transaction
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from apps.products.models import Product, ProductImage, ProductVariant
from common.audit_services import record_audit_log
from common.notification_services import create_admin_notification
from common.models import AdminNotification


class AdminProductService:
    """
    Administrative domain operations for Products and Inventory Variants.
    """

    @staticmethod
    @transaction.atomic
    def create_product(validated_data: dict, actor_user=None, request=None) -> Product:
        variants_data = validated_data.pop("variants", [])
        images_data = validated_data.pop("images", [])

        if not validated_data.get("slug"):
            base_slug = slugify(validated_data.get("name", "artifact"))
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data["slug"] = slug

        product = Product.objects.create(**validated_data)

        # Create default variant if simple product or variants supplied
        if variants_data:
            for v_data in variants_data:
                ProductVariant.objects.create(product=product, **v_data)
        elif validated_data.get("product_type") == Product.ProductType.SIMPLE:
            default_sku = f"PX-{product.slug[:10].upper()}-STD"
            ProductVariant.objects.create(
                product=product,
                sku=default_sku,
                name="Standard Edition",
                stock=validated_data.get("stock", 10),
                is_active=True,
            )

        # Audit log
        record_audit_log(
            action="PRODUCT_CREATE",
            resource_type="PRODUCT",
            resource_id=str(product.id),
            user=actor_user,
            request=request,
            metadata={
                "name": product.name,
                "slug": product.slug,
                "base_price": str(product.base_price),
            },
        )

        return product

    @staticmethod
    @transaction.atomic
    def update_product(product: Product, validated_data: dict, actor_user=None, request=None) -> Product:
        variants_data = validated_data.pop("variants", None)

        for field, value in validated_data.items():
            setattr(product, field, value)
        product.save()

        # Update or create variants if provided
        if variants_data is not None:
            for v_data in variants_data:
                v_id = v_data.get("id")
                if v_id:
                    ProductVariant.objects.filter(id=v_id, product=product).update(**v_data)
                else:
                    ProductVariant.objects.create(product=product, **v_data)

        # Audit log
        record_audit_log(
            action="PRODUCT_UPDATE",
            resource_type="PRODUCT",
            resource_id=str(product.id),
            user=actor_user,
            request=request,
            metadata={"name": product.name, "updated_fields": list(validated_data.keys())},
        )

        return product

    @staticmethod
    @transaction.atomic
    def delete_product(product: Product, actor_user=None, request=None) -> None:
        p_id = str(product.id)
        p_name = product.name
        product.delete()

        record_audit_log(
            action="PRODUCT_DELETE",
            resource_type="PRODUCT",
            resource_id=p_id,
            user=actor_user,
            request=request,
            metadata={"deleted_product_name": p_name},
        )

    @staticmethod
    @transaction.atomic
    def update_variant_stock(variant: ProductVariant, new_stock: int, actor_user=None, request=None) -> ProductVariant:
        if new_stock < 0:
            raise ValidationError({"stock": "Stock count cannot be negative."})

        old_stock = variant.stock
        variant.stock = new_stock
        variant.save(update_fields=["stock", "updated_at"])

        # Check for low-stock alert trigger
        if new_stock <= 5 and (old_stock > 5 or old_stock == 0):
            create_admin_notification(
                title=f"Low Stock Alert: {variant.product.name}",
                message=f"Variant {variant.name} ({variant.sku}) is down to {new_stock} units.",
                notification_type=AdminNotification.NotificationType.STOCK,
                action_url=f"/admin/inventory",
                resource_id=str(variant.id),
            )

        record_audit_log(
            action="INVENTORY_STOCK_UPDATE",
            resource_type="INVENTORY",
            resource_id=str(variant.id),
            user=actor_user,
            request=request,
            metadata={
                "sku": variant.sku,
                "old_stock": old_stock,
                "new_stock": new_stock,
                "product": variant.product.name,
            },
        )

        return variant

    @staticmethod
    @transaction.atomic
    def batch_update_stock(items: list[dict], actor_user=None, request=None) -> list[dict]:
        results = []
        for item in items:
            v_id = item.get("variant_id") or item.get("id")
            stock = item.get("stock")
            if v_id is not None and stock is not None:
                try:
                    variant = ProductVariant.objects.get(id=v_id)
                    AdminProductService.update_variant_stock(
                        variant=variant,
                        new_stock=int(stock),
                        actor_user=actor_user,
                        request=request,
                    )
                    results.append({"id": str(variant.id), "sku": variant.sku, "stock": variant.stock, "success": True})
                except Exception as e:
                    results.append({"id": str(v_id), "error": str(e), "success": False})
        return results
