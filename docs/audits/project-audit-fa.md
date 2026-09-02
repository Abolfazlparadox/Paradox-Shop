# گزارش جامع کالبدشکافی معماری و ممیزی قانونی پارادوکس شاپ (Authoritative Master Project Audit)

> **سند مرجع حقیقت (Single Source of Truth)**: این سند پس از ممیزی کامل کدهای منبع، کانتینرهای فعال داکر، پایگاه داده PostgreSQL، پروسس‌های سلری و اجرای ۱۹۰ تست خودکار تهیه شده است.  
> **شاخه فعال مخزن**: `feature/reviews-and-qa`  
> **فاز واقعی تأییدشده پروژه**: **فاز ۴ (نظرات، رتبه‌بندی، پیوست‌های چندرسانه‌ای، پرسش‌وپاسخ فنی و کنترل سنتر ادمین)**  
> **وضعیت کلی سلامت پروژه**: **HEALTHY (پایدار، عملیاتی، دارای بدهی‌های فنی معین جهت سخت‌سازی)**

---

## ۱. هویت، معماری و مشخصات پروژه (Project Identity & Stack)

### ۱.۱. پارادوکس شاپ چیست؟
**Paradox Shop** یک پلتفرم تجارت الکترونیک رده‌بالا با هویت بصری *Impossible Minimalism* (تلفیق هندسه معماری، ظرافت مهندسی و لوکس‌گرایی دیجیتال) است. این پلتفرم از نظر پیچیدگی زیرساختی و الزامات تجاری، منطبق بر استانداردهای مقیاس‌پذیر سازمانی طراحی شده است.

### ۱.۲. پشته فناوری (Technology Stack)
- **بک‌اند**: Django 5.2.17 + Django REST Framework 3.15 + Python 3.12 (مدیریت وابستگی‌ها با `uv`).
- **پایگاه داده اصلی**: PostgreSQL 16 Alpine با کلیدهای اصلی UUID v4، ترنزکشن‌های اتمیک ACID و قیدهای کنترلی (`CHECK constraints`).
- **صف پیام و کشینگ**: Redis 7 Alpine.
- **پردازش غیرهمزمان و زمان‌بندی**: Celery 5.6.3 + Celery Beat.
- **فرانت‌اند**: Next.js 14.2.5 (App Router) + TypeScript 5 + Tailwind CSS 3.4.
- **مدیریت وضعیت فرانت‌اند**: TanStack Query (React Query) برای وضعیت داده‌های سرور + Zustand برای وضعیت رابط کاربری.
- **موتور گرافیکی و انیمیشن**: Framer Motion + Three.js + Lenis (اسکرول نرم) + موتور اختصاصی نمودارهای برداری SVG.
- **کانتینرسازی و استقرار**: Docker + Docker Compose + Nginx Reverse Proxy.

---

## ۲. وضعیت واقعی فازهای پروژه (Actual Current Phase)

| فاز | حوزه توسعه | وضعیت استقرار و کدهای واقعی | پوشش تست‌ها |
| :---: | :--- | :--- | :---: |
| **Phase 0** | **هسته پایه تجارت الکترونیک** | کامل در بک‌اند و فرانت‌اند (احراز هویت، کاتالوگ، سبد خرید، سفارش، پرداخت ماک، ادمین پایه) | ۷۲ تست |
| **Phase 1** | **زیرسیستم علاقه‌مندی‌ها (Wishlist)** | کامل؛ پشتیبانی مهمان، همگام‌سازی لوکال‌استوریج، ادغام بعد از ورود، دکمه‌های تاگل در کاتالوگ و صفحه محصول | ۱۷ تست (۱۲ بک + ۵ فرانت) |
| **Phase 2** | **حمل‌ونقل و لجستیک (Shipping & Logistics)** | کامل؛ روش‌های پیشتاز و اکسپرس، زون‌های استانی، محاسبه داینامیک، صفحه رهگیری پستی `/track`، پنل لجستیک ادمین | ۱۲ تست (۸ بک + ۴ فرانت) |
| **Phase 3** | **موتور تخفیف و پروموشن‌ها (Promotions & Coupons)** | کامل؛ قوانین تخفیف، سقف مجاز، اعتبارسنجی کوپن در تسویه‌حساب، پیش‌نمایش آنی سبد، پنل ادمین و گزارشات | ۴۱ تست (۲۸ بک + ۱۳ فرانت) |
| **Phase 4** | **نظرات خریداران و پرسش‌وپاسخ فنی (Reviews & Q&A)** | کامل؛ احراز خرید قطعی، بارگذاری رسانه با فشرده‌سازی WebP و حذف EXIF با Pillow، رأی مفید، پاسخ رسمی آتلیه، تب‌های داشبورد کاربر و پنل بازبینی ادمین | ۲۰ تست (۸ بک + ۱۲ فرانت) |

