# گزارش انتشار فاز ۰ — پایدارسازی و تثبیت وضعیت پایه (Phase 0: Release-Hardening & Baseline)

---

## ۱. هدف فاز (Goal)
هدف از فاز ۰، ارزیابی، ممیزی، استانداردسازی و تثبیت کامل زیرساخت و جریان‌های تجارت پایه (Core Commerce Baseline) در پروژه **Paradox Shop** قبل از پیاده‌سازی فازهای توسعه تجاری جدید است. این امر شامل اعتبارسنجی فرآیندهای سبد خرید مهمان، ادغام سبد خرید پس از ورود، احراز هویت دوعاملی/OTP، تسویه‌حساب، مدیریت خطاها، اعتبارسنجی OpenAPI، آزمون‌های یکپارچه بک‌اند، بررسی نوع‌های داده‌ای TypeScript، و ساخت کامل باندل پروداکشن فرانت‌اند می‌باشد.

---

## ۲. وضعیت قبلی (Previous State)
* پروژه شامل پیاده‌سازی اولیه ماژول‌های `users`، `products`، `categories`، `cart`، `orders`، `payments`، `reviews` و کنترل سنتر ادمین بود.
* اجرای تست‌های یکپارچه بک‌اند نیازمند تثبیت محیط‌های پایگاه داده PostgreSQL 16 و Redis 7 بدون وقفه بود.
* اعتبارسنجی کامل بیلد پروداکشن فرانت‌اند Next.js 14 و تطابق اسکیماهای OpenAPI برای شروع فازهای بعدی ضروری بود.

---

## ۳. تصمیمات معماری (Architecture Decision)
1. **الگوی Modular Monolith**: حفظ استقلال دامنه‌ها و استفاده از لایه‌های مجزای `selectors.py` برای خواندن داده‌ها و `services.py` برای تغییر وضعیت‌ها و تراکنش‌های پایگاه داده.
2. **مرجعیت سرور (Server Authority)**: حفظ اقتدار ۱۰۰ درصدی سمت سرور برای محاسبات سبد خرید، قیمت‌گذاری، احراز هویت، و اعتبارسنجی موجودی انبار.
3. **جداسازی شاخه‌های گیت (Branch Isolation)**: توسعه فاز ۰ بر روی شاخه اختصاصی `feature/commerce-baseline` جهت بررسی مستقل قبل از ادغام.

---

## ۴. تغییرات و بررسی‌های بک‌اند (Backend Changes)
* بررسی کلیه ویوها و روت‌های `api/v1/` شامل احراز هویت، پروفایل، کاتالوگ محصولات، دسته‌بندی‌ها، سبد خرید، سفارشات، پرداخت تستی و بازخوردها.
* بررسی تسک‌های پس‌زمینه Celery برای پاکسازی سبدهای رها شده مهمان (`cleanup_abandoned_guest_carts`) و ابطال سفارشات منقضی‌شده پرداخت‌نشده (`cancel_stale_pending_orders`).
* ایجاد اسکریپت‌های راه‌اندازی و تست سرویس‌های جانبی دیتابیس در `scripts/setup_test_services.sh`.

---

## ۵. تغییرات و بررسی‌های فرانت‌اند (Frontend Changes)
* بررسی کلاینت API Axios و رهگیرهای (Interceptors) ارسال `x-request-id` و مدیریت رفرش توکن JWT.
* بررسی وضعیت خطاهای ۴۰۰، ۴۰۱، ۴۰۳، ۴۰۴، ۴۲۹ و ۵۰۰ و نگاشت آن‌ها به نوتیفیکیشن‌های کاربرپسند در فروشگاه.
* بررسی تمام ۳۳ روت استاتیک و داینامیک Next.js 14 شامل صفحات استورفرانت و پنل مدیریت ادمین.

---

## ۶. تغییرات دیتابیس (Database Changes)
* پایگاه داده PostgreSQL به عنوان منبع اصلی و پایدار داده‌ها مورد استفاده قرار گرفت.
* دستور `python manage.py makemigrations --check` اجرا و عدم وجود مایگریشن بدون اعمال تایید شد.

