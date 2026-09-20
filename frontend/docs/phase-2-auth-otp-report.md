# گزارش ارتقای امنیت احراز هویت، اعتبارسنجی Redis OTP و بازیابی رمز عبور (فاز ۲)

این سند گزارش جامع پیاده‌سازی، معماری و آزمون سیستم احراز هویت امن، فعال‌سازی مشروط حساب با کد یکبارمصرف (OTP) مبتنی بر Redis، ثبت لاگ در کنسول ترمینال، اعتبارسنجی شماره موبایل در داشبورد و چرخه بازیابی رمز عبور در پروژه **Paradox Shop** است.

---

## ۱. خلاصه‌ی دستاوردها و قابلیت‌های پیاده‌سازی‌شده

| بخش / ماژول | شرح قابلیت | وضعیت |
| :--- | :--- | :--- |
| **گیت فعال‌سازی ایمیل (Email Verification Gate)** | ثبت‌نام کاربر با وضعیت غیرفعال (`is_active=False`)، تولید کد ۶ رقمی امن در Redis با TTL ۱۲۰ ثانیه، چاپ کادر شکیل OTP در ترمینال جنگو، و فعال‌سازی حساب پس از تایید در `/verify-email` همراه با صدور توکن‌های JWT. | 🟢 پیاده‌سازی و تست شد |
| **کنترل نرخ و ارسال مجدد (Rate Limiting & Cooldown)** | اعمال محدودیت حداقل فاصله زمانی ۶۰ ثانیه بین هر بار درخواست مجدد کد، و محدودیت سقف ۵ درخواست در ساعت به ازای هر IP در اندپوینت `/api/v1/users/resend-otp/`. | 🟢 پیاده‌سازی و تست شد |
| **اعتبارسنجی شماره موبایل (Mobile SMS Verification)** | درخواست ارسال کد پیامکی برای شماره همراه در `/api/v1/users/profile/verify-phone/` و تایید نهایی در `/api/v1/users/profile/confirm-phone/` با به‌روزرسانی فیلد `phone_verified=True`. | 🟢 پیاده‌سازی و تست شد |
| **فرآیند بازیابی رمز عبور (Password Reset)** | درخواست کد بازنشانی برای ایمیل ثبت‌شده در `/password-reset/request/`، اعتبارسنجی کد یکبارمصرف و بازنشانی اتمیک رمز عبور جدید در `/password-reset/confirm/`. | 🟢 پیاده‌سازی و تست شد |
| **رابط‌های کاربری فرانت‌اند (Next.js 14 UI)** | توسعه صفحه `/verify-email` با ورودی ۶ خانه‌ای تفکیک‌شده و تایمر زنده، توسعه صفحه چندمرحله‌ای `/forgot-password`، اتصال به صفحه `/login` و افزودن کارت وضعیت موبایل در `/dashboard/profile`. | 🟢 پیاده‌سازی و بیلد شد |

---

## ۲. معماری فنی بک‌اند (Django + DRF + Redis)

### ۲.۱. سرویس متمرکز `OTPService` (`backend/apps/users/otp_service.py`)
سرویس مستقل با اتصال مستقیم به Redis که ساختار کلیدها و طول عمرهای زیر را مدیریت می‌کند:
* `otp:verify:{user_id}`: کد ۶ رقمی تایید ایمیل (TTL: ۱۲۰ ثانیه)
* `otp:phone:{user_id}`: شیء JSON شامل کد OTP و شماره همراه هدف (TTL: ۱۲۰ ثانیه)
* `otp:reset:{user_id}`: کد ۶ رقمی بازنشانی رمز عبور (TTL: ۱۲۰ ثانیه)
* `otp:cooldown:{type}:{user_id}`: کلید قفل ارسال مجدد (TTL: ۶۰ ثانیه)
* `otp:ratelimit:{client_ip}`: شمارنده درخواست‌های ساعتی به ازای هر IP (TTL: ۳۶۰۰ ثانیه، حداکثر ۵ بار)

نمونه خروجی استاندارد و برجسته در کنسول ترمینال جنگو (Mock Service):
```text
==========================================================================
 [MOCK OTP SERVICE] Email Verification Code
 Target: user@example.com | User ID: 3f59260c-8afd-4a1b-9e45-123456789abc
 OTP Code: [ 492815 ] (Valid for 120s)
==========================================================================
```

### ۲.۲. اندپوینت‌های REST API اضافه شده
1. `POST /api/v1/users/register/`: ثبت‌نام اولیه کاربر با وضعیت `is_active=False` و ارسال کد.
2. `POST /api/v1/users/verify-email/`: دریافت ایمیل و OTP، فعال‌سازی کاربر و برگرداندن جفت توکن `access` و `refresh`.
3. `POST /api/v1/users/resend-otp/`: ارسال مجدد کد برای تایید ایمیل یا بازیابی رمز با رعایت Cooldown.
4. `POST /api/v1/users/profile/verify-phone/`: درخواست کد پیامکی تایید موبایل (نیاز به لاگین).
5. `POST /api/v1/users/profile/confirm-phone/`: تایید کد پیامکی و تنظیم `phone_verified=True` (نیاز به لاگین).
6. `POST /api/v1/users/password-reset/request/`: درخواست کد بازیابی رمز عبور.
7. `POST /api/v1/users/password-reset/confirm/`: ثبت نهایی رمز عبور جدید با کد اعتبارسنجی.

