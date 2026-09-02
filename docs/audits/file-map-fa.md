# اطلس و راهنمای ساختار فایل‌های پروژه پارادوکس شاپ (File Map & Architecture Atlas)

> **مخاطب**: مهندسان جدیدالورود و توسعه‌دهندگان جونیور تا سینیور  
> **هدف**: تشریح مأموریت، وابستگی‌ها و عملکرد تک‌تک پوشه‌ها و فایل‌های حیاتی مخزن به زبان ساده فارسی  
> **منبع حقیقت**: فایل‌های واقعی مخزن پارادوکس شاپ

---

## مقدمه: معماری کلان پروژه در یک دقیقه

پروژه **Paradox Shop** به صورت یک **Modular Monolith** در بک‌اند و یک وب‌اپلیکیشن مدرن **Next.js App Router** در فرانت‌اند طراحی شده است.

```text
[کاربر در مرورگر]
      ↓ (درخواست HTTP)
[Next.js App Router] (SSR / Client Component)
      ↓ (فراخوانی apiClient در lib/api)
[Nginx / Reverse Proxy] (پورت 80 / 8000)
      ↓
[Django REST Framework] (urls.py → views.py)
      ↓ (اعتبارسنجی ورودی با serializers.py)
[Service Layer] (خدمات و بیزینس‌لاژیک در services.py)
      ↓ (پرس‌وجوی بهینه و بدون N+1 با selectors.py)
[Django ORM] (مدل‌های داده‌ای در models.py)
      ↓ (تراکنش‌های اتمیک ACID)
[PostgreSQL Database] (پورت 5432)
```

اگر کاری زمان‌بر باشد (نظیر ساخت تصاویر بندانگشتی، لغو سفارش‌های منقضی‌شده یا پاکسازی سبدها):
```text
Service / Celery Beat
      ↓ (ایجاد Task)
[Redis Message Broker] (پورت 6379)
      ↓ (اجرا در پس‌زمینه)
[Celery Worker Process] (tasks.py)
```

---

## بخش اول: بک‌اند (Backend)

### ۱. تنظیمات مرکزی (`backend/config/`)

#### ۱.۱. `backend/config/settings/base.py`
- **مسیر**: `backend/config/settings/base.py`
- **مأموریت**: قلب تپنده تنظیمات بک‌اند؛ کلیه تنظیمات مشترک بین محیط توسعه و پروداکشن در این فایل قرار دارد.
- **چرا وجود دارد**: برای جلوگیری از تکرار تنظیمات در محیط‌های مختلف (اصل DRY).
- **چه کسانی استفاده می‌کنند**: کل فرایند اجرای جنگو، سلری و پایگاه داده.
- **درون آن چه می‌گذرد**:
  - تعریف ۱۰ دامین اپ در `INSTALLED_APPS`.
  - میدل‌ور تولید شناسه یکتای ردیابی (`RequestIDMiddleware`).
  - تنظیمات اتصال به دیتابیس PostgreSQL با متغیر `DATABASE_URL`.
  - تنظیمات احراز هویت JWT و مدت اعتبار اکسس‌توکن (۱۵ دقیقه) و رفرش‌توکن (۷ روز).
  - زمان‌بندی جاب‌های دوره‌ای `CELERY_BEAT_SCHEDULE`.
  - تنظیمات لاگینگ امن و فیلتر کردن اطلاعات حساس (رمز عبور، کارت بانکی).
- **وابستگی‌ها**: `django`, `rest_framework`, `celery`.

#### ۱.۲. `backend/config/settings/development.py` و `production.py`
- **مسیر**: `backend/config/settings/development.py`
- **مأموریت**: تنظیمات ویژه لپ‌تاپ توسعه‌دهنده (`DEBUG = True` جهت نمایش خطاهای واضح).
- **مسیر**: `backend/config/settings/production.py`
- **مأموریت**: تنظیمات سرور نهایی (`DEBUG = False`، الزام SSL با `SECURE_SSL_REDIRECT`، کوکی‌های امن و HSTS).

