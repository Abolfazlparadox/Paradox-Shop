"""
Base44 Demo Data Seed Command

Idempotent, non-destructive seed that populates a complete demo dataset
across all Paradox Shop domains: users, addresses, categories, brands,
products, variants, images, promotions, coupons, shipping, orders,
payments, reviews, Q&A, and wishlists.

Usage:
    python manage.py seed_base44_demo
    python manage.py seed_base44_demo --clean   # remove demo data
"""

import io
from datetime import timedelta
from decimal import Decimal

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.cart.models import Cart, CartItem
from apps.categories.models import Category
from apps.orders.models import Order, OrderAddress, OrderItem
from apps.payments.models import Payment
from apps.products.models import Brand, Product, ProductImage, ProductVariant
from apps.promotions.models import Coupon, DiscountType, Promotion
from apps.reviews.models import ProductQuestion, QuestionAnswer, Review
from apps.shipping.models import (
    Shipment,
    ShippingMethod,
    ShippingZone,
    ShippingZoneRate,
)
from apps.users.models import Address, User
from apps.wishlist.models import Wishlist, WishlistItem

try:
    from PIL import Image as PILImage
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


def _make_placeholder_image(text, color=(30, 30, 30), bg=(240, 240, 240)):
    """Generate a small placeholder JPEG with a border."""
    if not HAS_PIL:
        return None
    img = PILImage.new("RGB", (400, 400), bg)
    for x in range(400):
        img.putpixel((x, 0), color)
        img.putpixel((x, 399), color)
        img.putpixel((0, x), color)
        img.putpixel((399, x), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    buf.seek(0)
    return ContentFile(buf.read())


# ---------------------------------------------------------------------------
# Static data definitions
# ---------------------------------------------------------------------------

CATEGORIES = [
    ("Timepieces", "timepieces", None, "Precision-engineered chronographs and sculptural timekeeping instruments."),
    ("Audio", "audio", None, "Architectural sound systems and reference-grade acoustic artifacts."),
    ("Optics", "optics", None, "Optical instruments distilled to their essential geometric form."),
    ("Lighting", "lighting", None, "Sculptural illumination objects for the considered interior."),
    ("Accessories", "accessories", None, "Minimalist carry goods and personal artifacts."),
    ("Wristwatches", "wristwatches", "timepieces", "Wrist-worn timekeeping instruments."),
    ("Floor-standing", "floor-standing", "audio", "Floor-standing acoustic monoliths."),
]

BRANDS = [
    ("PARADOX", "paradox", "Impossible minimalism. Engineered luxury artifacts."),
    ("MONOLITH", "monolith", "Single-block precision manufacturing."),
    ("AETHER", "aether", "Reference-grade acoustic engineering."),
]

PRODUCTS = [
    # (name, slug, category_slug, brand_name, price, featured, active, desc)
    ("Monolith Chronograph", "monolith-chronograph", "wristwatches", "PARADOX", 48500000, True, True,
     "A single-block sculpted timepiece. No dial borders, no compromise. Machined from grade-5 titanium."),
    ("Penrose Tourbillon", "penrose-tourbillon", "wristwatches", "MONOLITH", 92000000, True, True,
     "Impossible geometry rendered in titanium and sapphire. A flying tourbillon at its core."),
    ("Obelisk GMT", "obelisk-gmt", "wristwatches", "PARADOX", 31000000, False, True,
     "Dual-time tracking in a monolithic 40mm case. Brushed ceramic bezel."),
    ("Aether Reference Monitor", "aether-reference-monitor", "floor-standing", "AETHER", 67000000, True, True,
     "A floor-standing acoustic monolith. Reference-grade, sculptural. Beryllium tweeter, carbon midrange."),
    ("Void Studio Headphones", "void-studio-headphones", "audio", "PARADOX", 18500000, False, True,
     "Closed-back precision. Aluminum, leather, silence. Planar magnetic drivers."),
    ("Prism Turntable", "prism-turntable", "audio", "MONOLITH", 42000000, False, True,
     "Belt-drive turntable machined from a single billet of aluminum. Magnetic cartridge."),
    ("Lumen Monolith Lamp", "lumen-monolith-lamp", "lighting", "PARADOX", 22000000, True, True,
     "A column of light. Marble base, brushed brass column, LED core. Dimmable to 2700K."),
    ("Apex Floor Lamp", "apex-floor-lamp", "lighting", "MONOLITH", 14500000, False, True,
     "Telescopic illumination in graphite and opal glass. Foot-dimmable."),
    ("Spectre Binoculars", "spectre-binoculars", "optics", "AETHER", 28000000, True, True,
     "ED-glass optics in a milled aluminum chassis. 10x42, phase-coated prisms."),
    ("Horizon Telescope", "horizon-telescope", "optics", "MONOLITH", 56000000, False, True,
     "A desktop observatory. Computerised equatorial mount, 90mm aperture."),
    ("Vector Briefcase", "vector-briefcase", "accessories", "PARADOX", 16000000, False, True,
     "Full-grain leather over a carbon-fiber frame. TSA-approved locks."),
    ("Axis Wallet", "axis-wallet", "accessories", "PARADOX", 3500000, False, True,
     "Three cards, one fold. Vegetable-tanned leather. RFID-shielded."),
    ("Discontinued Artifact", "discontinued-artifact", "accessories", "MONOLITH", 8000000, False, False,
     "A retired design study. No longer in production."),
]

VARIANT_SPECS = [
    # (product_slug, variant_name, price_offset, stock)
    ("monolith-chronograph", "Graphite Dial", 0, 15),
    ("monolith-chronograph", "Silver Dial", 2000000, 8),
    ("penrose-tourbillon", "Titanium", 0, 5),
    ("obelisk-gmt", "Standard", 0, 25),
    ("aether-reference-monitor", "Walnut Finish", 0, 10),
    ("aether-reference-monitor", "Piano Black", 3000000, 6),
    ("void-studio-headphones", "Onyx", 0, 30),
    ("prism-turntable", "Standard", 0, 12),
    ("lumen-monolith-lamp", "Warm Light", 0, 20),
    ("apex-floor-lamp", "Standard", 0, 18),
    ("spectre-binoculars", "Standard", 0, 22),
    ("horizon-telescope", "Standard", 0, 7),
    ("vector-briefcase", "Black", 0, 14),
    ("axis-wallet", "Tan", 0, 50),
]

PROMOTIONS = [
    # (name, slug, discount_type, discount_value, max_discount, is_active, start_offset_days, end_offset_days, priority, target_type, target_slug)
    ("Monolith Launch — 15% Off", "monolith-launch-15", "percentage", Decimal("15"), None,
     True, None, None, 10, "brand", "PARADOX"),
    ("Aether Audio — 2,000,000 Rial Off", "aether-audio-fixed", "fixed_amount", Decimal("2000000"), None,
     True, None, None, 20, "brand", "AETHER"),
    ("Lighting Collection — 10% Capped at 3M", "lighting-capped-10", "percentage", Decimal("10"), Decimal("3000000"),
     True, None, None, 15, "category", "lighting"),
    ("Chronograph Feature — 20% Off", "chrono-feature-20", "percentage", Decimal("20"), None,
     True, None, None, 5, "product", "monolith-chronograph"),
    ("Inactive Summer Promo", "inactive-summer-promo", "percentage", Decimal("25"), None,
     False, None, None, 30, "all", None),
    ("Expired New Year — 30% Off", "expired-new-year-30", "percentage", Decimal("30"), None,
     True, -60, -30, 1, "all", None),
]

COUPONS = [
    # (code, description, discount_type, discount_value, max_discount, min_order, is_active, start_offset, end_offset, total_limit, per_user_limit, audience, eligible_email)
    ("PARADOX10", "10% off any order — primary demo coupon", "percentage", Decimal("10"), None,
     Decimal("0"), True, None, None, None, 1, "all", None),
    ("SAVE5M", "5,000,000 Rial off orders above 30M", "fixed_amount", Decimal("5000000"), None,
     Decimal("30000000"), True, None, None, 100, 3, "all", None),
    ("WELCOME15", "15% off, capped at 10M Rial", "percentage", Decimal("15"), Decimal("10000000"),
     Decimal("0"), True, None, None, 50, 1, "all", None),
    ("LUXE20", "20% off — usage limited to 5 total", "percentage", Decimal("20"), None,
     Decimal("0"), True, None, None, 5, 1, "all", None),
    ("EXPIRED2025", "Expired coupon — no longer valid", "percentage", Decimal("50"), None,
     Decimal("0"), True, -60, -30, None, 1, "all", None),
    ("VIPONLY", "VIP-only coupon for demo customer", "fixed_amount", Decimal("10000000"), None,
     Decimal("0"), True, None, None, 10, 3, "specific", "customer@paradox.shop"),
]

SHIPPING_METHODS = [
    ("Standard Delivery", "standard", "Reliable ground delivery via Paradox Express Fleet.", 500000, 20000000, 3, 5, 1),
    ("Express Delivery", "express", "Priority air freight with tracking.", 1200000, 50000000, 1, 2, 2),
    ("White Glove", "white-glove", "Personal delivery, unboxing, and installation.", 3000000, None, 2, 4, 3),
]

SHIPPING_ZONES = [
    ("Tehran Metro", ["Tehran", "Alborz"], [], True),
    ("National — All Provinces", ["*"], [], True),
]

SHIPPING_ZONE_RATES = [
    ("Tehran Metro", "standard", None, 0),
    ("Tehran Metro", "express", None, 0),
    ("National — All Provinces", "standard", None, 200000),
    ("National — All Provinces", "express", None, 500000),
    ("National — All Provinces", "white-glove", None, 0),
]

REVIEWS_DATA = [
    # (product_slug, user_email, rating, title, body, verified, pros, cons)
    ("monolith-chronograph", "customer@paradox.shop", 5, "A sculptural masterpiece",
     "The Monolith Chronograph exceeds every expectation. The single-block construction is unlike anything else on the market.",
     True, ["Exceptional build quality", "Unique design language", "Perfect weight"],
     ["Premium pricing", "Limited availability"]),
    ("monolith-chronograph", "customer2@paradox.shop", 4, "Outstanding but pricey",
     "Beautiful timepiece with incredible attention to detail. The graphite dial is stunning in person.",
     True, ["Beautiful dial", "Comfortable on wrist"],
     ["Wish it had a date complication"]),
    ("penrose-tourbillon", "customer@paradox.shop", 5, "Engineering perfection",
     "The flying tourbillon is mesmerizing. This is the pinnacle of independent watchmaking.",
     True, ["Tourbillon movement", "Titanium construction", "Sapphire caseback"],
     []),
    ("aether-reference-monitor", "customer2@paradox.shop", 5, "Reference-grade sound",
     "These monitors replaced my previous reference system. The imaging is pin-point precise.",
     True, ["Incredible imaging", "Beautiful finish", "Authoritative bass"],
     ["Heavy — needs a sturdy floor"]),
    ("void-studio-headphones", "customer@paradox.shop", 4, "Precision listening",
     "The planar magnetic drivers deliver a level of detail I didn't know existed in this price range.",
     True, ["Detailed soundstage", "Premium materials"],
     ["Can get warm during long sessions"]),
    ("lumen-monolith-lamp", "customer2@paradox.shop", 5, "Sculptural illumination",
     "This is not just a lamp — it's a sculptural object that happens to produce beautiful warm light.",
     True, ["Marble base is gorgeous", "Perfect dimming range"],
     []),
    ("spectre-binoculars", "customer@paradox.shop", 4, "Crystal clear optics",
     "The ED glass makes a noticeable difference. Build quality is exceptional.",
     True, ["Sharp edge-to-edge", "Solid build"],
     ["Slightly heavy for extended use"]),
    ("prism-turntable", "customer2@paradox.shop", 5, "Audiophile dream",
     "The single-billet construction eliminates resonance. My records have never sounded better.",
     True, ["Dead-quiet background", "Beautiful machining"],
     ["Requires careful setup"]),
]

QUESTIONS_DATA = [
    # (product_slug, user_email, question, status, answer_text, staff_email)
    ("monolith-chronograph", "customer@paradox.shop",
     "Is the crystal sapphire or mineral glass?", "APPROVED",
     "The Monolith Chronograph features a 3mm double-domed sapphire crystal with anti-reflective coating on both surfaces.",
     "admin@paradox.shop"),
    ("aether-reference-monitor", "customer2@paradox.shop",
     "What is the frequency response range?", "APPROVED",
     "The Aether Reference Monitor covers 28Hz to 35kHz (+/-3dB). Full specifications are available on the product page.",
     "admin@paradox.shop"),
    ("penrose-tourbillon", "customer@paradox.shop",
     "What is the power reserve?", "APPROVED",
     "The Penrose Tourbillon offers a 72-hour power reserve with a single barrel mainspring.",
     "admin@paradox.shop"),
    ("void-studio-headphones", "customer2@paradox.shop",
     "Are replacement cables available?", "PENDING", None, None),
    ("lumen-monolith-lamp", "customer@paradox.shop",
     "Can the LED be replaced?", "PENDING", None, None),
]


class Command(BaseCommand):
    help = "Seed complete Base44 demo data across all Paradox Shop domains (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Remove all Base44 demo data.",
        )

    def handle(self, *args, **options):
        if options.get("clean"):
            self._clean()
            return
        self._seed()

    # -----------------------------------------------------------------------
    # Clean
    # -----------------------------------------------------------------------

    def _clean(self):
        """Remove all demo data identified by known slugs/codes/emails."""
        demo_emails = {"admin@paradox.shop", "customer@paradox.shop", "customer2@paradox.shop"}
        demo_slugs = {p[1] for p in PRODUCTS} | {b[1] for b in BRANDS} | {c[1] for c in CATEGORIES}
        demo_promo_slugs = {p[1] for p in PROMOTIONS}
        demo_coupon_codes = {c[0] for c in COUPONS}
        demo_shipping_codes = {s[1] for s in SHIPPING_METHODS}
        demo_zone_names = {z[0] for z in SHIPPING_ZONES}

        WishlistItem.objects.filter(wishlist__user__email__in=demo_emails).delete()
        Wishlist.objects.filter(user__email__in=demo_emails).delete()
        QuestionAnswer.objects.filter(question__user__email__in=demo_emails).delete()
        ProductQuestion.objects.filter(user__email__in=demo_emails).delete()
        Review.objects.filter(user__email__in=demo_emails).delete()
        Shipment.objects.filter(order__user__email__in=demo_emails).delete()
        Payment.objects.filter(order__user__email__in=demo_emails).delete()
        OrderAddress.objects.filter(order__user__email__in=demo_emails).delete()
        OrderItem.objects.filter(order__user__email__in=demo_emails).delete()
        Order.objects.filter(user__email__in=demo_emails).delete()
        CartItem.objects.filter(cart__user__email__in=demo_emails).delete()
        Cart.objects.filter(user__email__in=demo_emails).delete()
        Address.objects.filter(user__email__in=demo_emails).delete()
        ShippingZoneRate.objects.filter(zone__name__in=demo_zone_names).delete()
        ShippingZone.objects.filter(name__in=demo_zone_names).delete()
        ShippingMethod.objects.filter(code__in=demo_shipping_codes).delete()
        Coupon.objects.filter(code__in=demo_coupon_codes).delete()
        Promotion.objects.filter(slug__in=demo_promo_slugs).delete()
        ProductImage.objects.filter(product__slug__in=demo_slugs).delete()
        ProductVariant.objects.filter(product__slug__in=demo_slugs).delete()
        Product.objects.filter(slug__in=demo_slugs).delete()
        Brand.objects.filter(slug__in={b[1] for b in BRANDS}).delete()
        Category.objects.filter(slug__in=demo_slugs).delete()
        User.objects.filter(email__in=demo_emails).delete()
        self.stdout.write(self.style.SUCCESS("Cleaned all Base44 demo data."))

    # -----------------------------------------------------------------------
    # Seed
    # -----------------------------------------------------------------------

    def _seed(self):
        now = timezone.now()
        self.stdout.write("Seeding Base44 demo data...")

        with transaction.atomic():
            users = self._seed_users()
            self._seed_addresses(users)
            categories = self._seed_categories()
            brands = self._seed_brands()
            products, variants = self._seed_products(categories, brands)
            self._seed_product_images(products)
            self._seed_promotions(products, categories, brands)
            self._seed_coupons(users)
            self._seed_shipping()
            self._seed_orders(users, products, now)
            self._seed_reviews(users, products)
            self._seed_questions(users, products)
            self._seed_wishlist(users, products)
            self._seed_cart(users, products)

        self._print_summary()

    # -----------------------------------------------------------------------
    # Users
    # -----------------------------------------------------------------------

    def _seed_users(self):
        users = {}
        defs = [
            ("admin@paradox.shop", "Paradox Admin", "paradox-admin-2024", True, True),
            ("customer@paradox.shop", "Demo Customer", "paradox-customer-2024", False, False),
            ("customer2@paradox.shop", "Second Customer", "paradox-customer2-2024", False, False),
        ]
        for email, name, password, is_staff, is_superuser in defs:
            parts = name.split(" ", 1)
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": parts[0],
                    "last_name": parts[1] if len(parts) > 1 else "",
                    "is_staff": is_staff,
                    "is_superuser": is_superuser,
                    "is_active": True,
                },
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  Created user: {email}")
            users[email] = user
        return users

    # -----------------------------------------------------------------------
    # Addresses
    # -----------------------------------------------------------------------

    def _seed_addresses(self, users):
        customer = users["customer@paradox.shop"]
        addrs = [
            ("Home", "Demo Customer", "Tehran", "Tehran", "1234567890",
             "1234 Valiasr Street, Apt 5B, Tehran", True),
            ("Office", "Demo Customer", "Tehran", "Tehran", "1234567891",
             "5678 Saadi Street, Floor 3, Tehran", False),
        ]
        for title, name, province, city, postal, line, is_default in addrs:
            Address.objects.get_or_create(
                user=customer, title=title,
                defaults={
                    "recipient_name": name,
                    "recipient_phone": "+989121234567",
                    "province": province,
                    "city": city,
                    "postal_code": postal,
                    "address_line": line,
                    "is_default": is_default,
                },
            )
        self.stdout.write(f"  Addresses: {Address.objects.count()}")

    # -----------------------------------------------------------------------
    # Categories
    # -----------------------------------------------------------------------

    def _seed_categories(self):
        cats = {}
        for name, slug, parent_slug, desc in CATEGORIES:
            parent = cats.get(parent_slug) if parent_slug else None
            cat, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "description": desc,
                    "is_active": True,
                    "sort_order": 0,
                    "parent": parent,
                },
            )
            cats[slug] = cat
        self.stdout.write(f"  Categories: {Category.objects.count()}")
        return cats

    # -----------------------------------------------------------------------
    # Brands
    # -----------------------------------------------------------------------

    def _seed_brands(self):
        brands = {}
        for name, slug, desc in BRANDS:
            brand, _ = Brand.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "is_active": True},
            )
            brands[name] = brand
        self.stdout.write(f"  Brands: {Brand.objects.count()}")
        return brands

    # -----------------------------------------------------------------------
    # Products + Variants
    # -----------------------------------------------------------------------

    def _seed_products(self, categories, brands):
        products = {}
        for name, slug, cat_slug, brand_name, price, featured, active, desc in PRODUCTS:
            cat = categories.get(cat_slug)
            brand = brands.get(brand_name)
            p, _ = Product.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "category": cat,
                    "brand": brand,
                    "description": desc,
                    "short_description": desc[:200],
                    "base_price": Decimal(price),
                    "is_active": active,
                    "is_featured": featured,
                },
            )
            products[slug] = p

        variants = {}
        for prod_slug, vname, price_offset, stock in VARIANT_SPECS:
            p = products.get(prod_slug)
            if not p:
                continue
            sku = f"PDX-{prod_slug.upper().replace('-', '')}-{vname.upper().replace(' ', '')}"
            price_override = (p.base_price + Decimal(price_offset)) if price_offset else None
            v, _ = ProductVariant.objects.update_or_create(
                sku=sku,
                defaults={
                    "product": p,
                    "name": vname,
                    "price_override": price_override,
                    "stock": stock,
                    "is_active": True,
                },
            )
            variants[sku] = v

        self.stdout.write(f"  Products: {Product.objects.count()}, Variants: {ProductVariant.objects.count()}")
        return products, variants

    # -----------------------------------------------------------------------
    # Product Images
    # -----------------------------------------------------------------------

    def _seed_product_images(self, products):
        for slug, p in products.items():
            existing = p.images.filter(is_primary=True).first()
            if existing and existing.image:
                continue
            p.images.all().delete()
            img_file = _make_placeholder_image(slug)
            pi = ProductImage(product=p, alt_text=p.name, sort_order=1, is_primary=True)
            if img_file:
                pi.image.save(f"{slug}.jpg", img_file, save=False)
            pi.save()
        self.stdout.write(f"  Product Images: {ProductImage.objects.count()}")

    # -----------------------------------------------------------------------
    # Promotions
    # -----------------------------------------------------------------------

    def _seed_promotions(self, products, categories, brands):
        now = timezone.now()
        for (name, slug, dtype, value, max_disc, is_active,
             start_off, end_off, priority, target_type, target_slug) in PROMOTIONS:
            start_at = (now + timedelta(days=start_off)) if start_off is not None else None
            end_at = (now + timedelta(days=end_off)) if end_off is not None else None

            if end_off is not None and end_off < 0:
                is_active = False

            promo, created = Promotion.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "description": name,
                    "discount_type": dtype,
                    "discount_value": value,
                    "max_discount_amount": max_disc,
                    "start_at": start_at,
                    "end_at": end_at,
                    "is_active": is_active,
                    "priority": priority,
                },
            )
            if created:
                self.stdout.write(f"  Created promotion: {name}")

            promo.included_products.clear()
            promo.excluded_products.clear()
            promo.included_categories.clear()
            promo.included_brands.clear()

            if target_type == "product" and target_slug:
                p = products.get(target_slug)
                if p:
                    promo.included_products.add(p)
            elif target_type == "category" and target_slug:
                c = categories.get(target_slug)
                if c:
                    promo.included_categories.add(c)
            elif target_type == "brand" and target_slug:
                b = brands.get(target_slug)
                if b:
                    promo.included_brands.add(b)

        self.stdout.write(f"  Promotions: {Promotion.objects.count()}")

    # -----------------------------------------------------------------------
    # Coupons
    # -----------------------------------------------------------------------

    def _seed_coupons(self, users):
        now = timezone.now()
        from apps.promotions.models import AudienceType

        for (code, desc, dtype, value, max_disc, min_order,
             is_active, start_off, end_off, total_limit, per_user_limit,
             audience, eligible_email) in COUPONS:

            start_at = (now + timedelta(days=start_off)) if start_off is not None else None
            end_at = (now + timedelta(days=end_off)) if end_off is not None else None

            if end_off is not None and end_off < 0:
                is_active = False

            coupon, created = Coupon.objects.update_or_create(
                code=code,
                defaults={
                    "description": desc,
                    "discount_type": dtype,
                    "discount_value": value,
                    "max_discount_amount": max_disc,
                    "min_order_subtotal": min_order,
                    "start_at": start_at,
                    "end_at": end_at,
                    "is_active": is_active,
                    "total_usage_limit": total_limit,
                    "per_user_usage_limit": per_user_limit,
                    "usage_count": 0,
                    "audience_type": audience,
                },
            )
            if created:
                self.stdout.write(f"  Created coupon: {code}")

            coupon.eligible_users.clear()
            if audience == "specific" and eligible_email:
                u = users.get(eligible_email)
                if u:
                    coupon.eligible_users.add(u)

        self.stdout.write(f"  Coupons: {Coupon.objects.count()}")

    # -----------------------------------------------------------------------
    # Shipping
    # -----------------------------------------------------------------------

    def _seed_shipping(self):
        methods = {}
        for name, code, desc, base_rate, free_threshold, days_min, days_max, sort in SHIPPING_METHODS:
            m, _ = ShippingMethod.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": desc,
                    "base_rate": Decimal(base_rate),
                    "free_shipping_threshold": Decimal(free_threshold) if free_threshold else None,
                    "estimated_days_min": days_min,
                    "estimated_days_max": days_max,
                    "is_active": True,
                    "sort_order": sort,
                },
            )
            methods[code] = m

        zones = {}
        for name, provinces, cities, is_active in SHIPPING_ZONES:
            z, _ = ShippingZone.objects.update_or_create(
                name=name,
                defaults={"provinces": provinces, "cities": cities, "is_active": is_active},
            )
            zones[name] = z

        for zone_name, method_code, rate_override, addl_fee in SHIPPING_ZONE_RATES:
            z = zones.get(zone_name)
            m = methods.get(method_code)
            if not z or not m:
                continue
            ShippingZoneRate.objects.update_or_create(
                zone=z, method=m,
                defaults={
                    "rate_override": Decimal(rate_override) if rate_override else None,
                    "additional_fee": Decimal(addl_fee),
                    "is_active": True,
                },
            )

        self.stdout.write(f"  Shipping Methods: {ShippingMethod.objects.count()}, Zones: {ShippingZone.objects.count()}")

    # -----------------------------------------------------------------------
    # Orders + Payments + Shipments
    # -----------------------------------------------------------------------

    def _seed_orders(self, users, products, now):
        # (order_num, user_email, status, items, shipping_cost, discount, coupon_code, paid_offset_days, cancelled_offset_days, ship_status, ship_method_code)
        order_defs = [
            ("PDX-100001", "customer@paradox.shop", "delivered",
             [("monolith-chronograph", 1), ("axis-wallet", 2)],
             500000, 0, None, -30, None, "delivered", "standard"),
            ("PDX-100002", "customer@paradox.shop", "shipped",
             [("aether-reference-monitor", 1)],
             1200000, 0, "PARADOX10", -10, None, "in_transit", "express"),
            ("PDX-100003", "customer2@paradox.shop", "processing",
             [("void-studio-headphones", 1), ("spectre-binoculars", 1)],
             500000, 0, None, -3, None, None, None),
            ("PDX-100004", "customer2@paradox.shop", "delivered",
             [("lumen-monolith-lamp", 2)],
             0, 0, "SAVE5M", -20, None, "delivered", "standard"),
            ("PDX-100005", "customer@paradox.shop", "cancelled",
             [("horizon-telescope", 1)],
             1200000, 0, None, None, -5, None, None),
            ("PDX-100006", "customer2@paradox.shop", "pending",
             [("prism-turntable", 1)],
             500000, 0, None, None, None, None, None),
            ("PDX-100007", "customer@paradox.shop", "delivered",
             [("penrose-tourbillon", 1)],
             3000000, 0, None, -45, None, "delivered", "white-glove"),
        ]

        for (order_num, user_email, status, items, ship_cost, discount,
             coupon_code, paid_off, cancelled_off, ship_status, ship_method_code) in order_defs:

            user = users[user_email]
            subtotal = Decimal("0")
            line_items = []
            for prod_slug, qty in items:
                p = products.get(prod_slug)
                if not p:
                    continue
                v = p.variants.first()
                unit_price = v.final_price if v else p.base_price
                line_total = unit_price * qty
                subtotal += line_total
                line_items.append((p, v, unit_price, qty, line_total))

            total = subtotal + Decimal(str(ship_cost)) - Decimal(str(discount))
            if total < 0:
                total = Decimal("0")

            paid_at = (now + timedelta(days=paid_off)) if paid_off is not None else None
            cancelled_at = (now + timedelta(days=cancelled_off)) if cancelled_off is not None else None

            order, created = Order.objects.get_or_create(
                order_number=order_num,
                defaults={
                    "user": user,
                    "status": status,
                    "subtotal": subtotal,
                    "shipping_cost": Decimal(str(ship_cost)),
                    "discount_amount": Decimal(str(discount)),
                    "coupon_code": coupon_code,
                    "total": total,
                    "paid_at": paid_at,
                    "cancelled_at": cancelled_at,
                },
            )

            if created:
                for p, v, unit_price, qty, line_total in line_items:
                    OrderItem.objects.create(
                        order=order,
                        product=p,
                        variant=v,
                        product_name=p.name,
                        variant_name=v.name if v else None,
                        sku=v.sku if v else f"PDX-{p.slug.upper()}",
                        quantity=qty,
                        unit_price=unit_price,
                        total_price=line_total,
                    )

                OrderAddress.objects.create(
                    order=order,
                    recipient_name=user.full_name or user.email,
                    recipient_phone="+989121234567",
                    province="Tehran",
                    city="Tehran",
                    postal_code="1234567890",
                    address_line="1234 Valiasr Street, Apt 5B, Tehran",
                )

                if status != "cancelled":
                    pay_status = "succeeded" if status in ("processing", "shipped", "delivered") else "pending"
                    Payment.objects.create(
                        order=order,
                        amount=total,
                        status=pay_status,
                        payment_method="online",
                        gateway="mock-paradox-gateway",
                        transaction_id=f"MOCK-TXN-{order_num}",
                    )

                if ship_status:
                    method = ShippingMethod.objects.filter(code=ship_method_code).first() if ship_method_code else None
                    shipped_at = (now + timedelta(days=paid_off)) if paid_off and ship_status in ("in_transit", "out_for_delivery", "delivered") else None
                    delivered_at = (now + timedelta(days=paid_off + 2)) if paid_off and ship_status == "delivered" else None
                    Shipment.objects.create(
                        order=order,
                        shipping_method=method,
                        tracking_code=f"PDX-TRACK-{order_num}" if ship_status != "pending" else None,
                        carrier_name="Paradox Express Fleet",
                        shipping_fee=Decimal(str(ship_cost)),
                        status=ship_status,
                        shipped_at=shipped_at,
                        delivered_at=delivered_at,
                    )

        self.stdout.write(f"  Orders: {Order.objects.count()}, Payments: {Payment.objects.count()}, Shipments: {Shipment.objects.count()}")

    # -----------------------------------------------------------------------
    # Reviews
    # -----------------------------------------------------------------------

    def _seed_reviews(self, users, products):
        for prod_slug, user_email, rating, title, body, verified, pros, cons in REVIEWS_DATA:
            p = products.get(prod_slug)
            u = users.get(user_email)
            if not p or not u:
                continue
            Review.objects.update_or_create(
                product=p, user=u,
                defaults={
                    "rating": rating,
                    "title": title,
                    "body": body,
                    "pros": pros,
                    "cons": cons,
                    "status": Review.ReviewStatus.APPROVED,
                    "is_verified_purchase": verified,
                    "helpful_count": max(0, rating - 2) * 3,
                    "unhelpful_count": 1 if rating <= 3 else 0,
                },
            )
        self.stdout.write(f"  Reviews: {Review.objects.count()}")

    # -----------------------------------------------------------------------
    # Q&A
    # -----------------------------------------------------------------------

    def _seed_questions(self, users, products):
        for prod_slug, user_email, question, status, answer_text, staff_email in QUESTIONS_DATA:
            p = products.get(prod_slug)
            u = users.get(user_email)
            if not p or not u:
                continue
            q, created = ProductQuestion.objects.get_or_create(
                product=p, user=u, question=question,
                defaults={"status": status},
            )
            if created and answer_text and staff_email:
                staff = users.get(staff_email)
                QuestionAnswer.objects.update_or_create(
                    question=q,
                    defaults={
                        "staff_user": staff,
                        "answer": answer_text,
                        "is_official": True,
                    },
                )
        self.stdout.write(f"  Questions: {ProductQuestion.objects.count()}, Answers: {QuestionAnswer.objects.count()}")

    # -----------------------------------------------------------------------
    # Wishlist
    # -----------------------------------------------------------------------

    def _seed_wishlist(self, users, products):
        customer = users["customer@paradox.shop"]
        wl, _ = Wishlist.objects.get_or_create(user=customer)

        for slug in ["penrose-tourbillon", "aether-reference-monitor", "lumen-monolith-lamp"]:
            p = products.get(slug)
            if not p:
                continue
            v = p.variants.first()
            WishlistItem.objects.get_or_create(wishlist=wl, product=p, variant=v)
        self.stdout.write(f"  Wishlist items: {WishlistItem.objects.count()}")

    # -----------------------------------------------------------------------
    # Cart (demo customer)
    # -----------------------------------------------------------------------

    def _seed_cart(self, users, products):
        customer = users["customer@paradox.shop"]
        cart, _ = Cart.objects.get_or_create(user=customer)

        for slug, qty in [("monolith-chronograph", 1), ("void-studio-headphones", 1)]:
            p = products.get(slug)
            if not p:
                continue
            v = p.variants.first()
            unit_price = v.final_price if v else p.base_price
            CartItem.objects.update_or_create(
                cart=cart, product=p, variant=v,
                defaults={"quantity": qty, "unit_price": unit_price},
            )
        self.stdout.write(f"  Cart items: {CartItem.objects.filter(cart=cart).count()}")

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------

    def _print_summary(self):
        self.stdout.write(self.style.SUCCESS("\n=== Base44 Demo Data Summary ==="))
        self.stdout.write(f"  Users:            {User.objects.count()}")
        self.stdout.write(f"  Addresses:        {Address.objects.count()}")
        self.stdout.write(f"  Categories:       {Category.objects.count()}")
        self.stdout.write(f"  Brands:           {Brand.objects.count()}")
        self.stdout.write(f"  Products:         {Product.objects.count()}")
        self.stdout.write(f"  Variants:         {ProductVariant.objects.count()}")
        self.stdout.write(f"  Product Images:   {ProductImage.objects.count()}")
        self.stdout.write(f"  Promotions:       {Promotion.objects.count()}")
        self.stdout.write(f"  Coupons:          {Coupon.objects.count()}")
        self.stdout.write(f"  Shipping Methods: {ShippingMethod.objects.count()}")
        self.stdout.write(f"  Shipping Zones:   {ShippingZone.objects.count()}")
        self.stdout.write(f"  Orders:           {Order.objects.count()}")
        self.stdout.write(f"  Order Items:      {OrderItem.objects.count()}")
        self.stdout.write(f"  Payments:         {Payment.objects.count()}")
        self.stdout.write(f"  Shipments:        {Shipment.objects.count()}")
        self.stdout.write(f"  Reviews:          {Review.objects.count()}")
        self.stdout.write(f"  Questions:        {ProductQuestion.objects.count()}")
        self.stdout.write(f"  Answers:          {QuestionAnswer.objects.count()}")
        self.stdout.write(f"  Wishlist Items:   {WishlistItem.objects.count()}")
        self.stdout.write(f"  Cart Items:       {CartItem.objects.count()}")
        self.stdout.write(self.style.SUCCESS("\nSeed complete."))
        self.stdout.write("\nDemo accounts:")
        self.stdout.write("  Admin:     admin@paradox.shop / paradox-admin-2024")
        self.stdout.write("  Customer:  customer@paradox.shop / paradox-customer-2024")
        self.stdout.write("  Customer2: customer2@paradox.shop / paradox-customer2-2024")
        self.stdout.write("\nDemo coupon: PARADOX10 (10% off, any order)")