**نتیجه**: برخلاف برخی مستندات قدیمی که فازهای ۲ یا ۳ را آینده می‌دانستند، فازهای ۰ تا ۴ همگی به طور کامل در بک‌اند، دیتابیس، API، فرانت‌اند، ادمین و تست‌های خودکار پیاده‌سازی شده و فعال هستند.

---

## ۳. کالبدشکافی بک‌اند (Backend Deep Dive)

بک‌اند پروژه در مسیر `backend/` به صورت یک **Modular Monolith** با تفکیک ۱۰ دامین اپ و ۱ ماژول مشترک مستقر است:

```text
backend/
├── apps/
│   ├── users/        # احراز هویت JWT، پروفایل، آدرس‌ها، ورود دومرحله‌ای OTP
│   ├── products/     # کاتالوگ، ویژگی‌ها، تصاویر، موجودی انبار، کامنت‌های ساده
│   ├── categories/   # تاکسونومی و درخت سلسله‌مراتبی دسته‌بندی‌ها
│   ├── cart/         # سبد خرید مهمان و کاربر، لاجیک ادغام (Merge)، پاکسازی دوره‌ای
│   ├── orders/       # چرخه حیات سفارش، تسویه‌حساب، لغو خودکار سفارش‌های معلق
│   ├── shipping/     # روش‌های ارسال، کرایه‌ها، شیپمنت و رهگیری آنلاین
│   ├── payments/     # درگاه آزمایشی، تراکنش‌ها، کلیدهای تکرارناپذیری (Idempotency)
│   ├── promotions/   # کمپین‌ها، قوانین تخفیف، کوپن‌ها و سوابق مصرف
│   ├── reviews/      # نظرات خریداران قطعی، پیوست تصویر، پرسش‌وپاسخ، رأی‌گیری
│   └── wishlist/     # علاقه‌مندی‌ها و ادغام سشن مهمان
├── common/           # میکس‌این‌های UUID، لاگینگ امن، میدل‌ور Request-ID، مدیریت خطا و پرمیشن‌های ادمین
└── config/           # تنظیمات جنگو، روت‌های ریشه و زمان‌بند Celery Beat
```

### استانداردهای سخت‌گیرانه پیاده‌سازی بک‌اند:
1. **Views لاغر (Thin Views)**: تمام کارهای دیتابیسی و قوانین بیزینس به `services.py` و `selectors.py` منتقل شده است.
2. **تراکنش‌های اتمیک ACID**: استفاده از `transaction.atomic()` در تسویه‌حساب سفارش، اعمال کوپن تخفیف و پردازش پرداخت.
3. **قفل سطرهای دیتابیس با `select_for_update()`**: در کسر موجودی انبار، تغییر وضعیت سفارش و مصرف کوپن، سطرها در پایگاه داده قفل می‌شوند تا هیچ Race Condition یا فروش بیش از موجودی رخ ندهد.
4. **فیلتر لاگ‌های حساس**: ماژول `SensitiveDataFilter` در لاگ‌های کنسول به طور خودکار رمز عبور، توکن‌های JWT و شماره کارت‌ها را ریداکت می‌کند.