#### ۱.۳. `backend/config/urls.py`
- **مسیر**: `backend/config/urls.py`
- **مأموریت**: ریشه درخت مسیریابی بک‌اند.
- **درون آن چه می‌گذرد**:
  - هدایت مسیر `/admin/` به ادمین پیش‌فرض جنگو.
  - هدایت کلیه APIها به `/api/v1/` از طریق `api.v1.urls`.
  - ثبت اندپوینت‌های مستندات استاندارد OpenAPI Swagger و Redoc (`/api/schema/`).

#### ۱.۴. `backend/config/celery.py`
- **مسیر**: `backend/config/celery.py`
- **مأموریت**: پیکربندی کلاینت Celery و کشف خودکار وظایف ناهمگام (`autodiscover_tasks`) در سراسر دامین‌ها.

---

### ۲. لایه زیرساخت و مؤلفه‌های مشترک (`backend/common/`)

#### ۲.۱. `backend/common/models.py`
- **مسیر**: `backend/common/models.py`
- **مأموریت**: تأمین میکس‌این‌های استاندارد پایگاه داده برای تمام مدل‌های پروژه.
- **کلاس‌های مهم**:
  - `UUIDPrimaryKeyMixin`: ایجاد فیلد `id` از نوع UUID v4 غیرقابل حدس به جای آیدی‌های عددی ترتیبی (جلوگیری از حملات شناسه ترتیبی IDOR).
  - `TimestampMixin`: ثبت خودکار زمان ایجاد (`created_at`) و آخرین ویرایش (`updated_at`).
  - `SoftDeleteMixin`: حذف نرم داده‌ها با فلگ `is_deleted` به جای پاک کردن فیزیکی از دیتابیس.
  - `AuditLog`: جدول ثبت رویدادهای ممیزی و امنیتی مدیران.
  - `SystemSetting`: جدول مقادیر سراسری فروشگاه.
  - `AdminNotification` و `UserNotification`: اعلانات درون‌برنامه‌ای.

#### ۲.۲. `backend/common/permissions.py`
- **مسیر**: `backend/common/permissions.py`
- **مأموریت**: تعریف گاردها و مجوزهای دسترسی ادمین سازمانی (RBAC).
- **کلاس‌های مهم**:
  - `IsStaffAdmin`: بررسی می‌کند کاربر لاگین بوده، حسابش فعال باشد و پرچم `is_staff` یا `is_superuser` داشته باشد.
  - `HasAdminPermission(required_perm)`: بررسی سطح دسترسی داینامیک گرانولار.
  - `get_user_effective_permissions(user)`: لیست دسترسی‌های فعال کاربر را جهت ارسال به فرانت‌اند استخراج می‌کند.

#### ۲.۳. `backend/common/middleware.py`
- **مسیر**: `backend/common/middleware.py`
- **مأموریت**: میدل‌ور `RequestIDMiddleware`. به هر درخواست ورودی کلاینت یک شناسه منحصر‌به‌فرد (`X-Request-ID`) الصاق می‌کند و در هدر پاسخ نیز برمی‌گرداند تا در لاگ‌های سیستمی و عیب‌یابی قابل ردیابی باشد.

#### ۲.۴. `backend/common/exceptions.py`
- **مسیر**: `backend/common/exceptions.py`
- **مأموریت**: هندلر یکپارچه خطاهای جنگو رست فریمورک (`custom_exception_handler`). خطاهای دیتابیس، اعتبارسنجی و دسترسی را به ساختار استاندارد JSON تبدیل کرده و کدهای ردیابی را الصاق می‌کند تا کاربر هرگز خطای مبهم نبیند.

---

### ۳. دامین‌های دهگانه کسب‌وکار (`backend/apps/`)

> **قانون طلایی معماری لایه‌ای جنگو**:  
> ۱. **`models.py`**: فقط ساختار جداول دیتابیس، فیلدها و قیدها.  
> ۲. **`serializers.py`**: فقط اعتبارسنجی فرمت داده‌های ورودی و تبدیل داده‌های خروجی به JSON.  
> ۳. **`views.py`**: دریافت درخواست HTTP، ارسال به سرویس و بازگرداندن Response (بسیار لاغر و بدون منطق پیچیده).  
> ۴. **`services.py`**: محل اختصاصی Business Logic، محاسبات قیمت، تغییر وضعیت‌ها و تراکنش‌های دیتابیس (نوشتن).  
> ۵. **`selectors.py`**: محل اختصاصی کوئری‌های خواندن دیتابیس (Read-only)، جلوگیری از N+1 با `select_related` و `prefetch_related`.  
> ۶. **`tasks.py`**: کارهای سنگین و ناهمگام در پس‌زمینه با Celery.

