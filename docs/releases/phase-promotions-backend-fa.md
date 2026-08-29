# گزارش جامع انتشار فاز تخفیفات و کوپن‌ها — هسته و موتور محاسباتی بک‌اند (Promotions & Coupons Engine)
**پروژه فروشگاه تجارت الکترونیک لوکس پارادوکس (Paradox Shop)**  
**شاخه گیت:** `feature/promotions`  
**تاریخ تهیه:** ۷ شهریور ۱۴۰۵ (2026-08-29)  
**معماری:** ماژولار مونولیت جنگو ۵ + DRF (Python 3.12, PostgreSQL 16, Redis 7, Celery)

---

## ۱. اهداف و محدوده فاز تخفیفات (Promotions & Coupons)

هدف از اجرای این فاز، طراحی و پیاده‌سازی زیرساخت جامع، مستقل و انترپرایز برای مدیریت و اعمال تخفیفات خودکار (Promotions) و کدهای تخفیف (Coupons) در فروشگاه لوکس پارادوکس بر اساس اصول زیر بود:
- **مرجعیت قیمت‌گذاری سمت سرور (Server-Side Pricing Authority):** عدم اعتماد به هرگونه ورودی یا محاسبات کلاینت؛ محاسبه زنده و امن قیمت‌ها در زمان تسویه‌حساب (Checkout) بر مبنای سطرهای قفل‌شده در دیتابیس.
- **موتور واحد و متمرکز محاسبات تخفیف (`PromotionEngine`):** تجمیع کلیه قواعد اعمال تخفیف در یک موتور بدون ایجاد منطق موازی یا دوباره‌کاری.
- **سیاست انباشتگی شفاف و قطعی (Deterministic Stacking Policy):** تعریف قوانین مشخص برای جلوگیری از تخفیف‌های دوبل کنترل‌نشده.
- **حفظ تاریخچه مالی از طریق اسنپ‌شات‌های تغییرناپذیر (Order Snapshots):** ذخیره ساختاریافته اطلاعات تخفیف و کوپن در سفارش و آیتم‌های سفارش بدون وابستگی به تغییرات یا حذف رکوردهای لایو تخفیف در آینده.
- **جلوگیری از رقابت همزمان و استفاده بیش‌ازحد (Concurrency & Race-Condition Safe):** حفاظت از سقف‌های استفاده عمومی و فردی با استفاده از قفل‌های سطری `select_for_update` در تراکنش‌های اتمیک دیتابیس.

---

## ۲. معماری دامنه تخفیفات (`apps.promotions`)

ماژول جدید `apps.promotions` به عنوان یک دامنه مستقل در معماری ماژولار مونولیت پروژه ایجاد شد:

```text
apps/promotions/
├── __init__.py
├── admin.py            # پنل ادمین جنگو برای نظارت و مدیریت داده‌ها
├── apps.py             # پیکربندی اپلیکیشن PromotionsConfig
├── models.py           # مدل‌های داده‌ای Promotion, Coupon, CouponUsage با قیود DB
├── permissions.py      # کلاس‌های احراز دسترسی IsPromotionAdmin بر پایه RBAC
├── selectors.py        # متدهای کوئری N+1-safe و فیلترهای زمانی و دسته‌بندی
├── serializers.py      # سریالایزرهای کاربری و مدیریت ادمین
├── services.py         # موتور PromotionEngine، CouponValidator، CouponService، PromotionService
├── urls.py             # روت‌های مشتری (active, validate, cart-preview)
└── migrations/
    └── 0001_initial.py # مایگریشن اولیه جدول‌ها، ایندکس‌ها و قیود
```

---

## ۳. مدل‌های داده‌ای و قیود یکپارچگی دیتابیس

### ۱. مدل پروموشن خودکار (`Promotion`)
- **شناسه:** UUID v4 به عنوان کلید اصلی (`UUIDPrimaryKeyMixin`).
- **فیلدها:** `name`, `slug` (یکتا), `description`, `discount_type` (`percentage` / `fixed_amount`), `discount_value`, `max_discount_amount`, `start_at`, `end_at`, `is_active`, `priority` (اولویت حل تعارض).
- **هدف‌گذاری (Targeting M2M):**
  - `included_products`, `excluded_products`, `included_categories`, `included_brands`.
  - **منطق شمول:** در صورت خالی بودن مجموعه‌های شمول، تخفیف به کل محصولات غیرمستثنی اعمال می‌گردد.
- **قیود سطح دیتابیس (CheckConstraints):**
  - `promo_discount_value_gt_0`: مقدار تخفیف همواره مثبت.
  - `promo_percentage_lte_100`: درصد تخفیف حداکثر ۱۰۰٪.
  - `promo_max_discount_gte_0`: سقف ریالی تخفیف مثبت یا صفر.
  - `promo_start_before_end`: تاریخ شروع پیش از تاریخ پایان.