---

## ۴. کالبدشکافی فرانت‌اند (Frontend Deep Dive)

اپلیکیشن فرانت‌اند در مسیر `frontend/` با معماری Next.js 14 App Router و تایپ‌اسکریپت اجرا شده است:

### ۴.۱. درخت روت‌های ۳۹گانه
- **فروشگاه عمومی `(shop)` (۲۰ روت)**:
  - `/` (صفحه اصلی ۳بعدی)، `/catalog`، `/products`، `/products/[slug]`، `/cart`، `/checkout`
  - `/payments/[orderId]` (ترمینال پرداخت)
  - `/dashboard` (پروفایل، آدرس‌ها، سفارش‌ها، جزییات سفارش، لیست علاقه‌مندی‌ها، نظرات و سوالات کاربر)
  - `/track` (پیگیری پستی مرسوله)
  - `/login`، `/register`، `/verify-email`، `/forgot-password`، `/sitemap-page`
- **کنترل سنتر اختصاصی ادمین `admin/` (۱۹ روت)**:
  - `/admin` (داشبورد KPI)، `/admin/analytics`، `/admin/orders`، `/admin/products`، `/admin/inventory`
  - `/admin/shipping`، `/admin/promotions`، `/admin/promotions/coupons`، `/admin/promotions/reports`
  - `/admin/reviews`، `/admin/questions`، `/admin/comments`، `/admin/customers`، `/admin/payments`
  - `/admin/activity` (Audit Logs)، `/admin/settings`، `/admin/profile`، `/admin/login`

### ۴.۲. ارتباط با سرور و پرتال ادمین
- کلاینت Axios در `frontend/src/lib/api/client.ts` دارای سیستم Concurrency-Safe Refresh Lock برای توکن‌های JWT و ارسال خودکار `X-Request-ID` است.
- کلاینت ادمین در `frontend/src/lib/api/admin.ts` مستقیماً به ۴۸ اندپوینت اختصاصی بک‌اند در `/api/v1/admin/...` متصل است و هیچ‌گونه ماک، داده فیک یا لوکال‌استوریج جایگزین ندارد.

---

## ۵. پایگاه داده و مایگریشن‌ها (Database Architecture)

- موتور: PostgreSQL 16
- استراتژی شناسه‌ها: کلید اصلی تمام جداول UUID v4 است تا از نشت ترتیبی اطلاعات و حملات IDOR جلوگیری شود.
- قیدهای کنترلی (`CHECK constraints`):
  - `Product.base_price >= 0`
  - `ProductVariant.stock >= 0`
  - `CartItem.quantity >= 1`
  - `Order.subtotal >= 0` و `Order.total_amount >= 0`
  - `Payment.amount >= 0`
- قیدهای یکتایی (`Unique Constraints`):
  - `(product, user)` در جدول Review (هر کاربر حداکثر یک نظر برای هر محصول).
  - `(review, user)` در جدول ReviewVote (هر کاربر حداکثر یک رأی برای هر نظر).
  - `(cart, variant)` در جدول CartItem.
  - `(wishlist, product, variant)` در جدول WishlistItem.
  - `idempotency_key` در جدول Payment.
- وضعیت مایگریشن‌ها: تمام مدل‌های ۱۰ دامین اپ دارای فایل‌های مایگریشن رسمی در کنترل سورس هستند و بدون انحراف با دیتابیس همگام می‌باشند.

---

## ۶. بررسی سرویس‌های داکر و پس‌زمینه (Docker & Celery)

در زمان بازرسی، هر ۶ کانتینر در محیط داکر فعال و در حال سرویس‌دهی بودند:

| نام کانتینر | سرویس | پورت نگاشت‌شده | وضعیت | عملکرد در حال اجرا |
| :--- | :---: | :---: | :---: | :--- |
| `shop_backend` | جنگو ۵ | `127.0.0.1:8000 -> 8000` | Up | وب‌سرور توسعه با ریلودر زنده |
| `shop_frontend` | Next.js ۱۴ | `127.0.0.1:3000 -> 3000` | Up | اپلیکیشن App Router |
| `shop_postgres` | دیتابیس | `127.0.0.1:5433 -> 5432` | Up | پذیرای اتصالات با حجم داده واقعی |
| `shop_redis` | ردیس ۷ | `127.0.0.1:6379 -> 6379` | Up | بروکر تسک‌ها و کش نتایج نظرات |
| `shop_celery_worker` | ورکر سلری | — | Up | اجرای تسک‌های تصویر و ایمیل در پس‌زمینه |
| `shop_celery_beat` | اسکژولر | — | Up | زمان‌بند اجرای تسک‌های لغو سفارش و پاکسازی |

### تسک‌های فعال در Celery Worker:
- `apps.reviews.tasks.process_review_image_task`: حذف داده‌های حساس EXIF و تولید خودکار بندانگشتی WebP.
- `apps.orders.tasks.cancel_stale_pending_orders`: لغو دوره‌ای سفارشات پرداخت‌نشده با آزادسازی موجودی انبار.
- `apps.cart.tasks.cleanup_abandoned_guest_carts`: پاکسازی سبدهای تاریخ‌گذشته مهمان.
- `apps.orders.tasks.send_order_confirmation_email`: انتزاع ارسال ایمیل فاکتور.
- `apps.orders.tasks.send_order_status_notification`: انتزاع ارسال نوتیفیکیشن تغییر وضعیت سفارش.
- `apps.payments.tasks.send_payment_receipt_notification`: انتزاع رسید پرداخت.
- `apps.users.tasks.send_welcome_email`: انتزاع ایمیل خوش‌آمدگویی.

---

## ۷. وضعیت آزمون‌ها و کیفیت کد (Testing & Verification)

### ۷.۱. تست‌های بک‌اند (Pytest Integration Suite)
- **مکان**: `backend/tests/integration/`
- **تعداد کل فایل‌های تست**: ۱۹ فایل
- **تعداد تست‌های تعریف‌شده**: **۱۳۹ تست**
- **پوشش دامین‌ها**:
  - `test_admin_api.py`: ۱۵ تست (پرمیشن‌ها، KPIها، تغییر وضعیت سفارشات، عملیات انبار)
  - `test_promotions_api.py`: ۲۸ تست (محاسبه درصد، تخفیف ثابت، سقف، کوپن‌ها، اولویت‌ها)
  - `test_reviews_and_qa_phase4.py`: ۵ تست جامع چرخه حیات نظر و سوال
  - `test_wishlist_api.py`: ۱۲ تست (مهمان، ادغام، ایزولاسیون کاربر)
  - `test_users_api.py`: ۱۰ تست (ثبت‌نام، لاگین، آدرس‌ها، توکن)
  - `test_otp_and_auth_hardening.py`: ۹ تست (ریت‌لیمیتینگ، قفل اکانت، انقضای OTP)
  - `test_shipping_api.py`: ۸ تست (زون‌ها، نرخ پویا، ارسال رایگان، رهگیری پستی)
  - `test_orders_api.py` و `test_orders_tasks.py`: ۸ تست (تسویه‌حساب، لغو با بازگشت موجودی)
  - `test_product_comments_api.py`: ۷ تست
  - `test_products_api.py`: ۶ تست
  - `test_security_and_auth.py`: ۵ تست (بررسی عدم دسترسی به داده‌های دیگران)
  - سایر تست‌های نوتیفیکیشن، سلامت و پرداخت: ۱۶ تست