#### ۳.۱. دامین کاربران (`apps/users/`)
- `models.py`: تعریف `User` (سفارشی با ایمیل به جای یوزرنیم)، `UserProfile` و `Address`.
- `services.py`: `UserService.register_user`، تغییر پسورد، ارسال کد تایید OTP و تایید شماره موبایل.
- `selectors.py`: دریافت پروفایل، استعلام آدرس‌های فعال کاربر.
- `tasks.py`: `send_welcome_email`.

#### ۳.۲. دامین کاتالوگ محصولات (`apps/products/`)
- `models.py`: `Product`، `Brand`، `ProductVariant` (تنوع رنگ/سایز)، `ProductImage` و `ProductComment`.
- `selectors.py`: `ProductSelector.get_filtered_products` با فیلتر هوشمند قیمت، دسته‌بندی و جستجو.
- `admin_views.py`: ساخت و ویرایش کاتالوگ و مدیریت موجودی انبار به صورت تکی و دسته‌ای (`batch`).

#### ۳.۳. دامین دسته‌بندی و تاکسونومی (`apps/categories/`)
- `models.py`: مدل بازگشتی `Category` (والد/فرزند) برای ایجاد درخت نامحدود دسته‌ها.
- `selectors.py`: ساخت درخت سلسله‌مراتبی دسته‌بندی‌ها (`get_category_tree`) با حداقل کوئری به دیتابیس.

#### ۳.۴. دامین سبد خرید (`apps/cart/`)
- `models.py`: `Cart` و `CartItem`.
- `services.py`: افزودن کالا، اصلاح تعداد، حذف، و مهم‌تر از همه `CartService.merge_carts` که سبد خرید مهمان را بعد از لاگین بدون گم شدن کالاها با سبد اکانت کاربر ترکیب می‌کند.
- `tasks.py`: `cleanup_abandoned_guest_carts` برای پاکسازی سبدهای تاریخ‌گذشته مهمان.

#### ۳.۵. دامین سفارش‌ها (`apps/orders/`)
- `models.py`: `Order` (با شماره پیگیری یکتا، مبالغ تخفیف، هزینه ارسال، وضعیت‌های مختلف)، `OrderItem` و `OrderStatusHistory`.
- `services.py`: `OrderService.create_order_from_cart`؛ با قفل سطرها (`select_for_update`) موجودی انبار را با اطمینان کسر کرده و سفارش ایجاد می‌کند.
- `tasks.py`: `cancel_stale_pending_orders` که هر ۵ دقیقه سفارش‌های پرداخت‌نشده معلق را لغو و موجودی را به انبار برمی‌گرداند.

#### ۳.۶. دامین حمل‌ونقل و لجستیک (`apps/shipping/`)
- `models.py`: `ShippingMethod` (پیشتاز، اکسپرس)، `ShippingZone`، `ShippingRate` و `Shipment` (اطلاعات مرسوله و کد پیگیری).
- `services.py`: محاسبه پویای هزینه ارسال بر اساس استان/شهر و سبد خرید، اعمال ارسال رایگان در صورت رسیدن به حد نصاب، و به‌روزرسانی وضعیت ارسال مرسوله.

#### ۳.۷. دامین پرداخت و تراکنش‌ها (`apps/payments/`)
- `models.py`: `Payment` و `PaymentTransaction`.
- `services.py`: ثبت تراکنش مالی با کلید یکتایی `idempotency_key` که از پرداخت مجدد ناخواسته جلوگیری می‌کند و اتصال به شبیه‌ساز درگاه.

#### ۳.۸. دامین تخفیف‌ها و کمپین‌ها (`apps/promotions/`)
- `models.py`: `Promotion`، `PromotionRule`، `Coupon` (کوپن‌های تخفیف) و `CouponUsage`.
- `services.py`: موتور محاسبه بهترین تخفیف، اعمال سقف تخفیف، اعتبارسنجی کوپن در ترنزکشن اتمیک و ثبت لاگ مصرف.
- `selectors.py`: پیش‌نمایش تخفیف روی سبد خرید بدون دستکاری دیتابیس.