---

## ۳. پیاده‌سازی فرانت‌اند (Next.js 14 + Tailwind CSS + Framer Motion)

1. **صفحه گیت فعال‌سازی ایمیل (`/verify-email`):**
   * کامپوننت ورودی ۶ رقمی سگمنت‌شده با پیمایش خودکار فوکوس (Auto-advance) و پشتیبانی از کلید Backspace.
   * پشتیبانی کامل از عملیات Paste برای الصاق سریع کد ۶ رقمی.
   * تایمر شمارش معکوس ۱۲۰ ثانیه‌ای هماهنگ با انقضای توکن در Redis.
   * دکمه ارسال مجدد کد همراه با شمارنده معکوس ۶۰ ثانیه‌ای (Cooldown Timer).
2. **صفحه بازیابی رمز عبور (`/forgot-password`):**
   * فرآیند ۳ مرحله‌ای: ورود ایمیل ➔ ورود کد ۶ رقمی ➔ ایجاد رمز عبور جدید با اعتبارسنجی حداقل طول و تطابق.
   * گام تایید نهایی و دکمه هدایت مستقیم به صفحه ورود.
3. **کارت تایید شماره موبایل در داشبورد (`/dashboard/profile`):**
   * نمایش نشان وضعیت تایید (نشان سبز `Verified` در برابر نشان کهربایی `Unverified`).
   * فرم درون‌صفحه‌ای ارسال پیامک و تایید کد ۶ رقمی SMS بدون نیاز به رفرش صفحه.

---

## ۴. نتایج آزمون‌های خودکار و اعتبارسنجی

### آزمون‌های بک‌اند (Pytest در داکر):
```bash
docker compose exec backend pytest
============================= 66 passed in 16.62s ==============================
```
* شامل ۹ تست ادغام اختصاصی در `test_otp_and_auth_hardening.py` و ۵۷ تست حوزه‌های سفارشات، سبد خرید، کاتالوگ و پرداخت.

### بررسی‌های استاتیک و تایپ فرانت‌اند:
```bash
# اعتبارسنجی ESLint
npm run lint
✔ No ESLint warnings or errors

# بررسی سیستم انواع TypeScript
npx tsc --noEmit
# خروجی بدون خطا (Exit code 0)
```

### ساخت کانتینر داکر:
```bash
docker compose build frontend
 Image paradox-shop-frontend Built

docker compose up -d
 Container shop_frontend Started (Healthy)
```

---

## ۵. راهنمای تست دستی در مرورگر (Testing Guide)

1. **تست ثبت‌نام و گیت فعال‌سازی:**
   * به آدرس [http://localhost:3000/register](http://localhost:3000/register) بروید.
   * فرم ثبت‌نام را پر کرده و دکمه «Create Paradox Account» را بزنید.
   * صفحه به صورت خودکار به `/verify-email?email=...` هدایت می‌شود.
   * در ترمینال، لاگ کانتینر جنگو (`docker compose logs -f backend`) را مشاهده کرده و کد ۶ رقمی چاپ‌شده در کادر `[MOCK OTP SERVICE]` را کپی کنید.
   * کد را در ورودی وارد کنید؛ پس از تایید بلافاصله لاگین انجام شده و به داشبورد هدایت می‌شوید.
2. **تست تایید شماره موبایل:**
   * به آدرس [http://localhost:3000/dashboard/profile](http://localhost:3000/dashboard/profile) بروید.
   * در بخش «Mobile Phone Verification»، شماره موبایل خود را وارد کرده و «Send Verification Code» را بزنید.
   * کد ۶ رقمی چاپ‌شده در ترمینال را در کادر بازشده وارد کرده و «Confirm Verification» را کلیک کنید.
   * نشان به رنگ سبز `Verified` تغییر پیدا می‌کند.
3. **تست بازیابی رمز عبور:**
   * از حساب کاربری خارج شده و به [http://localhost:3000/login](http://localhost:3000/login) بروید.
   * روی لینک «Forgot password?» کلیک کنید تا وارد `/forgot-password` شوید.
   * ایمیل حساب را وارد کرده و کد ۶ رقمی دریافت شده در ترمینال را وارد نمایید.
   * رمز عبور جدید را تعیین کرده و ورود موفق با رمز جدید را بررسی کنید.

---

## ۶. پیام کامیت استاندارد و دستورات گیت (Commit Command)

### دستور اجرای کامیت:

```bash
git add backend/apps/users/otp_service.py \
        backend/apps/users/services.py \
        backend/apps/users/serializers.py \
        backend/apps/users/views.py \
        backend/apps/users/urls.py \
        backend/tests/integration/test_otp_and_auth_hardening.py \
        backend/tests/integration/test_users_api.py \
        backend/tests/integration/test_notification_tasks.py \
        frontend/src/types/api.ts \
        frontend/src/lib/api/endpoints.ts \
        frontend/src/lib/api/error-handler.ts \
        frontend/src/stores/auth.ts \
        frontend/src/app/verify-email/page.tsx \
        frontend/src/app/forgot-password/page.tsx \
        frontend/src/app/register/page.tsx \
        frontend/src/app/login/page.tsx \
        frontend/src/app/dashboard/profile/page.tsx \
        frontend/docs/phase-2-auth-otp-report.md

git commit -m "feat(auth): implement Redis OTP verification, activation gate, mobile verification, and password reset"
```