---

## ۷. تغییرات API (API Changes)
* تمامی اندپوینت‌های `api/v1/` در شمای OpenAPI مستندسازی شده و با ابزار `drf-spectacular` اعتبارسنجی شدند.
* مسیر اندپوینت‌های سلامت سیستم:
  - `GET /api/v1/health/` (System Health)
  - `GET /api/v1/health/live/` (Liveness Probe)
  - `GET /api/v1/health/ready/` (Readiness Probe)

---

## ۸. وضعیت لاگینگ و پایش‌پذیری (Logging & Observability)
* سیستم لاگینگ ساختاریافته در لایه میدلور `RequestIDMiddleware` برای تولید و الصاق `x-request-id` به درخواست‌ها و پاسخ‌ها بررسی شد.
* فیلترسازی و عدم ثبت مقادیر حساس (پسوردها، توکن‌ها و اطلاعات محرمانه) در لاگ‌ها تایید گردید.

---

## ۹. بررسی‌های امنیتی (Security Gate)
* **مجوزها و احراز هویت**: تست‌های جداسازی داده‌ها (`test_security_and_auth.py`) تایید کردند که کاربران غیرمجاز امکان دسترسی به پروفایل، سفارشات، یا آدرس‌های دیگر کاربران را ندارند.
* **نرخ درخواست (Rate Limiting)**: کنترل نرخ ارسال پیام‌ها و اعتبارسنجی OTP در برابر حملات Brute-force تایید شد.
* **CORS و CSRF**: تنظیمات هدرها و دامنه‌های مجاز در `base.py` با استاندارد امنیتی همخوانی دارند.

---

## ۱۰. بررسی کارایی و عملکرد (Performance Gate)
* اجرای بیلد پروداکشن Next.js (`npm run build`) موفقیت‌آمیز بود و حجم بار اولیه جاوااسکریپت به ازای تمام صفحات در محدوده بهینه (`87.4 kB First Load JS shared`) قرار دارد.
* کوئری‌های دیتابیس در سلکتورها از `select_related` و `prefetch_related` برای پیشگیری از سربار N+1 استفاده می‌کنند.

---

## ۱۱. آزمون‌ها و نتایج (Tests)

### آزمون‌های بک‌اند (`pytest -v`)
```text
============================= 86 passed in 31.15s ==============================
- tests/integration/test_admin_api.py (13 passed)
- tests/integration/test_cart_api.py (5 passed)
- tests/integration/test_cart_tasks.py (4 passed)
- tests/integration/test_categories_api.py (3 passed)
- tests/integration/test_health_and_settings.py (5 passed)
- tests/integration/test_notification_tasks.py (5 passed)
- tests/integration/test_orders_api.py (4 passed)
- tests/integration/test_orders_tasks.py (4 passed)
- tests/integration/test_otp_and_auth_hardening.py (9 passed)
- tests/integration/test_payments_api.py (3 passed)
- tests/integration/test_product_comments_api.py (7 passed)
- tests/integration/test_products_api.py (6 passed)
- tests/integration/test_reviews_api.py (3 passed)
- tests/integration/test_security_and_auth.py (5 passed)
- tests/integration/test_users_api.py (10 passed)
```
**نتیجه: ۸۶ آزمون با موفقیت ۱۰۰٪ پاس شدند.**

### آزمون‌های فرانت‌اند
* `npm run lint` -> بدون هیچ‌گونه خطا یا هشدار (ESLint Passed)
* `npx tsc --noEmit` -> تایپ‌چک کامل TypeScript بدون خطا
* `npm test` -> ۱۲ آزمون Vitest در ۳ فایل آزمون با موفقیت پاس شدند.
* `npm run build` -> بیلد پروداکشن بدون خطا ایجاد شد.

### بررسی‌های سیستمی جنگو
* `python manage.py check` -> `System check identified no issues (0 silenced).`
* `python manage.py makemigrations --check` -> بدون مایگریشن معلق.
* `python manage.py spectacular --validate` -> شمای OpenAPI معتبر و بدون خطا.

---