### ۲. مدل کوپن تخفیف (`Coupon`)
- **شناسه:** UUID v4 به همراه کد متنی یکتا (`code` ایندکس‌شده و بزرگ‌نویسی‌شده).
- **فیلدها:** `description`, `discount_type`, `discount_value`, `max_discount_amount`, `min_order_subtotal`, `start_at`, `end_at`, `is_active`, `total_usage_limit`, `per_user_usage_limit`, `usage_count` (شمارنده غیرنرمال).
- **جامعه هدف (`AudienceType`):**
  - `ALL`: قابل استفاده توسط کلیه مشتریان احراز هویت‌شده.
  - `SPECIFIC_USERS`: محدود به کاربران عضو رابطه `eligible_users`.
- **قیود سطح دیتابیس:**
  - `coupon_discount_value_gt_0`, `coupon_percentage_lte_100`, `coupon_max_discount_gte_0`, `coupon_min_order_subtotal_gte_0`, `coupon_start_before_end`.

### ۳. مدل سوابق استفاده از کوپن (`CouponUsage`)
- **ارتباطات:** کلید خارجی به `Coupon`, `User` و `Order` (اختیاری).
- **فیلدها:** `discount_amount` (مبلغ دقیق ریالی کسرشده), `redeemed_at` (زمان ثبت).
- **ایندکس و امنیت:** ایندکس ترکیبی روی `(coupon, user)` جهت پایش سریع و پیشگیری از مصرف بیش از حد مجاز.

---

## ۴. خط لوله و قوانین موتور محاسبات تخفیف (`PromotionEngine`)

فرآیند گام‌به‌گام محاسبه تخفیف‌ها به صورت قطعی و سروری:

```
ورودی: سبد خرید (محصولات، واریانت‌ها، تعداد و قیمت‌های زنده و قفل‌شده)
    │
    ▼
گام ۱: تفکیک و اعمال بهترین پروموشن خودکار به ازای هر آیتم
  • بررسی پنجره زمانی (is_active=True و بازه start_at تا end_at)
  • بررسی شمول و عدم استثنا در سطح محصول، دسته‌بندی و برند
  • انتخاب تخفیف بهینه‌تر (بیشترین مبلغ کسرشده؛ اولویت پایین‌تر در صورت تساوی)
  • رند کردن مقادیر ریالی با ROUND_DOWN و کف صفر
    │
    ▼
گام ۲: محاسبه مجموع تخفیف پروموشن‌ها و زیرمجموع باقی‌مانده سبد
    │
    ▼
گام ۳: اعتبارسنجی و اعمال کوپن بر زیرمجموع مجاز پس از پروموشن
  • ارزیابی فعال بودن، تاریخ، جامعه هدف (کاربر خاص/عمومی)، حداقل سبد (min_order_subtotal)
  • ارزیابی سقف استفاده عمومی (total_usage_limit) و سقف استفاده کاربر (per_user_usage_limit)
  • محاسبه تخفیف کوپن منحصراً روی آیتم‌های مجاز (عدم اعمال بر اقلام استثناشده کوپن)
  • اعمال سقف ریالی کوپن‌های درصدی (max_discount_amount)
    │
    ▼
گام ۴: اعمال سقف صفر و محاسبه هزینه حمل‌ونقل
  • مبلغ کل نهایی: max(0, subtotal - promotion_total - coupon_discount) + shipping_cost
    │
    ▼
خروجی: ساختار داده‌ای DiscountResult با جزئیات شفاف به ازای هر آیتم و سرجمع سبد
```

---

## ۵. اسنپ‌شات‌های ماندگار در سفارشات (`Order` & `OrderItem`)

برای اینکه تغییر یا حذف یک تخفیف یا کوپن در آینده هیچ‌گونه تغییری در تاریخچه و فاکتورهای مالی سفارش‌های ثبت‌شده ایجاد نکند:

1. **در سطح آیتم سفارش (`OrderItem`)**:
   - `original_unit_price`: قیمت پایه/واریانت پیش از تخفیف.
   - `discount_amount`: مبلغ تخفیف پروموشن به ازای هر واحد.
   - `promotion_snapshot`: دیکشنری حاوی `{id, name, discount_type, discount_value}`.
   - `unit_price`: قیمت واحد نهایی پس از تخفیف پروموشن.
   - `total_price`: قیمت کل آیتم (`unit_price * quantity`).

2. **در سطح سفارش (`Order`)**:
   - `subtotal`: مجموع مبالغ اقلام پیش از هرگونه تخفیف.
   - `discount_amount`: کل مبلغ تخفیف کسرشده (پروموشن‌ها + کوپن).
   - `coupon_code`: کد کوپن اعمال‌شده به صورت متن.
   - `coupon_snapshot`: دیکشنری حاوی `{id, code, discount_type, discount_value, max_discount_amount, coupon_discount_applied}`.
   - `shipping_cost`: هزینه ارسال (محاسبه‌شده روی مبلغ پس از تخفیف جهت اعتبارسنجی ارسال رایگان).
   - `total`: مبلغ نهایی قابل پرداخت.