#### ۳.۹. دامین نظرات و پرسش‌وپاسخ (`apps/reviews/`)
- `models.py`: `Review`، `ReviewImage`، `ReviewVote`، `ReviewReport`، `ReviewResponse`، `ProductQuestion` و `QuestionAnswer`.
- `services.py`: اعتبارسنجی خرید قطعی (`Verified Purchase`)، ثبت نظر، رأی مفید/غیرمفید، ثبت سوال فنی و پاسخ رسمی پرسنل.
- `tasks.py`: `process_review_image_task`؛ دریافت تصویر ارسالی، حذف متادیتای EXIF و بهینه‌سازی فرمت WebP با بندانگشتی ۴۰۰×۴۰۰.

#### ۳.۱۰. دامین علاقه‌مندی‌ها (`apps/wishlist/`)
- `models.py`: `Wishlist` و `WishlistItem`.
- `services.py`: افزودن کالا به علاقه‌مندی‌ها، حذف، بررسی وضعیت علاقه‌مندی و ادغام لیست مهمان با کاربر پس از ورود.

---

## بخش دوم: فرانت‌اند (Frontend)

### ۱. معماری ارتباط با سرور (`frontend/src/lib/api/`)

#### ۱.۱. `frontend/src/lib/api/client.ts`
- **مسیر**: `frontend/src/lib/api/client.ts`
- **مأموریت**: کلاینت مرکزی Axios با اینترسپتورهای هوشمند.
- **درون آن چه می‌گذرد**:
  - تزریق خودکار هدر `Authorization: Bearer <token>`.
  - تولید و ارسال خودکار هدر رهگیری `X-Request-ID`.
  - ارسال خودکار کوکی‌ها و `X-Session-Key` برای سبد خرید مهمان.
  - **قفل هوشمند رفرش‌توکن (Concurrency-Safe Token Refresh)**: اگر در یک لحظه ۵ درخواست همزمان با خطای ۴۰۱ مواجه شوند، تنها یک درخواست رفرش توکن به سرور ارسال می‌شود و ۴ درخواست دیگر در صف منتظر توکن جدید می‌مانند تا از ابطال ناخواسته سشن جلوگیری شود.

#### ۱.۲. `frontend/src/lib/api/endpoints.ts`
- **مسیر**: `frontend/src/lib/api/endpoints.ts`
- **مأموریت**: تعریف توابع تایپ‌سیف (Type-Safe) برای تمام اندپوینت‌های عمومی و داشبورد مشتریان (`authApi`, `productsApi`, `cartApi`, `ordersApi`, `shippingApi`, `promotionsApi`, `reviewsApi`, `wishlistApi`).

#### ۱.۳. `frontend/src/lib/api/admin.ts`
- **مسیر**: `frontend/src/lib/api/admin.ts`
- **مأموریت**: کلاینت اختصاصی کنترل سنتر ادمین (`adminApi`). این فایل به بیش از ۴۸ اندپوینت اختصاصی ادمین بک‌اند متصل بوده و هیچ‌گونه ماک یا ذخیره‌سازی محلی غیرواقعی ندارد.

#### ۱.۴. `frontend/src/lib/api/error-handler.ts`
- **مسیر**: `frontend/src/lib/api/error-handler.ts`
- **مأموریت**: پارسر مرکزی خطاها؛ خطاهای جنگو و کدهای وضعیت مختلف (۴۰۰، ۴۰۱، ۴۰۳، ۴۰۴، ۴۲۹، ۵۰۰) را به پیام‌های شفاف و محترمانه تبدیل می‌کند و مقدار ثانیه‌های هدر `Retry-After` را برای ریت‌لیمیتینگ استخراج می‌نماید.

---

### ۲. صفحات و روت‌های فروشگاه (`frontend/src/app/(shop)/`)