## ۱۲. وضعیت داکر و زیرساخت (Docker Verification)
* فایل‌های `docker-compose.yml` و `docker-compose.prod.yml` به همراه `Dockerfile.dev` و `Dockerfile` برای سرویس‌های `postgres`, `redis`, `backend`, `celery_worker`, `celery_beat`, و `frontend` تعریف شده و سینتکس آن‌ها ارزیابی شد.

---

## ۱۳. بررسی ران‌تایم و جریان‌های کاربری (Runtime Verification)
جریان‌های اصلی زیر در معماری سیستم بررسی و تایید شدند:
1. **سبد خرید کاربر مهمان (Guest Cart)**: تخصیص کلید سشن مهمان، افزودن محصول به سبد و ویرایش تعداد.
2. **احراز هویت و ورود (Auth & Login)**: تولید توکن‌های JWT Access/Refresh و ارسال OTP.
3. **ادغام سبد خرید (Cart Merge)**: انتقال خودکار آیتم‌های سبد خرید مهمان به حساب کاربری بلافاصله پس از لاگین.
4. **تسویه‌حساب و پرداخت (Checkout & Payment)**: تبدیل سبد خرید به سفارش، کسر و رزرو موجودی انبار، و پردازش تراکنش پرداخت.

---

## ۱۴. فایل‌های تغییر یافته و ایجاد شده (Files Changed)
* `scripts/setup_test_services.sh` [جدید]
* `scripts/grant_test_perms.sh` [جدید]
* `scripts/fix_hba.sh` [جدید]
* `docs/releases/phase-0-baseline-fa.md` [جدید]

---

## ۱۵. تغییرات وابستگی‌ها (Dependencies Changed)
* هیچ پکیج اضافی خارج از `pyproject.toml` و `package.json` اضافه نگردید و از وابستگی‌های اعلام‌شده استفاده شد.

---

## ۱۶. محدودیت‌های شناخته شده (Known Limitations)
* سرویس ارسال پیامک/ایمیل در محیط توسعه به صورت لاگ کنسولی پیکربندی شده است.
* درگاه پرداخت فعلی به عنوان شبیه‌ساز (Mock Provider) کار می‌کند که در فاز ۳ با معماری کامل درگاه‌های واقعی گسترش خواهد یافت.

---

## ۱۷. راهنمای آزمون دستی (Manual Test Instructions)
برای تست کامل جریان پایه توسط توسعه‌دهنده:
1. اجرای سرویس‌ها و ورود به فرانت‌اند:
   ```bash
   # فرانت‌اند در پورت ۳۰۰۰ و بک‌اند در پورت ۸۰۰۰
   ```
2. باز کردن صفحه اصلی `http://localhost:3000` به صورت کاربر مهمان (ناشناس).
3. انتخاب یک محصول از کاتالوگ و افزودن به سبد خرید (`/cart`).
4. رفتن به صفحه ثبت نام یا ورود (`/login`) و ورود به حساب کاربری.
5. مشاهده سبد خرید و اطمینان از ادغام خودکار محصولات انتخاب‌شده مهمان با سبد کاربر.
6. رفتن به صفحه تسویه‌حساب (`/checkout`)، انتخاب آدرس و تکمیل خرید تستی.
7. مشاهده سفارش ثبت‌شده در داشبورد (`/dashboard/orders`).

---

## ۱۸. شاخه گیت (Git Branch)
```text
feature/commerce-baseline
```

---

## ۱۹. کامیت پیشنهادی (Recommended Commit)
```bash
git add docs/ scripts/
git commit -m "feat(baseline): stabilize and harden commerce baseline for Phase 0"
```

---

## ۲۰. فاز بعدی (Next Phase)
**فاز ۱ — لیست علاقه‌مندی‌ها (Phase 1: Wishlist)**
* شاخه: `feature/wishlist`
* اهداف: ایجاد مدل‌های `Wishlist` و `WishlistItem`، سرویس‌ها، سلکتورها، اندپوینت‌های REST، ادغام لیست علاقه‌مندی‌های مهمان پس از ورود، و رابط کاربری اختصاصی با طراحی لوکس مهندسی‌شده.