---

## ۶. اندپوینت‌های RESTful پیاده‌سازی‌شده

### اندپوینت‌های سمت مشتری (Storefront)
| متد | مسیر | دسترسی | توضیحات |
|---|---|---|---|
| `GET` | `/api/v1/promotions/active/` | عمومی | دریافت فهرست پروموشن‌های خودکار فعال در سایت |
| `POST` | `/api/v1/promotions/coupons/validate/` | مشتری احراز هویت‌شده | بررسی اعتبار کد تخفیف و بازگرداندن تخمین تخفیف |
| `POST` | `/api/v1/promotions/cart-preview/` | مشتری احراز هویت‌شده | پیش‌نمایش کامل و تفکیک‌شده تخفیف‌های سبد خرید (پروموشن + کوپن) |

### اندپوینت‌های مرکز کنترل ادمین (Admin Control Center)
| متد | مسیر | دسترسی | توضیحات |
|---|---|---|---|
| `GET / POST` | `/api/v1/admin/promotions/` | `IsPromotionAdmin` | لیست و ایجاد پروموشن‌های جدید |
| `GET / PUT / PATCH / DELETE` | `/api/v1/admin/promotions/{id}/` | `IsPromotionAdmin` | جزئیات، ویرایش کامل/جزئی و حذف پروموشن |
| `POST` | `/api/v1/admin/promotions/{id}/toggle/` | `IsPromotionAdmin` | تغییر سریع وضعیت فعال/غیرفعال پروموشن |
| `GET / POST` | `/api/v1/admin/coupons/` | `IsPromotionAdmin` | لیست و ایجاد کوپن‌های تخفیف |
| `GET / PUT / PATCH / DELETE` | `/api/v1/admin/coupons/{id}/` | `IsPromotionAdmin` | جزئیات، ویرایش و حذف کوپن |
| `POST` | `/api/v1/admin/coupons/{id}/toggle/` | `IsPromotionAdmin` | فعال/غیرفعال‌سازی سریع کوپن |
| `GET` | `/api/v1/admin/coupons/{id}/usages/` | `IsPromotionAdmin` | مشاهده لاگ و سوابق مصرف کوپن توسط مشتریان |

---

## ۷. امنیت و ثبت وقایع نظارتی (Audit Logging)

- **سطح دسترسی مبتنی بر نقش (RBAC):** استفاده از پرمیشن‌های دانه‌ای `promotions.view` و `promotions.manage`.
- **ثبت لاگ‌های امنیتی (`AuditLog`):** تمامی رویدادهای ایجاد، ویرایش، حذف و تغییر وضعیت پروموشن‌ها و کوپن‌ها با آدرس IP و شناسه ادمین در جدول لاگ‌های نظارتی ثبت می‌گردد (`coupon.created`, `coupon.updated`, `coupon.activated`, `promotion.created`, ...).
- **قفل‌های همروندی (`select_for_update`):** ثبت استفاده از کوپن (`CouponService.redeem_coupon`) در حین قفل سطری ردیف کوپن انجام شده و مانع از پدیده Over-Redemption در درخواست‌های همزمان میلی‌ثانیه‌ای می‌شود.

---

## ۸. نتایج اعتبارسنجی و تست‌های جامع (Quality Gates)

1. **بررسی سیستمی جنگو (`manage.py check`)**:
   - بدون هیچ‌گونه خطا یا هشدار (0 issues).
2. **بررسی عدم وجود مایگریشن نامنظم (`makemigrations --check`)**:
   - وضعیت کاملاً هماهنگ و بدون تغییرات کشف‌نشده.
3. **اعتبارسنجی مستندات و اسکیما (`drf-spectacular --validate`)**:
   - تایید کامل اسکیما و تگ‌های `Promotions`, `Admin - Promotions`, `Admin - Coupons`.
4. **مجموعه تست‌های اتوماتیک (`pytest -v`)**:
   - **۱۲۹ از ۱۲۹ تست با موفقیت ۱۰۰٪ پاس شدند** (شامل ۲۱ تست جامع جدید در `test_promotions_api.py`).

---

## ۹. گام‌های آینده و ادغام فرانت‌اند
با تکمیل بی‌نقص موتور بک‌اند و دامنه‌های داده‌ای، زیرساخت کامل جهت پیاده‌سازی فرم ورود کوپن در صفحه تسویه‌حساب، نمایش بج‌ها و قیمت‌های خط‌خورده تخفیف در ویترین فروشگاه، و ماژول مدیریت تخفیفات در داشبورد ادمین آماده گردیده است.
