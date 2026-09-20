import uuid
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.categories.models import Category
from apps.products.models import Brand, Product, ProductImage, ProductVariant
from apps.reviews.models import Review
from apps.users.models import User


class Command(BaseCommand):
    help = "Safely seed or clean synthetic products, variants, and categories for performance load testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=50,
            help="Number of synthetic products to generate (default: 50).",
        )
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Clean all synthetic performance test data previously created.",
        )

    def handle(self, *args, **options):
        clean_mode = options.get("clean")
        count = options.get("count", 50)

        if clean_mode:
            self._cleanup()
            return

        self._seed(count)

    def _cleanup(self):
        deleted_reviews, _ = Review.objects.filter(title__startswith="[PERF-TEST]").delete()
        deleted_products, _ = Product.objects.filter(name__startswith="[PERF-TEST]").delete()
        deleted_categories, _ = Category.objects.filter(name__startswith="[PERF-TEST]").delete()
        deleted_brands, _ = Brand.objects.filter(name__startswith="[PERF-TEST]").delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully cleaned synthetic performance data:\n"
                f"- Products: {deleted_products}\n"
                f"- Reviews: {deleted_reviews}\n"
                f"- Categories: {deleted_categories}\n"
                f"- Brands: {deleted_brands}"
            )
        )

    def _seed(self, count: int):
        self.stdout.write(f"Seeding {count} synthetic products for performance testing...")

        with transaction.atomic():
            brand, _ = Brand.objects.get_or_create(
                slug="perf-test-brand",
                defaults={"name": "[PERF-TEST] Benchmark Brand", "is_active": True},
            )

            category, _ = Category.objects.get_or_create(
                slug="perf-test-category",
                defaults={
                    "name": "[PERF-TEST] Benchmark Category",
                    "sort_order": 999,
                    "is_active": True,
                },
            )

            user = User.objects.first()

            products = []
            variants = []
            images = []
            reviews = []

            for i in range(1, count + 1):
                uid = uuid.uuid4().hex[:8]
                slug = f"perf-test-product-{i}-{uid}"
                prod = Product(
                    name=f"[PERF-TEST] Monolith Object #{i}",
                    slug=slug,
                    brand=brand,
                    category=category,
                    short_description=f"Synthetic catalog item #{i} for performance and pagination load testing.",
                    description=f"Detailed specifications for synthetic artifact #{i}.",
                    base_price=Decimal(str(1_000_000 + i * 50_000)),
                    is_active=True,
                    is_featured=(i % 5 == 0),
                )
                products.append(prod)

            created_products = Product.objects.bulk_create(products)

            for idx, prod in enumerate(created_products, start=1):
                # 2 variants per product
                for v_idx in range(1, 3):
                    sku = f"PERF-SKU-{idx}-{v_idx}-{uuid.uuid4().hex[:4]}"
                    var = ProductVariant(
                        product=prod,
                        sku=sku,
                        name=f"Edition {v_idx}",
                        price_override=Decimal(str(int(prod.base_price) + v_idx * 100_000)),
                        stock=50,
                        is_active=True,
                    )
                    variants.append(var)

                # Primary image record
                img = ProductImage(
                    product=prod,
                    alt_text=f"Primary image for {prod.name}",
                    sort_order=1,
                    is_primary=True,
                )
                images.append(img)

                # 1 Review for some products
                if user and idx % 2 == 0:
                    rev = Review(
                        product=prod,
                        user=user,
                        rating=5 if idx % 3 == 0 else 4,
                        title=f"[PERF-TEST] Exemplary craftsmanship on #{idx}",
                        body="Synthetic review benchmark verifying aggregation and query plans.",
                        status=Review.ReviewStatus.APPROVED,
                        is_approved=True,
                        is_verified_purchase=True,
                    )
                    reviews.append(rev)

            ProductVariant.objects.bulk_create(variants)
            ProductImage.objects.bulk_create(images)
            if reviews:
                Review.objects.bulk_create(reviews)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded:\n"
                f"- {len(created_products)} synthetic Products\n"
                f"- {len(variants)} Variants\n"
                f"- {len(images)} Images\n"
                f"- {len(reviews)} Reviews\n"
                f"Database now contains {Product.objects.count()} total products."
            )
        )