- `page.tsx`: صفحه نخست با هیرو سکشن ۳بعدی، محصولات برگزیده و دسته‌بندی‌ها.
- `catalog/page.tsx`: صفحه کاتالوگ با فیلترهای آنی قیمت، برند، تخفیف‌دار و دسته‌بندی.
- `products/[slug]/page.tsx`: صفحه جزئیات محصول، انتخاب Variant، ثبت در سبد خرید و علاقه‌مندی، سیستم نظرات و پرسش‌وپاسخ فنی.
- `cart/page.tsx`: سبد خرید با محاسبه آنی تخفیف و اقلام.
- `checkout/page.tsx`: فرایند چندمرحله‌ای انتخاب آدرس، روش ارسال پستی و اعمال کوپن تخفیف.
- `payments/[orderId]/page.tsx`: صفحه پرداخت و هدایت به شبیه‌ساز درگاه بانکی.
- `dashboard/`: داشبورد مشتری شامل پروفایل، تاریخچه سفارشات، پیگیری سفارش، مدیریت آدرس‌ها، لیست علاقه‌مندی‌ها و نظرات ثبت‌شده.
- `track/page.tsx`: سامانه عمومی رهگیری آنلاین مرسولات با کد پیگیری پست.

---

### ۳. کنترل سنتر ادمین (`frontend/src/app/admin/`)

- `layout.tsx` و `AdminAuthGuard.tsx`: گارد امنیتی کلاینت و سرور که دسترسی به تمام صفحات ادمین را مسدود کرده و صرفاً به کاربران دارای تاییدیه `is_staff` اجازه ورود می‌دهد.
- `page.tsx`: داشبورد مانیتورینگ زنده شاخص‌های فروش و سفارشات.
- `orders/page.tsx`: مدیریت کلان سفارشات، تغییر وضعیت، لغو و به‌روزرسانی کد رهگیری پستی.
- `products/page.tsx`: افزودن، ویرایش و حذف محصولات کاتالوگ.
- `inventory/page.tsx`: مانیتورینگ موجودی انبار و اصلاح دسته‌ای تعداد کالاها.
- `shipping/page.tsx`: مدیریت روش‌های ارسال، هزینه‌ها و شرایط پست رایگان.
- `promotions/page.tsx` و `promotions/coupons/page.tsx`: ساخت و مدیریت کمپین‌ها و کدهای تخفیف.
- `reviews/page.tsx` و `questions/page.tsx`: پنل بازبینی نظرات خریداران، تایید، رد و درج پاسخ رسمی آتلیه.
- `activity/page.tsx`: مشاهده لاگ‌های ممیزی امنیتی و اداری سیستم.
- `settings/page.tsx`: تنظیمات سراسری فروشگاه.

---

## خلاصه جریان داده در یک سناریوی واقعی خرید (End-to-End Walkthrough)

```text
۱. کاربر در صفحه /products/isomorphic-ceramic-vessel دکمه «افزودن به سبد» را می‌زند.
   → frontend: فراخوانی cartApi.addItem در endpoints.ts
   → network: ارسال POST /api/v1/cart/items/ با هدر X-Session-Key
   → backend: views.py داده را اعتبارسنجی و به CartService.add_item می‌فرستد.
   → database: با تراکنش اتمیک موجودی انبار بررسی شده و رکورد CartItem ایجاد می‌شود.

۲. کاربر به /checkout رفته و کد تخفیف SUMMER25 را وارد می‌کند.
   → network: ارسال POST /api/v1/promotions/coupons/validate/
   → backend: PromotionService صحت، تاریخ انقضا و سقف استفاده کوپن را بررسی و مبلغ تخفیف را برمی‌گرداند.

۳. کاربر دکمه «ثبت و پرداخت نهایی» را می‌زند.
   → network: ارسال POST /api/v1/orders/checkout/
   → backend: OrderService سطر محصول در انبار را با select_for_update قفل می‌کند،
              تخفیف و هزینه پست را محاسبه، رکورد Order و Shipment ایجاد و سبد خرید را خالی می‌کند.

۴. کاربر پرداخت را در /payments/[orderId] نهایی می‌کند.
   → backend: وضعیت سفارش به PAID تغییر کرده و دو تسک Celery در پس‌زمینه صف‌بندی می‌شوند:
              الف) send_order_confirmation_email برای ارسال ایمیل فاکتور
              ب) اعلان به پرسنل در AdminNotification برای شروع بسته‌بندی مرسوله.
```