### ۷.۲. تست‌های فرانت‌اند (Vitest Suite)
- **مکان**: `frontend/__tests__/`
- **تعداد تست‌ها**: **۵۱ تست در ۹ سوئیت (۱۰۰٪ پاس)**
- **نتایج اجرای زنده**:
  - `__tests__/shipping/shipping-flow.test.ts` (۴ تست پاس شد)
  - `__tests__/admin/promotions-admin.test.ts` (۶ تست پاس شد)
  - `__tests__/promotions/promotions-flow.test.ts` (۷ تست پاس شد)
  - `__tests__/admin/kpi-utils.test.ts` (۳ تست پاس شد)
  - `__tests__/admin/permissions-rbac.test.ts` (۵ تست پاس شد)
  - `__tests__/wishlist/guest-wishlist.test.ts` (۵ تست پاس شد)
  - `__tests__/reviews/reviews-qa-flow.test.ts` (۱۲ تست پاس شد)
  - `__tests__/orders/order-timeline.test.ts` (۵ تست پاس شد)
  - `__tests__/admin/admin-auth.test.ts` (۴ تست پاس شد)

### ۷.۳. کنترل کیفیت استاتیک فرانت‌اند
- کامپایل تایپ‌اسکریپت: `npx tsc --noEmit` → **۰ خطا (Zero Type Errors)**.
- لینتر: `npm run lint` → **۰ اخطار و ۰ خطا (Zero ESLint Errors/Warnings)**.

---

## ۸. ارزیابی امنیتی و ریسک‌ها (Security Findings)

### نقاط قوت امنیتی اثبات‌شده:
1. **مجوز در سطح شیء (Object-Level Permissions)**: پرمیشن‌های `IsOwner`، `IsOrderOwner` و `IsPaymentOwner` مانع از دسترسی کاربران لاگین به آدرس‌ها، سفارش‌ها و پرداخت‌های دیگران می‌شوند.
2. **محافظت در برابر IDOR**: کلیدهای اصلی UUID مانع از شمارش ترتیبی موجودیت‌ها می‌شوند.
3. **گارد دوگانه ادمین**: فرانت‌اند با `AdminAuthGuard` و بک‌اند با `IsStaffAdmin` کلیه ۴۸ اندپوینت کنترل سنتر را مسدود و اعتبارسنجی می‌کنند.
4. **ریت‌لیمیتینگ و قفل اکانت**: محافظت از اندپوینت‌های لاگین و OTP در برابر حملات Brute-Force با ریدیس.
5. **جلوگیری از حملات دستکاری قیمت**: تمام محاسبات مبالغ، تخفیف‌ها، مالیات و هزینه‌های پست در سمت سرور انجام شده و هیچ ورودی قیمتی از کلاینت پذیرفته نمی‌شود.

### بدهی‌ها و ریسک‌های امنیتی شناسایی‌شده (جهت برطرف‌سازی در فاز سخت‌سازی):
1. **[MEDIUM] تنظیم CORS در پروداکشن**:
   - در `backend/config/settings/base.py` مقدار `CORS_ALLOW_ALL_ORIGINS = True` وجود دارد که در `production.py` اورراید نشده است.
2. **[MEDIUM] ذخیره‌سازی توکن‌ها در localStorage**:
   - اکسس‌توکن و رفرش‌توکن در `localStorage` کلاینت ذخیره می‌شوند. ارتقا به کوکی `httpOnly` برای رفرش‌توکن الزامی است.
3. **[LOW] بررسی کوکی پرسنل در Edge Middleware**:
   - در `frontend/src/middleware.ts` فلگ بررسی پرسنل در لایه Edge صرفاً وجود کوکی را چک می‌کند (البته گارد کلاینت و بک‌اند مانع نفوذ هستند اما در لایه Edge نیز باید سخت‌گیرانه‌تر شود).

---

## ۹. جمع‌بندی فنی و وضعیت نهایی (Final State)

- **PROJECT STATE**: **HEALTHY**
- **CURRENT PHASE**: **Phase 4 (Reviews, Ratings & Q&A Subsystem Completed)**
- **NEXT RECOMMENDED PHASE**: **Phase 5 (Real Banking Payment Gateway Integration & Hardening)**
- **BLOCKERS**: هیچ بلاکر فنی بحرانی برای عملکرد جاری وجود ندارد. تمام سرویس‌ها عملیاتی هستند.
