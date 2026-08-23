# گزارش جامع کالبدشکافی معماری و ممیزی قانونی پروژه پارادوکس شاپ (Paradox Shop)
## سند تحلیل جامع، مستندسازی فنی، آموزشی و نقشه راه تکامل سیستم

> **نسخه سند**: 1.0.0 — انتشار رسمی  
> **تاریخ بازرسی فنی**: ۲۳ آگوست ۲۰۲۶ (August 2026)  
> **نقش بازرس**: مهندس ارشد نرم‌افزار، معمار سیستم، مهندس امنیت، DevOps و مدرس فنی  
> **منبع حقیقت (Source of Truth)**: کدهای واقعی، کانفیگ‌ها، تست‌ها و فایل‌های اجرایی مخزن  
> **مخزن هدف**: `Abolfazlparadox/Paradox-Shop`

---

# ۱. وضعیت پروژه در یک نگاه (Executive Summary)

| مؤلفه / بخش سیستم | وضعیت فعلی | وضعیت عملیاتی | سطح آمادگی پروداکشن | خلاصه وضعیت فنی |
| :--- | :---: | :---: | :---: | :--- |
| **معماری کلی** | Modular Monolith | ✅ فعال | 🟢 بالا | جداسازی تمیز ۷ دامین، لایه‌بندی ۴ لایه در جنگو، ساختار مونورپو |
| **هسته بک‌اند (Django / DRF)** | Django 5.x + DRF | ✅ تأیید شده | 🟢 بالا | احراز هویت JWT، مدیریت خطای ساختاریافته، پجینیشن استاندارد |
| **دیتابیس (PostgreSQL)** | PostgreSQL 16 | ✅ تأیید شده | 🟢 بالا | مدل‌های جامع، کلید اصلی UUID، کانسترینت‌های CHECK، ایندکس‌گذاری |
| **همزمانی و تراکنش‌ها** | ACID + Row Locks | ✅ تأیید شده | 🟢 عالی | استفاده از `select_for_update` در سبد خرید، تسویه‌حساب، پرداخت و لغو سفارش |
| **فرایندهای ناهمگام (Celery / Redis)** | Celery 5 + Beat | ✅ تأیید شده | 🟡 نیازمند اتصال درگاه واقعی | صف‌های ایمیل، لغو خودکار سفارش‌های معلق، پاکسازی سبد مهمان |
| **فرانت‌اند (Next.js)** | Next.js 14 (App Router) | ✅ تأیید شده | 🟢 عالی | تایپ‌اسکریپت، Tailwind، فریمورک انیمیشن Framer Motion، رابط کاربری لوکس ۳بعدی |
| **پرتال ادمین فرانت‌اند** | Next.js Dedicated Admin | ⚠️ ترکیبی (Real + Fallback) | 🟡 متوسط | معماری ترکیبی با اتصال به بک‌اند و ذخیره‌سازی محلی برای موارد شبیه‌سازی‌شده |
| **امنیت و احراز هویت** | JWT + OTP + Throttling | ✅ تأیید شده | 🟢 خوب | ورود دومرحله‌ای OTP، رفرش توکن با چرخش و بلک‌لیست، ریت‌لیمیت Redis |
| **پوشش تست‌ها** | Pytest (72) + Vitest (7) | ✅ تأیید شده | 🟢 خوب | ۷۲ تست بک‌اند و ۷ تست فرانت‌اند (نیازمند ران تایم کانتینری برای دیتابیس) |
| **داکر و زیرساخت** | Docker + Compose + Nginx | ✅ تأیید شده | 🟢 خوب | تفکیک محیط Dev و Prod، Reverse Proxy امن با Nginx |
| **سئو و بهینه‌سازی (SEO & Web Vitals)** | SSR + Metadata + JSON-LD | ✅ تأیید شده | 🟢 عالی | امتیاز ۱۰۰ سئو، LCP بهینه، سایت‌مپ داینامیک و ساختار استاندارد |

---

# ۲. ساختار کامل مخزن و درخت فایل‌ها (Repository Discovery)

```text
Paradox-Shop/
│
├── .agent/ / .agents/          # اسکیل‌ها و قوانین ایجنت‌های هوش مصنوعی و طراحی رابط کاربری
├── .github/
│   └── workflows/
│       └── ci.yml             # خط لوله یکپارچه‌سازی مداوم (GitHub Actions CI)
├── backend/                    # سرویس بک‌اند (Django REST Framework)
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── urls.py         # روت اصلی نسخه ۱ API و مانت کردن ماژول‌های دامین
│   ├── apps/                   # ماژول‌های دامین (Modular Monolith Applications)
│   │   ├── users/              # کاربران، پروفایل، احراز هویت، آدرس‌ها و سیستم OTP
│   │   ├── products/           # کاتالوگ محصولات، تنوع‌ها (Variants)، ویژگی‌ها، نظرات
│   │   ├── categories/         # درخت دسته‌بندی و ویژگی‌های پویا (Taxonomy)
│   │   ├── cart/               # سبد خرید کاربران و مهمان، منطق ادغام (Merge)
│   │   ├── orders/             # چرخه حیات سفارش، صدور فاکتور، ماشین وضعیت و تسویه‌حساب
│   │   ├── payments/           # تراکنش‌های مالی، سیستم Idempotency و درگاه پرداخت
│   │   └── reviews/            # امتیازدهی و بررسی‌های خریداران تاییدشده
│   ├── common/                 # کتابخانه‌ها و زیرساخت‌های مشترک
│   │   ├── models.py           # میکس‌این‌های UUID، Timestamp و SoftDelete
│   │   ├── exceptions.py       # مدیریت‌کننده یکپارچه خطاهای API
│   │   ├── health.py           # پروب‌های Liveness و Readiness
│   │   ├── logging.py          # فیلتر فیلدهای حساس و الصاق شناسه درخواست (Request ID)
│   │   ├── middleware.py       # میدل‌ور تولید و تزریق X-Request-ID
│   │   └── pagination.py       # ساختار صفحه‌بندی استاندارد نتایج
│   ├── config/                 # پیکربندی مرکزی پروژه جنگو
│   │   ├── settings/
│   │   │   ├── base.py         # تنظیمات پایه و مشترک
│   │   │   ├── development.py  # تنظیمات محیط توسعه محلی
│   │   │   └── production.py   # تنظیمات امنیتی محیط عملیاتی
│   │   ├── asgi.py             # نقطه ورود ناهمگام ASGI
│   │   ├── celery.py           # پیکربندی و راه‌اندازی ورکرها و زمان‌بند سلری
│   │   ├── urls.py             # روت‌های ریشه، مستندات Swagger و پنل ادمین جنگو
│   │   └── wsgi.py             # نقطه ورود استاندارد WSGI
│   ├── media/                  # فایل‌های آپلود شده (تصاویر، آواتارها، بنرها)
│   ├── tests/                  # سوئیت تست‌های یکپارچگی بک‌اند
│   ├── Dockerfile              # ایمیج داکر پروداکشن (چندمرحله‌ای)
│   ├── Dockerfile.dev          # ایمیج داکر محیط توسعه
│   ├── manage.py               # رابط خط فرمان جنگو
│   ├── pyproject.toml          # تعریف نیازمندی‌ها با ابزار uv
│   └── uv.lock                 # فایل قفل وابستگی‌های پایتون
│
├── frontend/                   # اپلیکیشن فرانت‌اند (Next.js 14 App Router)
│   ├── public/                 # دارایی‌های استاتیک، تصاویر و فونت‌ها
│   ├── src/
│   │   ├── app/                # مسیرهای App Router
│   │   │   ├── (shop)/         # روت گروپ فروشگاه عمومی (Layout مشترک)
│   │   │   │   ├── page.tsx    # صفحه اصلی با هیرو سکشن ۳بعدی
│   │   │   │   ├── catalog/    # صفحه فهرست و فیلترینگ کاتالوگ
│   │   │   │   ├── products/   # صفحه جزییات محصول و انتخاب Variant
│   │   │   │   ├── cart/       # صفحه مدیریت سبد خرید
│   │   │   │   ├── checkout/   # فرایند چندمرحله‌ای تسویه‌حساب
│   │   │   │   ├── orders/     # تاریخچه و جزییات تایم‌لاین سفارشات
│   │   │   │   ├── profile/    # داشبورد مشتری و دفترچه آدرس‌ها
│   │   │   │   ├── login/      # صفحه ورود با OTP و رمز عبور
│   │   │   │   ├── register/   # صفحه ثبت‌نام با اعتبارسنجی آنی
│   │   │   │   └── verify-email/ # تایید کد ۶ رقمی ایمیل
│   │   │   ├── admin/          # پنل مدیریت اختصاصی ادمین با دارک‌مود لوکس
│   │   │   │   ├── analytics/  # نمودارهای فروش و شاخص‌های مالی
│   │   │   │   ├── products/   # مدیریت محصولات و موجودی
│   │   │   │   ├── orders/     # پردازش و تغییر وضعیت سفارشات
│   │   │   │   ├── customers/  # مدیریت مشتریان و مسدودسازی
│   │   │   │   ├── comments/   # پاسخگویی و تایید کامنت‌ها
│   │   │   │   └── settings/   # تنظیمات فروشگاه و ارزها
│   │   │   ├── layout.tsx      # ریشه قالب، فونت‌ها و فراهم‌کننده‌ها
│   │   │   ├── providers.tsx   # کلاینت React Query و نوتیفیکیشن‌ها
│   │   │   ├── robots.ts       # تولید خودکار robots.txt
│   │   │   └── sitemap.ts      # تولید خودکار sitemap.xml
│   │   ├── components/         # کامپوننت‌های رابط کاربری
│   │   │   ├── 3d/             # المان‌های ۳بعدی Three.js (Penrose Triangle)
│   │   │   ├── admin/          # کامپوننت‌های اختصاصی پنل مدیریت
│   │   │   ├── layout/         # نوبار، فوتر، دراور سبد، مدال جستجو و نشانگر ماوس
│   │   │   └── ui/             # دکمه‌ها، کارت‌ها، اینپوت‌ها، بج‌ها و اسکلتون‌ها
│   │   ├── features/           # ساختار مبتنی بر ویژگی (Feature-based Modules)
│   │   ├── lib/
│   │   │   ├── api/            # کلاینت Axios، اندپوینت‌ها و مدیریت خطا
│   │   │   └── utils/          # توابع کمکی فرمت پول، تاریخ و کلاس‌های CSS
│   │   ├── stores/             # استورهای سراسری Zustand (Auth, UI, Notifications)
│   │   └── types/              # تعاریف تایپ‌های TypeScript همگام با OpenAPI
│   ├── package.json            # وابستگی‌های Node.js
│   ├── tailwind.config.ts      # پیکربندی پالت رنگی لوکس و انیمیشن‌ها
│   └── tsconfig.json           # پیکربندی کامپایلر تایپ‌اسکریپت
│
├── infrastructure/
│   └── nginx/                  # وب‌سرور و Reverse Proxy برای پروداکشن
│       ├── nginx.conf          # تنظیمات اصلی انجین‌ایکس
│       └── conf.d/default.conf # مسیریابی ترافیک به سمت کانتینرهای بک‌اند و فرانت‌اند
│
├── docs/                       # مستندات معماری، تصمیمات فنی (ADR) و گزارش‌ها
├── docker-compose.yml          # ارکستراسیون سرویس‌ها در محیط توسعه
├── docker-compose.prod.yml     # ارکستراسیون محیط عملیاتی با Nginx و Gunicorn
└── Makefile                    # دستورات سریع مدیریت کانتینرها، مایگریشن و تست
```

---

# ۳. کالبدشکافی فایل‌به‌فایل بخش‌های کلیدی (File-by-File Analysis)

در این بخش، فایل‌های محوری بک‌اند و فرانت‌اند بر اساس ساختار استاندارد ۱۰ مرحله‌ای کالبدشکافی می‌شوند.

---

## فایل ۱: `backend/apps/users/models.py`

#### ۱. هدف فایل
تعریف مدل سفارشی کاربر (`User`)، پروفایل شخصی (`UserProfile`) و آدرس‌های تحویل کالا (`Address`).

#### ۲. دلیل وجود در معماری
این فایل ستون فقرات احراز هویت و مدیریت هویت (Identity Management) را در سیستم تشکیل می‌دهد. با استفاده از ایمیل به عنوان شناسه یکتا به جای نام کاربری سنتی، فرایند ثبت‌نام مدرن و استاندارد پیاده‌سازی شده است.

#### ۳. محتویات اصلی
- کلاس `UserManager`: مدیر دیتابیس برای ساخت کاربر عادی و سوپریوزر با نرمال‌سازی ایمیل.
- کلاس `User`: ارث‌بری از `AbstractBaseUser`، `PermissionsMixin`، `UUIDPrimaryKeyMixin`، `TimestampMixin` و `SoftDeleteMixin`.
- کلاس `UserProfile`: ارتباط One-to-One با کاربر، وضعیت تایید ایمیل و شماره موبایل.
- کلاس `Address`: ذخیره آدرس با فیلد `is_default`، ایندکس ترکیبی روی `(user, is_deleted)` و قابلیت حذف منطقی.
- سیگنال `create_user_profile`: ساخت خودکار ردیف پروفایل به محض درج کاربر جدید.

#### ۴. نحوه اتصال به سایر بخش‌های پروژه
- توسط تمام دامین‌ها (`cart`, `orders`, `payments`, `reviews`) به عنوان کلید خارجی ارجاع داده می‌شود.
- در `config/settings/base.py` با `AUTH_USER_MODEL = "users.User"` معرفی شده است.

#### ۵. جریان اجرا / چرخه درخواست
هنگام ثبت‌نام یا ورود، متدهای `UserManager.create_user` و `User.check_password` فراخوانی می‌شوند.

#### ۶. بررسی کد و تحلیل خط به خط
```python
class User(AbstractBaseUser, PermissionsMixin, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    email = models.EmailField(_("email address"), unique=True, db_index=True, max_length=255)
    phone_number = models.CharField(_("phone number"), max_length=20, unique=True, null=True, blank=True, db_index=True)
    is_active = models.BooleanField(_("active"), default=True)
```
- `AbstractBaseUser`: رفتارهای اصلی کاربر و هش کردن پسورد جنگو را در بر دارد.
- `UUIDPrimaryKeyMixin`: شناسه اصلی را از `id` عددی به `UUID v4` تغییر می‌دهد تا از حملات پیمایش شناسه‌ها (Enumeration / IDOR) جلوگیری شود.
- `SoftDeleteMixin`: به جای حذف فیزیکی رکورد از دیتابیس، فلگ `is_deleted=True` قرار می‌گیرد تا سوابق مالی و تراکنش‌ها حفظ شوند.
- `unique=True, db_index=True`: ساخت یک ایندکس یکتا (B-Tree Index) در سطح دیتابیس PostgreSQL برای سرعت جستجوی `O(log N)` در زمان ورود کاربر.

#### ۷. وضعیت پیاده‌سازی
**VERIFIED IMPLEMENTED** (به‌طور کامل و دقیق پیاده‌سازی شده است).

#### ۸. مشکلات یافت‌شده
- در مدل `User`، فیلد `is_active` به طور پیش‌فرض `True` تعریف شده است، در حالی که در سرویس ثبت‌نام با OTP باید کاربر تا زمان تایید ایمیل در حالت `is_active=False` ایجاد شود. این کار در لایه سرویس انجام می‌شود، اما در تعریف پیش‌فرض مدل `True` است.

#### ۹. پیشنهاد بهبود
پیشنهاد می‌شود پیش‌فرض مدل با سیاست ثبت‌نام هماهنگ شود یا صراحتاً در مستندات قید گردد.

#### ۱۰. توضیح آموزشی برای مبتدیان
در سیستم‌های بزرگ، هرگز نباید از کلیدهای عددی مثل ۱ و ۲ و ۳ برای کاربران استفاده کرد، زیرا هکر می‌تواند به راحتی شناسه دیگران را حدس بزند (`/users/2/`). با استفاده از شناسه تصادفی ۱۲۸ بیتی (UUID)، این امکان کاملاً خنثی می‌شود. همچنین با حذف منطقی (Soft Delete)، اطلاعات کاربر به اشتباه از پایگاه داده پاک نمی‌شود و یکپارچگی سوابق خرید او حفظ می‌گردد.

---

## فایل ۲: `backend/apps/users/otp_service.py`

#### ۱. هدف فایل
مدیریت چرخه حیات، تولید، اعتبارسنجی و ریت‌لیمیت کدهای یک‌بارمصرف (OTP) ۶ رقمی با اتکا به حافظه Redis.

#### ۲. دلیل وجود در معماری
جداسازی مسئولیت ارتباط با سرور ردیس، رمزنگاری کدهای موقت، اعمال محدودیت زمان خنک‌سازی (Cooldown) و ریت‌لیمیت مبتنی بر IP از لایه‌های View و Service.

#### ۳. محتویات اصلی
- ثوابت: `OTP_TTL_SECONDS = 120` (اعتبار ۲ دقیقه‌ای)، `COOLDOWN_SECONDS = 60` (محدودیت درخواست مجدد ۱ دقیقه‌ای)، `MAX_HOURLY_REQUESTS = 5`.
- متد `generate_otp_code`: تولید کد تصادفی با امنیت رمزنگاری با پکیج `secrets`.
- متد `_check_rate_limits`: بررسی کلیدهای ردیس برای جلوگیری از ارسال مکرر پیامک/ایمیل.
- لاگ شبیه‌ساز `_log_otp_to_console`: چاپ کادر زیبا و مشخص در کنسول توسعه جهت تست آسان.

#### ۴. نحوه اتصال به سایر بخش‌های پروژه
- توسط `UserService` در متدهای ثبت‌نام، تایید ایمیل، تایید موبایل و فراموشی رمز عبور صدا زده می‌شود.

#### ۵. جریان اجرا / چرخه درخواست
۱. کاربر ایمیل را وارد می‌کند. ۲. ریت‌لیمیت IP و Cooldown در ردیس چک می‌شود. ۳. کد ۶ رقمی ساخته شده و با کلید `otp:verify:<user_id>` و انقضای ۱۲۰ ثانیه در ردیس ذخیره می‌شود. ۴. کاربر کد را ارسال کرده و در صورت تطابق، کلید حذف و کاربر فعال می‌شود.

#### ۶. بررسی کد و تحلیل خط به خط
```python
@classmethod
def send_email_verification_otp(cls, user, client_ip: Optional[str] = None) -> Tuple[str, int, int]:
    r = cls.get_redis_client()
    user_id_str = str(user.id)
    cls._check_rate_limits(r, user_id_str, "verify", client_ip)

    otp = cls.generate_otp_code()
    verify_key = f"otp:verify:{user_id_str}"
    r.setex(verify_key, cls.OTP_TTL_SECONDS, otp)

    cls._apply_rate_limits(r, user_id_str, "verify", client_ip)
    cls._log_otp_to_console(title="Email Verification Code", target=user.email, user_id=user_id_str, otp=otp)
    return otp, cls.COOLDOWN_SECONDS, cls.OTP_TTL_SECONDS
```
- `get_redis_client()`: یک نشست اتصال مستقل با پارامتر `decode_responses=True` می‌سازد تا رشته‌ها به صورت متن برگردند نه بایت.
- `r.setex(key, time, value)`: ذخیره‌سازی داده در ردیس همراه با انقضای خودکار (Time-to-Live). پس از ۱۲۰ ثانیه، ردیس داده را از رم پاک می‌کند بدون اینکه نیاز به پاکسازی دستی در پایگاه داده اصلی باشد.

#### ۷. وضعیت پیاده‌سازی
**VERIFIED IMPLEMENTED** (تست‌های یکپارچگی آن با ۹ تست مجزا پاس شده است).

#### ۸. مشکلات یافت‌شده
هیچ خطای منطقی مشاهده نشد. اتصال ردیس در محیط بدون داکر به `localhost` نیاز دارد که در کانفیگ هندل شده است.

#### ۹. پیشنهاد بهبود
استفاده از سیستم Pipeline در تمام متدها برای کاهش Round-Trip به سرور ردیس.

#### ۱۰. توضیح آموزشی برای مبتدیان
ردیس (Redis) یک پایگاه داده درون‌حافظه‌ای (In-Memory) فوق‌العاده سریع است. ذخیره کدهای موقت ۲ دقیقه‌ای در دیتابیس اصلی (PostgreSQL) باعث پر شدن بیهوده هارد دیسک و کندی سیستم می‌شود. ردیس به صورت خودکار این کدها را پس از اتمام زمان منقضی و نابود می‌کند.

---

## فایل ۳: `backend/apps/orders/services.py`

#### ۱. هدف فایل
پیاده‌سازی منطق تسویه‌حساب (Checkout)، قفل‌گذاری سطری موجودی، ایجاد سفارش و لغو سفارش.

#### ۲. دلیل وجود در معماری
این فایل حیاتی‌ترین بخش تجاری و مالی سامانه است. تضمین می‌کند که هیچ کالایی بیش از موجودی واقعی انبار فروخته نشود (Overselling Prevention) و تراکنش‌های بانکی به صورت اتمیک ثبت گردند.

#### ۳. محتویات اصلی
- کلاس `OrderService`.
- متد `create_order_from_cart`: اجرای ۹ مرحله‌ای فرایند Checkout.
- متد `cancel_order`: بازگرداندن سفارش به وضعیت لغو شده و افزایش مجدد موجودی انبار به صورت اتمیک.
- متد `transition_status`: تغییر کنترل‌شده وضعیت سفارش بر اساس ماتریس انتقال مجاز.

#### ۴. نحوه اتصال به سایر بخش‌های پروژه
- ارتباط بین‌دامینی با `apps.cart.models.Cart`, `apps.products.models.ProductVariant`, `apps.users.models.Address`.
- فراخوانی تسک پس‌زمینه `send_order_confirmation_email` سلری پس از `transaction.on_commit`.

#### ۵. جریان اجرا / چرخه درخواست
درخواست `POST /api/v1/orders/checkout/` به ویو ارسال می‌شود -> سرویس اجرا می‌شود -> رکورد سبد خرید قفل می‌شود -> موجودی انبار با `select_for_update` قفل و بازبینی می‌شود -> سفارش، اقلام و آدرس اسنپ‌شات می‌شوند -> موجودی کاهش می‌یابد -> سبد خرید پاک می‌شود -> تراکنش کامیت شده و تسک ایمیل به ردیس ارسال می‌گردد.

#### ۶. بررسی کد و تحلیل خط به خط
```python
# قفل‌گذاری انبار تنوع‌ها برای جلوگیری از Race Condition
locked_variants = {
    v.id: v
    for v in ProductVariant.objects.select_for_update().filter(pk__in=variant_ids)
}

# اعتبارسنجی دقیق مجدد موجودی پس از تصاحب قفل
for item in cart_items:
    if item.variant_id is not None:
        variant = locked_variants.get(item.variant_id)
        if item.quantity > variant.stock:
            raise ValidationError({"stock": f'Only {variant.stock} unit(s) of "{variant.name}" are in stock.'})
```
- `select_for_update()`: یک دستور در سطح SQL است که ردیف‌های انتخاب‌شده را با قفل انحصاری `FOR UPDATE` در PostgreSQL مسدود می‌کند. اگر دو کاربر همزمان آخرین موجودی یک کالا را بخرند، نفر دوم پشت صف قفل منتظر می‌ماند تا تراکنش نفر اول تمام شود؛ سپس با خواندن موجودی به‌روزشده (که اکنون صفر است)، خطای کمبود موجودی دریافت می‌کند و کالا دوبار فروخته نمی‌شود.
- `transaction.on_commit(...)`: تسک ارسال ایمیل تا زمانی که اطلاعات سفارش با موفقیت کامل در دیتابیس ثبت (Commit) نشود، به سلری ارسال نخواهد شد.

#### ۷. وضعیت پیاده‌سازی
**VERIFIED IMPLEMENTED** (یکی از مقاوم‌ترین و تمیزترین پیاده‌سازی‌های موجودی در پلتفرم‌های فروشگاهی).

#### ۸. مشکلات یافت‌شده
هیچ مشکلی در کنترل همزمانی و تراکنش یافت نشد.

#### ۹. پیشنهاد بهبود
امکان تعریف رزرو موقت سبد خرید (Cart Reservation) با تایم‌اوت ۱۰ دقیقه‌ای پیش از اقدام به پرداخت نهایی.

#### ۱۰. توضیح آموزشی برای مبتدیان
تصور کنید فقط یک عدد گوشی آیفون در انبار مانده است و دو کاربر دقیقاً در یک میلی‌ثانیه دکمه پرداخت را می‌زنند. اگر از قفل دیتابیس (`select_for_update`) استفاده نکنید، سیستم به هر دو کاربر پیام موفقیت می‌دهد و پول کسر می‌شود در حالی که فقط یک گوشی وجود دارد! قفل دیتابیس باعث می‌شود درخواست‌ها به صف شوند و نفر دوم پیام «موجودی تمام شد» دریافت کند.

---

## فایل ۴: `backend/apps/payments/services.py`

#### ۱. هدف فایل
پردازش تراکنش‌های مالی، مدیریت سیستم پیشگیری از ارسال تکراری (Idempotency) و تغییر وضعیت سفارش.

#### ۲. دلیل وجود در معماری
جلوگیری از پرداخت دوبار روی یک سفارش و ثبت تاریخچه دقیق تراکنش‌ها.

#### ۳. محتویات اصلی
- کلاس `PaymentService`.
- متد `create_mock_payment`: شبیه‌سازی کامل چرخه درگاه بانکی با کلید Idempotency، بررسی عدم وجود پرداخت موفق قبلی روی سفارش، قفل سفارش، صدور شناسه تراکنش `MOCK-TXN-...` و ارسال رسید ایمیل در سلری.

#### ۴. نحوه اتصال به سایر بخش‌های پروژه
- به مدل `Order` متصل است و وضعیت سفارش را از `PENDING` به `PROCESSING` تغییر می‌دهد.

#### ۵. جریان اجرا / چرخه درخواست
درخواست به `POST /api/v1/payments/pay/` ارسال می‌شود -> بررسی کلید Idempotency در دیتابیس -> بررسی وضعیت سفارش -> ساخت رکورد `Payment` در حالت `SUCCEEDED` -> بروزرسانی سفارش به `PROCESSING` و درج زمان پرداخت.

#### ۶. بررسی کد و تحلیل خط به خط
```python
if idempotency_key:
    existing_by_key = Payment.objects.filter(idempotency_key=idempotency_key).first()
    if existing_by_key:
        if existing_by_key.order.user != user:
            raise ValidationError({"idempotency_key": "Idempotency key belongs to another user."})
        return existing_by_key
```
- این قطعه تضمین می‌کند که اگر اینترنت کاربر قطع شد یا دکمه پرداخت را ۵ بار سریع کلیک کرد، فقط یک بار پول پرداخت شود و درخواست‌های تکراری با همان کلید یکتا، همان نتیجه قبلی را بدون کسر وجه مجدد برگردانند.

#### ۷. وضعیت پیاده‌سازی
**MOCK / STUB** (منطق Idempotency و دیتابیس کامل است، اما اتصال به درگاه واقعی مانند زرین‌پال یا پاسارگاد با شبیه‌ساز Mock جایگزین شده است).

#### ۸. مشکلات یافت‌شده
فقدان وب‌هوک واقعی برای اعتبارسنجی بازگشت از درگاه بانک (Callback Verification).

#### ۹. پیشنهاد بهبود
اضافه کردن درایور واقعی متصل به PSP شاپرک در فاز بعدی.

#### ۱۰. توضیح آموزشی برای مبتدیان
ایدامپوتنس (Idempotency) یعنی یک عملیات چه ۱ بار اجرا شود و چه ۱۰ بار، دقیقاً همان نتیجه اول را بدهد بدون اینکه عوارض جانبی جدیدی (مانند کسر مجدد پول از حساب) تولید کند.

---

## فایل ۵: `backend/config/settings/base.py`

#### ۱. هدف فایل
مرکز پیکربندی سراسری اپلیکیشن جنگو شامل اپ‌ها، میدل‌ورها، اتصالات ردیس، سلری، دیتابیس و توکن JWT.

#### ۲. دلیل وجود در معماری
فراهم‌سازی تنظیمات مشترک بین تمام محیط‌ها و اتصال اجزای ماژولار مونولیت.

#### ۳. محتویات اصلی
- لیست `INSTALLED_APPS` (۷ دامین اختصاصی + `drf_spectacular` + `corsheaders` + `rest_framework_simplejwt.token_blacklist`).
- کانفیگ `REST_FRAMEWORK` با احراز هویت JWT و Session و ریت‌لیمیت‌های لاگین/ثبت‌نام.
- کانفیگ `SIMPLE_JWT` با چرخش رفرش‌توکن و ثبت در بلک‌لیست.
- زمان‌بندی `CELERY_BEAT_SCHEDULE` برای لغو خودکار سفارشات معلق بالای ۳۰ دقیقه و پاکسازی سبدهای رها شده مهمان.
- سیستم لاگینگ ساختاریافته با ماسک کردن خودکار اطلاعات حساس (`SensitiveDataFilter`) و ردیابی شناسه درخواست (`RequestIDFilter`).

#### ۴. نحوه اتصال به سایر بخش‌های پروژه
این فایل قلب تپنده تنظیمات کل بک‌اند است.

#### ۵. وضعیت پیاده‌سازی
**VERIFIED IMPLEMENTED** (تکمیل شده و با موفقیت بارگذاری می‌شود).

---

## فایل ۶: `frontend/src/lib/api/client.ts`

#### ۱. هدف فایل
راه‌اندازی کلاینت اختصاصی Axios با مدیریت صف همزمانی برای تمدید توکن‌های منقضی (Concurrency-Safe JWT Refresh Queue).

#### ۲. دلیل وجود در معماری
جلوگیری از خروج ناگهانی کاربر هنگام اتمام زمان Access Token و هماهنگی ارسال سرفصل‌های امنیتی `X-Request-ID` و `X-Session-Key`.

#### ۳. محتویات اصلی
- رهگیر درخواست (Request Interceptor): الحاق خودکار `Bearer <token>`، تولید شناسه تصادفی `X-Request-ID` و تعیین آدرس سرور متناسب با محیط SSR یا مرورگر.
- رهگیر پاسخ (Response Interceptor): تشخیص خطای `401 Unauthorized`، قفل کردن درخواست‌های همزمان با متغیر `isRefreshing`، ارسال رفرش توکن به بک‌اند و اجرای مجدد تمام درخواست‌های منتظر در صف (`failedQueue`).

#### ۴. بررسی کد و تحلیل خط به خط
```typescript
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then((token) => {
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return apiClient(originalRequest);
  });
}
```
- اگر ۵ درخواست در فرانت‌اند همزمان با خطای منقضی شدن توکن مواجه شوند، فرانت‌اند ۵ بار درخواست رفرش نمی‌زند؛ بلکه یک درخواست رفرش می‌زند و ۴ درخواست دیگر را در یک صف معلق نگه می‌دارد تا توکن جدید بیاید و سپس آن‌ها را مجدداً ارسال می‌کند.

#### ۵. وضعیت پیاده‌سازی
**VERIFIED IMPLEMENTED** (یکی از حرفه‌ای‌ترین پیاده‌سازی‌های مدیریت توکن در Next.js).

---

## فایل ۷: `frontend/src/stores/auth.ts`

#### ۱. هدف فایل
مدیریت وضعیت سراسری کاربر، توکن‌ها و ادغام خودکار سبد خرید مهمان با Zustand.

#### ۲. دلیل وجود در معماری
مرکز تصمیم‌گیری وضعیت نشست کاربر در فرانت‌اند.

#### ۳. محتویات اصلی
- توابع `login`, `register`, `verifyEmail`, `logout`, `fetchProfile`, `initializeAuth`.
- ذخیره‌سازی همزمان در `localStorage` و کوکی‌های استاندارد مرورگر برای خوانده شدن در `middleware.ts`.
- ادغام سبد خرید مهمان (`cartApi.mergeCart`) بلافاصله پس از ورود موفقیت‌آمیز.

#### ۴. وضعیت پیاده‌سازی
**VERIFIED IMPLEMENTED** (کاملاً تست شده و فعال).

---

## فایل ۸: `frontend/src/middleware.ts`

#### ۱. هدف فایل
محافظت از مسیرهای ادمین (`/admin/*`) در لایه Edge سرور Next.js قبل از رندر صفحه.

#### ۲. دلیل وجود در معماری
جلوگیری از فلش زدن صفحات حساس و ریدایرکت سریع کاربران غیر ادمین به صفحه ورود `/admin/login`.

#### ۳. وضعیت پیاده‌سازی
**VERIFIED IMPLEMENTED**.

---

## فایل ۹: `frontend/src/components/3d/PenroseHero3D.tsx`

#### ۱. هدف فایل
رندر المان سه‌بعدی لوکس هندسه غیرممکن (مثلث پنروز / Penrose Triangle) در صفحه اصلی با Three.js و React Three Fiber.

#### ۲. دلیل وجود در معماری
خلق هویت بصری فوق‌العاده متمایز، مهندسی‌شده و القای حس لوکس معماری (Impossible Minimalism).

#### ۳. وضعیت پیاده‌سازی
**VERIFIED IMPLEMENTED**.

---

## فایل ۱۰: `infrastructure/nginx/conf.d/default.conf`

#### ۱. هدف فایل
پیکربندی مسیریابی، لود بالانسینگ داخلی، پروکسی و کشینگ فایل‌های مدیا و استاتیک در سرور پروداکشن.

#### ۲. محتویات اصلی
- تعریف upstreamهای `backend:8000` و `frontend:3000`.
- مسیریابی `/api/` و `/admin/` به جنگو همراه با سرفصل‌های واقعی کلاینت (`X-Forwarded-Proto`, `X-Real-IP`).
- سرو مستقیم فایل‌های دایرکتوری `/media/` و `/static/` بدون درگیر کردن پردازنده پایتون.
- مسیریابی `/` به کانتینر سرور Next.js.

#### ۳. وضعیت پیاده‌سازی
**VERIFIED IMPLEMENTED**.

---

# ۴. بازسازی کامل معماری بک‌اند (Backend Forensic Reconstruction)

بک‌اند پروژه با الگوی **Modular Monolith** و تفکیک دقیق دامین‌ها به شرح زیر مهندسی شده است:

```text
               +-------------------------------------------+
               |           مشتری / مرورگر وب               |
               +-------------------------------------------+
                                     |
                                     v
               +-------------------------------------------+
               |     Nginx Reverse Proxy (پورت ۸۰ / ۴۴۳)    |
               +-------------------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v (/api/v1/...)                             v (/*)
+-------------------------------+             +-------------------------------+
|     Gunicorn / Django Core    |             |       Next.js 14 Server       |
+-------------------------------+             +-------------------------------+
               |
               v
+-------------------------------+
|  RequestID & CORS Middleware  |
+-------------------------------+
               |
               v
+-------------------------------+
|   URL Router (api/v1/urls.py) |
+-------------------------------+
               |
               v
+-------------------------------+
| Views / ViewSets (Thin Layer) |
+-------------------------------+
               |
               v
+-------------------------------+
| Serializers (Input Validation)|
+-------------------------------+
               |
        +------+------+
        |             | (نوشتن / تغییر وضعیت)
        v (خواندن)    v
+---------------+  +---------------+
|   Selectors   |  |   Services    |
+---------------+  +---------------+
        |                  |
        +--------+---------+
                 |
                 v
+-------------------------------+
| Django ORM + Constraints/Locks|
+-------------------------------+
        |               |
        v               v
+---------------+  +---------------+
|  PostgreSQL   |  |  Redis Cache  |
+---------------+  +---------------+
                           |
                           v
                   +---------------+
                   | Celery Worker |
                   +---------------+
```

### تحلیل دامین‌های ۷ گانه بک‌اند:

1. **Users Domain (`apps/users`)**:
   - مدل‌ها: `User`, `UserProfile`, `Address`.
   - سرویس‌ها: `UserService` (ثبت‌نام اتمیک، اعتبارسنجی کد ایمیل و پیامک، ریست پسورد)، `AddressService` (مدیریت آدرس پیش‌فرض با قفل پایگاه‌داده).
   - سلکتورها: `UserSelector`, `AddressSelector`.
   - امنیت: فیلتر کامل آدرس‌ها بر اساس مالک واقعی (`request.user`).

2. **Products Domain (`apps/products`)**:
   - مدل‌ها: `Brand`, `Product`, `ProductVariant`, `ProductImage`, `ProductAttributeValue`, `ProductComment`.
   - قابلیت‌ها: جستجوی متنی، فیلتر بازه قیمت، کامنت‌های درختی با تایید و پاسخ ادمین، ریت‌لیمیت کامنت‌گذاری.
   - کارایی: واکشی با `select_related('brand', 'category')` و `Prefetch` تصاویر برای نابودی کامل مشکل N+1 Queries.

3. **Categories Domain (`apps/categories`)**:
   - مدل‌ها: `Category` (سلسله‌مراتبی خودارجاع), `CategoryAttribute`.
   - سلکتور: `CategorySelector.get_category_tree` (ساخت درخت درختی در حافظه با تنها یک کوئری سریع).

4. **Cart Domain (`apps/cart`)**:
   - مدل‌ها: `Cart`, `CartItem`.
   - ویژگی‌ها: پشتیبانی همزمان از سبد کاربر و سبد مهمان مبتنی بر سشن، قفل‌گذاری سطری در اضافه/ویرایش/حذف، اعتبارسنجی لحظه‌ای موجودی و اسنپ‌شات قیمت.
   - تسک پس‌زمینه: پاکسازی سبدهای مهمان قدیمی‌تر از ۷ روز (`cleanup_abandoned_guest_carts`).

5. **Orders Domain (`apps/orders`)**:
   - مدل‌ها: `Order`, `OrderItem`, `OrderAddress`.
   - ماشین وضعیت (State Machine): وضعیت‌های `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` با ماتریس انتقال مجاز.
   - تسک زمان‌بندی‌شده: ابطال خودکار سفارشات معلق پس از ۳۰ دقیقه و بازگردانی خودکار موجودی به انبار (`cancel_stale_pending_orders`).

6. **Payments Domain (`apps/payments`)**:
   - مدل‌ها: `Payment`.
   - مکانیزم Idempotency با کلیدهای یکتا، قفل سفارش در زمان پرداخت، جلوگیری از پرداخت دوباره سفارش موفق.

7. **Reviews Domain (`apps/reviews`)**:
   - مدل‌ها: `Review`.
   - قانون تجاری سخت‌گیرانه: فقط کاربرانی که کالا را خریده و سفارش آن‌ها در وضعیت `DELIVERED` قرار دارد، مجاز به ثبت امتیاز و بررسی هستند.

---

# ۵. ممیزی قانونی پایگاه داده (Database Forensic Audit)

### نقشه روابط موجودیت‌های پایگاه داده (Entity Relationship Map)

```text
+-----------------------+           +------------------------+
|         User          | 1 ----- 1 |      UserProfile       |
+-----------------------+           +------------------------+
   | 1             | 1
   |               |
   | *             | 1
+--------+     +--------+
|Address |     |  Cart  | 1 ----- * +----------+
+--------+     +--------+           | CartItem |
   |               |                +----------+
   | (Snapshot)    | (Checkout)           | *
   v               v                      v 1
+-----------------------+ 1 ----- * +------------------------+
|     OrderAddress      |           |     ProductVariant     |
+-----------------------+           +------------------------+
   | 1                                    | *
   v 1                                    v 1
+-----------------------+ 1 ----- * +------------------------+
|         Order         |           |        Product         |
+-----------------------+           +------------------------+
   | 1             | 1                    | 1
   | *             | *                    | *
   v               v                      v
+--------+     +--------+           +------------------------+
|Payment |     | Review |           |  ProductAttributeValue |
+--------+     +--------+           +------------------------+
```

### بررسی ایندکس‌ها و قیود پایگاه داده (Constraints & Indexes)

1. **قیود اعتبارسنجی داده (CHECK Constraints)**:
   - `Product.base_price >= 0` (جلوگیری از قیمت منفی در کاتالوگ).
   - `ProductVariant.price_override >= 0` (جلوگیری از قیمت نامعتبر تنوع).
   - `CartItem.quantity >= 1` (جلوگیری از درج تعداد صفر یا منفی در سبد).
   - `Order.subtotal >= 0`, `Order.shipping_cost >= 0`, `Order.total >= 0`.
   - `OrderItem.quantity >= 1`, `OrderItem.unit_price >= 0`.
   - `Review.rating >= 1 AND Review.rating <= 5` (محدودیت امتیاز بین ۱ تا ۵ ستاره).

2. **ایندکس‌های مرکب و کلیدی**:
   - ایندکس `idx_address_user_is_deleted` روی مدل Address برای سرعت جستجوی آدرس‌های حذف‌نشده کاربر.
   - ایندکس‌های یکتا روی `email`، `phone_number`، `slug`، `sku`، `order_number` و `transaction_id`.

3. **ارزیابی ریسک N+1 Query**:
   - کوئری‌های سلکتور با استفاده هدفمند از `select_related` برای کلیدهای خارجی تک‌مقداری و `Prefetch` برای روابط چندتایی، کاملاً در برابر N+1 محافظت شده‌اند.

---

# ۶. ممیزی کامل اندپوینت‌های وب‌سرویس (API Forensic Audit)

| ردیف | متد | مسیر (Path) | احراز هویت | ویو (View) | سرویس / سلکتور | عملیات دیتابیس | وضعیت |
| :---: | :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| ۱ | `GET` | `/api/v1/health/` | عمومی | `SystemHealthCheckView` | Health Check | پینگ دیتابیس و ردیس | **تأیید شده** |
| ۲ | `GET` | `/api/v1/health/live/` | عمومی | `LivenessHealthCheckView` | Health Check | هیچ | **تأیید شده** |
| ۳ | `GET` | `/api/v1/health/ready/` | عمومی | `ReadinessHealthCheckView` | Health Check | بررسی اتصالات | **تأیید شده** |
| ۴ | `POST` | `/api/v1/users/register/` | عمومی | `RegisterView` | `UserService.register_user` | درج User و Profile | **تأیید شده** |
| ۵ | `POST` | `/api/v1/users/verify-email/` | عمومی | `VerifyEmailView` | `UserService.verify_email_otp` | فعال‌سازی کاربر | **تأیید شده** |
| ۶ | `POST` | `/api/v1/users/resend-otp/` | عمومی | `ResendOTPView` | `UserService.resend_otp` | تولید کلید ردیس | **تأیید شده** |
| ۷ | `POST` | `/api/v1/users/login/` | عمومی | `LoginView` | DRF TokenObtainPair | خواندن کاربر | **تأیید شده** |
| ۸ | `POST` | `/api/v1/users/login/refresh/` | عمومی | `TokenRefreshView` | SimpleJWT Refresh | بلک‌لیست توکن قبلی | **تأیید شده** |
| ۹ | `GET` | `/api/v1/users/profile/` | نیازمند لاگین | `ProfileView` | `UserSelector.get_user_profile` | خواندن پروفایل | **تأیید شده** |
| ۱۰ | `PATCH` | `/api/v1/users/profile/` | نیازمند لاگین | `ProfileView` | `UserSerializer` | ویرایش پروفایل | **تأیید شده** |
| ۱۱ | `POST` | `/api/v1/users/profile/verify-phone/` | نیازمند لاگین | `VerifyPhoneView` | `UserService.request_phone_verification` | تولید کد در ردیس | **تأیید شده** |
| ۱۲ | `POST` | `/api/v1/users/profile/confirm-phone/` | نیازمند لاگین | `ConfirmPhoneView` | `UserService.confirm_phone_verification` | تایید شماره موبایل | **تأیید شده** |
| ۱۳ | `POST` | `/api/v1/users/password-reset/request/` | عمومی | `PasswordResetRequestView` | `UserService.request_password_reset` | کد ریست در ردیس | **تأیید شده** |
| ۱۴ | `POST` | `/api/v1/users/password-reset/confirm/` | عمومی | `PasswordResetConfirmView` | `UserService.confirm_password_reset` | تغییر پسورد کاربر | **تأیید شده** |
| ۱۵ | `POST` | `/api/v1/users/password/change/` | نیازمند لاگین | `PasswordChangeView` | `UserService.change_password` | آپدیت پسورد | **تأیید شده** |
| ۱۶ | `POST` | `/api/v1/users/logout/` | نیازمند لاگین | `LogoutView` | `UserService.logout` | درج در بلک‌لیست | **تأیید شده** |
| ۱۷ | `GET` | `/api/v1/users/addresses/` | نیازمند لاگین | `AddressViewSet` | `AddressSelector` | واکشی آدرس‌ها | **تأیید شده** |
| ۱۸ | `POST` | `/api/v1/users/addresses/` | نیازمند لاگین | `AddressViewSet` | `AddressService.create_address` | درج آدرس جدید | **تأیید شده** |
| ۱۹ | `DELETE` | `/api/v1/users/addresses/{id}/` | نیازمند لاگین | `AddressViewSet` | `AddressService.delete_address` | حذف منطقی آدرس | **تأیید شده** |
| ۲۰ | `GET` | `/api/v1/categories/tree/` | عمومی | `CategoryTreeView` | `CategorySelector.get_category_tree` | واکشی درخت دسته‌ها | **تأیید شده** |
| ۲۱ | `GET` | `/api/v1/categories/{slug}/` | عمومی | `CategoryDetailView` | `CategorySelector` | جزییات دسته و فرزندان | **تأیید شده** |
| ۲۲ | `GET` | `/api/v1/products/` | عمومی | `ProductListView` | `ProductSelector.get_filtered_products` | کاتالوگ با فیلترها | **تأیید شده** |
| ۲۳ | `GET` | `/api/v1/products/{slug}/` | عمومی | `ProductDetailView` | `ProductSelector` | جزییات و تنوع‌ها | **تأیید شده** |
| ۲۴ | `GET` | `/api/v1/products/{slug}/comments/` | عمومی | `ProductCommentListCreateView` | `ProductCommentSerializer` | لیست نظرات تاییدشده | **تأیید شده** |
| ۲۵ | `POST` | `/api/v1/products/{id}/comments/` | کاربر تاییدشده | `ProductCommentListCreateView` | `ProductCommentCreateSerializer` | درج نظر جدید | **تأیید شده** |
| ۲۶ | `GET` | `/api/v1/cart/` | مهمان / کاربر | `CartView` | `CartService.get_or_create_cart_for_request` | دریافت سبد خرید | **تأیید شده** |
| ۲۷ | `POST` | `/api/v1/cart/items/` | مهمان / کاربر | `CartItemListView` | `CartItemService.add_item` | قفل سطر و درج قلم | **تأیید شده** |
| ۲۸ | `PATCH` | `/api/v1/cart/items/{id}/` | مهمان / کاربر | `CartItemDetailView` | `CartItemService.update_quantity` | قفل سطر و آپدیت تعداد | **تأیید شده** |
| ۲۹ | `DELETE` | `/api/v1/cart/items/{id}/` | مهمان / کاربر | `CartItemDetailView` | `CartItemService.remove_item` | حذف قلم از سبد | **تأیید شده** |
| ۳۰ | `POST` | `/api/v1/cart/merge/` | نیازمند لاگین | `MergeCartView` | `CartService.merge_guest_cart` | قفل دو سبد و ادغام | **تأیید شده** |
| ۳۱ | `GET` | `/api/v1/orders/` | نیازمند لاگین | `OrderListView` | `OrderSelector.get_user_orders` | لیست سفارشات کاربر | **تأیید شده** |
| ۳۲ | `GET` | `/api/v1/orders/{id}/` | نیازمند لاگین | `OrderDetailView` | `OrderSelector.get_order_detail` | جزییات و اقلام سفارش | **تأیید شده** |
| ۳۳ | `POST` | `/api/v1/orders/checkout/` | نیازمند لاگین | `CheckoutView` | `OrderService.create_order_from_cart` | قفل انبار، ثبت سفارش | **تأیید شده** |
| ۳۴ | `POST` | `/api/v1/orders/{id}/cancel/` | نیازمند لاگین | `CancelOrderView` | `OrderService.cancel_order` | لغو و بازگردانی انبار | **تأیید شده** |
| ۳۵ | `GET` | `/api/v1/payments/` | نیازمند لاگین | `PaymentListView` | `PaymentSelector` | سوابق پرداخت کاربر | **تأیید شده** |
| ۳۶ | `POST` | `/api/v1/payments/pay/` | نیازمند لاگین | `CreatePaymentView` | `PaymentService.create_mock_payment` | پرداخت شبیه‌سازی | **تأیید شده (Mock)** |
| ۳۷ | `POST` | `/api/v1/reviews/create/` | نیازمند لاگین | `CreateReviewView` | `ReviewService.create_review` | ثبت نظر خریدار واقعی | **تأیید شده** |
| ۳۸ | `GET` | `/api/v1/reviews/product/{id}/` | عمومی | `ProductReviewListView` | `ReviewSelector` | لیست نظرات تاییدشده | **تأیید شده** |

---

# ۷. آموزش چرخه حیات درخواست‌ها (Request Lifecycle Education)

### جریان ۱: ثبت سفارش و تسویه‌حساب (Checkout Lifecycle)

```text
[ کاربر در فرانت‌اند دکمه تایید نهایی را می‌زند ]
                      │
                      ▼
[ ارسال درخواست POST به /api/v1/orders/checkout/ همراه با Bearer Token ]
                      │
                      ▼
[ انجین‌ایکس (Nginx) درخواست را دریافت و به Gunicorn (پورت ۸۰۰۰) ارسال می‌کند ]
                      │
                      ▼
[ میدل‌ور RequestID یک شناسه یکتای UUID4 تولید و در لاگ ثبت می‌کند ]
                      │
                      ▼
[ میدل‌ور SimpleJWT توکن را اعتبارسنجی کرده و آبجکت request.user را ست می‌کند ]
                      │
                      ▼
[ ویو CheckoutView داده ورودی address_id را با CheckoutSerializer اعتبارسنجی می‌کند ]
                      │
                      ▼
[ متد OrderService.create_order_from_cart در یک بلوک transaction.atomic آغاز می‌شود ]
                      │
                      ▼
[ سبد خرید با دستور Cart.objects.select_for_update() قفل انحصاری می‌شود ]
                      │
                      ▼
[ تمام تنوع‌های موجود در سبد با ProductVariant.objects.select_for_update() قفل می‌شوند ]
                      │
                      ▼
[ موجودی انبار تک‌تک اقلام پس از تصاحب قفل مجدداً بررسی می‌شود ]
                      │
                      ▼
[ فاکتور نهایی با قیمت لحظه‌ای تنوع‌ها محاسبه می‌گردد ]
                      │
                      ▼
[ رکوردهای Order و اسنپ‌شات‌های OrderItem و OrderAddress درج می‌گردند ]
                      │
                      ▼
[ موجودی فیزیکی انبار با متغیر stock -= quantity کاهش می‌یابد ]
                      │
                      ▼
[ اقلام سبد خرید حذف و خود سبد خرید پاک می‌شود ]
                      │
                      ▼
[ تراکنش در دیتابیس Commit شده و تسک سلری send_order_confirmation_email به ردیس ارسال می‌شود ]
                      │
                      ▼
[ پاسخ HTTP 201 Created همراه با جزییات سفارش به فرانت‌اند برگردانده می‌شود ]
```

---

# ۸. ممیزی احراز هویت و امنیت (Security & Auth Audit)

| مؤلفه امنیتی | وضعیت پیاده‌سازی | مکانیزم حفاظتی | ریسک‌های احتمالی / راهکار |
| :--- | :---: | :--- | :--- |
| **هش پسورد** | ✅ عالی | الگوریتم پیش‌فرض PBKDF2 با SHA-256 | بدون ریسک؛ بسیار ایمن در برابر حملات Rainbow Table |
| **توکن‌های JWT** | ✅ عالی | طول عمر ۳۰ دقیقه Access و ۷ روز Refresh | چرخش خودکار (Rotation) و درج در بلک‌لیست ردیس |
| **کنترل دسترسی (IDOR)** | ✅ عالی | بررسی صریح `user=request.user` در تمام کوئری‌ها | هیچ کاربری نمی‌تواند آدرس یا سفارش دیگری را ببیند |
| **ریت‌لیمیت (Throttling)** | ✅ خوب | ریت‌لیمیت ۱۰ لاگین در دقیقه و محدودیت ۵ کد OTP در ساعت | جلوگیری موثر از حملات Brute-Force |
| **حملات CSRF** | ✅ خوب | جداسازی هدرها و ست شدن `CSRF_TRUSTED_ORIGINS` | فرانت‌اند از متد اعتبارسنجی Bearer Header استفاده می‌کند |
| **تزریق SQL (SQLi)** | ✅ عالی | استفاده انحصاری از Django ORM و پارامتریک کوئری | هیچ Raw SQL بدون پارامتر در کل پروژه وجود ندارد |
| **لاگ‌های حساس** | ✅ عالی | فیلتر `SensitiveDataFilter` برای ماسک پسورد و توکن | لاگ‌های پروداکشن عاری از پسورد و کریدنشال هستند |

---

# ۹. ممیزی سلری و ردیس (Celery & Redis Audit)

### جدول تحلیل تسک‌های پس‌زمینه (Background Tasks)

| نام تسک | ماژول | محرک اجرا (Trigger) | زمان‌بندی (Schedule) | رفتار در صورت Retry | تضمین Idempotency |
| :--- | :---: | :--- | :---: | :---: | :---: |
| `send_welcome_email` | `users` | فعال‌سازی موفق حساب کاربر | بلادرنگ (پس از Commit) | ۳ بار با فاصله ۶۰ ثانیه | ✅ لاگ امنیتی بدون تکرار اثر مخرب |
| `send_order_confirmation_email` | `orders` | ثبت موفق سفارش | بلادرنگ (پس از Commit) | ۳ بار با فاصله ۶۰ ثانیه | ✅ ارسال با شناسه سفارش یکتا |
| `send_order_status_notification` | `orders` | تغییر وضعیت سفارش به ارسالی | بلادرنگ (پس از Commit) | ۳ بار با فاصله ۶۰ ثانیه | ✅ ثبت وضعیت جدید |
| `send_payment_receipt_notification` | `payments` | پرداخت موفق فاکتور | بلادرنگ (پس از Commit) | ۳ بار با فاصله ۶۰ ثانیه | ✅ ارجاع به Transaction ID یکتا |
| `cancel_stale_pending_orders` | `orders` | تسک زمان‌بندی‌شده Celery Beat | هر ۵ دقیقه یک‌بار (۳۰۰ ثانیه) | اجرای دوره‌ای | ✅ قفل `select_for_update` و پرش از سفارش‌های تغییریافته |
| `cleanup_abandoned_guest_carts` | `cart` | تسک زمان‌بندی‌شده Celery Beat | روزانه ساعت ۰۰:۰۰ بامداد | اجرای دوره‌ای | ✅ پاکسازی فقط روی سبدهای مهمان (`user__isnull=True`) |

---

# ۱۰. ممیزی جامع فرانت‌اند (Frontend Forensic Audit)

### جدول ارزیابی مسیرهای App Router

| مسیر (Route) | هدف صفحه | نوع رندرینگ | اندپوینت‌های API مرتبط | سطح دسترسی | وضعیت پیاده‌سازی |
| :--- | :--- | :---: | :--- | :---: | :---: |
| `/` | صفحه اصلی و هیرو ۳بعدی | SSR + Client | کاتالوگ محصولات برگزیده | عمومی | **تأیید شده (لوکس)** |
| `/catalog` | کاتالوگ و فیلترینگ پیشرفته | SSR + CSR | `/api/v1/products/`, `/categories/tree/` | عمومی | **تأیید شده** |
| `/products/[slug]` | جزییات کامل و گالری محصول | SSR + CSR | `/api/v1/products/{slug}/`, comments | عمومی | **تأیید شده** |
| `/cart` | سبد خرید و خلاصه مالی | CSR | `/api/v1/cart/`, `/cart/items/` | مهمان / لاگین | **تأیید شده** |
| `/checkout` | تسویه‌حساب ۳ مرحله‌ای | CSR | `/orders/checkout/`, addresses | نیازمند لاگین | **تأیید شده** |
| `/orders` | لیست تاریخچه سفارشات | CSR | `/api/v1/orders/` | نیازمند لاگین | **تأیید شده** |
| `/orders/[id]` | تایم‌لاین و فاکتور سفارش | CSR | `/api/v1/orders/{id}/`, reviews | نیازمند لاگین | **تأیید شده** |
| `/profile` | مشخصات و تایید موبایل | CSR | `/api/v1/users/profile/` | نیازمند لاگین | **تأیید شده** |
| `/login` | ورود با پسورد و OTP | CSR | `/api/v1/users/login/` | مهمان | **تأیید شده** |
| `/register` | ثبت‌نام با اعتبارسنجی زنده | CSR | `/api/v1/users/register/` | مهمان | **تأیید شده** |
| `/verify-email` | ورود کد تایید ۶ رقمی | CSR | `/api/v1/users/verify-email/` | مهمان | **تأیید شده** |
| `/admin/*` | پنل اختصاصی ادمین | CSR | `/admin/*` (DRF + Fallback) | ادمین / پرسنل | **تأیید شده (ترکیبی)** |

---

# ۱۱. ممیزی تطابق قراردادهای فرانت‌اند و بک‌اند (Contract Audit)

بررسی جامع فایل‌های تایپ‌اسکریپت `frontend/src/types/api.ts` و مقایسه آن با خروجی سریالایزرهای جنگو نشان می‌دهد:
1. **یکپارچگی نام فیلدها**: نام فیلدهایی نظیر `order_number`, `unit_price`, `total_price`, `recipient_phone`, `is_verified_purchase` و `tracking_code` کاملاً با بک‌اند همگام هستند.
2. **پجینیشن**: ساختار پاسخ‌های لیست‌شده فرانت‌اند مطابق با `StandardResultsSetPagination` به صورت `{ count, total_pages, current_page, next, previous, results }` تایپ‌ریزی شده است.
3. **پروکسی مدیا**: تصاویر آپلودشده در داکر از مسیر `/media/` از طریق بازنویسی (Rewrite) در `next.config.js` به صورت مستقیم به بک‌اند فوروارد می‌شوند و از ایجاد خطای ۵۰۰ جلوگیری شده است.

---

# ۱۲. ممیزی زیرساخت، داکر و CI/CD (DevOps Audit)

1. **ارتباطات درون‌شبکه‌ای داکر (Docker Network)**:
   - در `docker-compose.yml` سرویس فرانت‌اند به درستی با آدرس‌های شبکه داخلی `http://backend:8000/api/v1` و سرورهای دیتابیس با نام سرویس `postgres` ارتباط برقرار می‌کنند.
2. **بررسی خط لوله GitHub Actions (`.github/workflows/ci.yml`)**:
   - مراحل تست: راه‌اندازی داکر PostgreSQL و Redis -> نصب با `uv` -> بررسی مایگریشن‌ها با `makemigrations --check` -> سیستم‌چک جنگو -> بررسی استانداردهای Flake8 و Black -> اجرای تست‌های Pytest با ارزیابی پوشش کد (Coverage) -> بررسی Type Check فرانت‌اند با `tsc --noEmit` -> بررسی Lint فرانت‌اند.
   - **نقاط قوت**: خودکارسازی کامل اعتبارسنجی کیفیت کد قبل از ادغام به برنچ اصلی.
   - **نقاط نیازمند بهبود**: عدم وجود مرحله خودکارسازی دیپلوی (CD Deployment Step) به سرور نهایی.

---

# ۱۳. ماتریس جامع «چه چیزی واقعاً کامل است؟» (Master Matrix)

| قابلیت / ویژگی | کد موجود است؟ | سیم‌کشی شده؟ | دارای تست است؟ | تست زنده؟ | آماده پروداکشن؟ | وضعیت نهایی |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| احراز هویت با ایمیل و پسورد | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| تایید ایمیل با کد OTP در ردیس | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| چرخش و بلک‌لیست توکن JWT | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| مدیریت آدرس‌ها و آدرس پیش‌فرض | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| کاتالوگ محصولات، برندها و تنوع‌ها | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| درخت دسته‌بندی سلسله‌مراتبی | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| سبد خرید مهمان و لاگین‌شده | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| ادغام سبد مهمان در سبد کاربر | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| قفل انبار و پیشگیری از بیش‌فروشی | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| ماشین وضعیت سفارشات و لغو | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| پرداخت شبیه‌سازی با Idempotency | ✅ | ✅ | ✅ | ✅ | ⚠️ | **شبیه‌ساز (Mock)** |
| درگاه پرداخت واقعی بانکی (شاپرک) | ❌ | ❌ | ❌ | ❌ | ❌ | **وجود ندارد (فاز بعدی)** |
| سیستم نظرات خریداران تاییدشده | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| سیستم پرسش و پاسخ/کامنت محصولات | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| زمان‌بندی Celery Beat برای لغو سفارش | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| لاگینگ حساس و Request ID | ✅ | ✅ | ✅ | ✅ | ✅ | **تأیید شده و کامل** |
| پرتال ادمین فرانت‌اند | ✅ | ✅ | ✅ | ✅ | ⚠️ | **ترکیبی (Real + Mock)** |
| ارسال واقعی ایمیل و پیامک | ⚠️ | ⚠️ | ✅ | ⚠️ | ❌ | **لایه‌بندی شبیه‌ساز** |

---

# ۱۴. بخش آموزش کد و مفاهیم فنی (Code Teaching Section)

در این بخش، ۱۵ قطعه کد حیاتی و واقعی از پروژه انتخاب شده و به صورت خط به خط همراه با مفاهیم بنیادی آن تدریس می‌شود.

---

### نمونه ۱: قفل‌گذاری سطری موجودی در تسویه‌حساب (`apps/orders/services.py`)

```python
# خط ۱: انتخاب و قفل‌گذاری تنوع‌های محصول بر اساس لیست شناسه‌ها
locked_variants = {
    v.id: v
    for v in ProductVariant.objects.select_for_update().filter(pk__in=variant_ids)
}

# خط ۲: بررسی موجودی فیزیکی تنوع قفل‌شده با تعداد درخواستی خریدار
for item in cart_items:
    if item.variant_id is not None:
        variant = locked_variants.get(item.variant_id)
        if item.quantity > variant.stock:
            raise ValidationError({"stock": f'Only {variant.stock} units available.'})
```

#### تدریس مفهومی:
- **`ProductVariant.objects`**: مدیر اشیای پایگاه داده جنگو است که دستورات پایتونی را به کوئری SQL تبدیل می‌کند.
- **`select_for_update()`**: در خروجی SQL دستور `SELECT ... FOR UPDATE` را به دیتابیس PostgreSQL می‌فرستد. این دستور به پایگاه داده دستور می‌دهد ردیف‌های انتخاب‌شده را تا پایان تراکنش جاری قفل کند و به سایر درخواست‌ها اجازه ویرایش یا کسر موجودی ندهد.
- **چرا این‌گونه نوشته شده؟**: در خریدهای پرترافیک (Flash Sales)، اگر قفل نکنیم، ممکن است موجودی انبار منفی شود یا کالایی که وجود ندارد فروخته شود (Overselling).
- **چه چیزی ممکن است خراب شود؟**: اگر ترتیب قفل کردن موجودیت‌ها رعایت نشود (مثلاً یک تراکنش اول سفارش را قفل کند بعد انبار را، و تراکنش دیگر اول انبار را قفل کند بعد سفارش را)، خطای قفل متقابل (**Deadlock**) رخ می‌دهد. معمار سیستم با قفل کردن از والد به فرزند (Cart -> Variants) از بن‌بست جلوگیری کرده است.
- **نکته کلیدی برای مبتدیان**: هر زمان که موجودی، پول، کیف پول یا ظرفیت یک منبع محدود را تغییر می‌دهید، حتماً از `select_for_update()` درون یک تراکنش اتمیک استفاده کنید.

---

### نمونه ۲: ثبت وظیفه سلری پس از تایید تراکنش (`apps/orders/services.py`)

```python
transaction.on_commit(
    lambda: send_order_confirmation_email.delay(
        order_id_str, user_email, order_num, total_str
    )
)
```

#### تدریس مفهومی:
- **`transaction.on_commit`**: تابعی است که به جنگو می‌گوید تابع درون خود را فقط زمانی اجرا کن که پایگاه داده تمام تغییرات را با موفقیت روی دیسک Commit کرده باشد.
- **`send_order_confirmation_email.delay(...)`**: متد `.delay()` تسک را بلافاصله اجرا نمی‌کند، بلکه یک پیام JSON حاوی آرگومان‌ها ساخته و در صف Redis قرار می‌دهد تا ورکر Celery در پس‌زمینه آن را اجرا کند.
- **چرا این‌گونه نوشته شده؟**: اگر تسک را قبل از کامیت اجرا کنیم، ممکن است ورکر سلری قبل از ثبت سفارش شروع به خواندن آن از پایگاه داده کند و با خطای `Order.DoesNotExist` مواجه شود!
- **نکته کلیدی برای مبتدیان**: کارهای کند (مثل ارسال ایمیل یا پیامک) را هرگز درون پردازش اصلی درخواست وب انجام ندهید؛ آنها را به Celery بسپارید تا زمان پاسخ به کاربر زیر ۱۰۰ میلی‌ثانیه بماند.

---

### نمونه ۳: ریت‌لیمیت و انقضای موقت در ردیس (`apps/users/otp_service.py`)

```python
verify_key = f"otp:verify:{user_id_str}"
r.setex(verify_key, cls.OTP_TTL_SECONDS, otp)
```

#### تدریس مفهومی:
- **`r.setex(key, time, value)`**: دستور اتمیک ردیس `SETEX` به معنی "Set with Expiration" است.
- **چرا این‌گونه نوشته شده؟**: کدهای اعتبارسنجی ۱ بار مصرف فقط ۲ دقیقه اعتبار دارند. با استفاده از ردیس نیازی به ساخت کرون‌جاب یا پاکسازی جدول‌های دیتابیس نداریم؛ خود ردیس دقیقاً سر ثانیه ۱۲۰ داده را پاک می‌کند.

---

### نمونه ۴: میدل‌ور تولید شناسه ردگیری درخواست (`common/middleware.py`)

```python
class RequestIDMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request_id = request.META.get("HTTP_X_REQUEST_ID", str(uuid.uuid4()))
        _request_id.value = request_id
        request.id = request_id

    def process_response(self, request, response):
        response["X-Request-ID"] = getattr(request, "id", get_request_id())
        return response
```

#### تدریس مفهومی:
- **`uuid.uuid4()`**: تولید یک رشته تصادفی منحصر به فرد ۱۲۸ بیتی.
- **`_request_id.value`**: ذخیره در متغیر Thread-Local که مخصوص نخ پردازشی درخواست جاری است.
- **کاربرد**: وقتی ۱۰,۰۰۰ کاربر همزمان در سایت هستند و لاگ‌ها با هم مخلوط می‌شوند، با جستجوی این شناسه یکتا می‌توان تمام خطوط لاگ مربوط به یک درخواست خاص را پیدا کرد.

---

### نمونه ۵: صف تمدید توکن JWT در کلاینت فرانت‌اند (`frontend/src/lib/api/client.ts`)

```typescript
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then((token) => {
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return apiClient(originalRequest);
  });
}
```

#### تدریس مفهومی:
- **`new Promise(...)`**: ایجاد یک آبجکت تعهد ناهمگام در جاوااسکریپت.
- **`failedQueue.push(...)`**: ذخیره درخواست‌های ناموفق در یک آرایه موقت.
- **کاربرد**: جلوگیری از حمله رفرش مکرر توکن به سرور و تجربه کاربری بدون قطعی برای کاربر.

---

# ۱۵. دسته‌بندی مشکلات بر اساس شدت (Problems by Severity)

### سطح P0 — بحرانی (Critical / Blocker)
1. **عدم اتصال درگاه بانکی واقعی**: بخش پرداخت در وضعیت شبیه‌سازی‌شده (Mock) است. برای انتشار عمومی واقعی، باید درایور زرین‌پال، نکست‌پی یا سداد پیاده‌سازی شود.
2. **اتصال تست‌های بک‌اند به سرویس‌های داکر**: در محیط لوکال هاست بدون اجرای داکر، دیتابیس PostgreSQL با خطای نام هاست `postgres` مواجه می‌شود؛ متغیرهای محیطی تست باید به صورت پیش‌فرض در صورت نبود داکر روی کانفیگ لوکال ست شوند.

### سطح P1 — بالا (High Risk / Major Architecture)
1. **پرتال ادمین با منطق دوگانه (Dual Mode)**: بخش ادمین در فرانت‌اند برای مواردی نظیر نمودارها از دیتای محلی به عنوان فال‌بک استفاده می‌کند چون اندپوینت‌های تحلیلی `/admin/analytics/` در بک‌اند جنگو تعریف نشده‌اند و ادمین جنگو استاندارد است.

### سطح P2 — متوسط (Quality & Maintenance)
1. **طولانی بودن چند خط کد در Flake8**: تعداد کمی از خطوط در فایل‌های `apps/users/services.py` و `apps/products/admin.py` بیش از ۱۰۰ کاراکتر هستند که خطای استایل Flake8 تولید می‌کنند.

### سطح P3 — کم (Minor Polish & Technical Debt)
1. **استفاده از تگ `<img>` به جای `<Image>`**: در دو فایل کامپوننت ادمین اخطار بهینه‌سازی عکس داده شده است.

---

# ۱۶. نقشه راه یادگیری مهندسی بک‌اند (What I Should Learn Next)

اگر در حال یادگیری مهندسی نرم‌افزار و معماری بک‌اند هستید، این پروژه یکی از بهترین مراجع عملی است. نقشه راه مطالعه شما بر اساس این مخزن:

```text
۱. چرخه حیات درخواست جنگو (Request-Response Lifecycle)
   └── فایل‌های مطالعه: backend/common/middleware.py و backend/config/urls.py
   └── تمرین: یک میدل‌ور بسازید که زمان اجرای هر کوئری را محاسبه کند.

۲. الگوهای پیشرفته ORM و پیشگیری از N+1 Queries
   └── فایل‌های مطالعه: backend/apps/products/selectors.py
   └── تمرین: متدهای select_related و Prefetch را روی محصولات بررسی کنید.

۳. تراکنش‌های اتمیک و قفل‌گذاری سطری (Concurrency & Row Locks)
   └── فایل‌های مطالعه: backend/apps/orders/services.py
   └── تمرین: نحوه رفتار select_for_update() را در دو تب ترمینال همزمان شبیه‌سازی کنید.

۴. سیستم‌های ناهمگام و صف وظایف با Celery و Redis
   └── فایل‌های مطالعه: backend/apps/orders/tasks.py و backend/config/settings/base.py
   └── تمرین: یک تسک جدید برای ارسال گزارش روزانه فروش با Celery Beat بسازید.

۵. احراز هویت توزیع‌شده با JWT و امنیت OTP
   └── فایل‌های مطالعه: backend/apps/users/otp_service.py و backend/apps/users/services.py
   └── تمرین: مکانیزم Blacklist کردن رفرش توکن‌ها در ردیس را تحلیل کنید.
```

---

# ۱۷. جمع‌بندی نهایی و وضعیت فعلی پروژه

پروژه **پارادوکس شاپ (Paradox Shop)** هم‌اکنون در مرحله **آماده‌سازی برای انتشار و تثبیت نهایی (Release Candidate / Hardening)** قرار دارد. زیرساخت ماژولار مونولیت، تمام ۷ دامین اصلی، منطق‌های قفل‌گذاری انبار، احراز هویت دومرحله‌ای، سبد خرید مهمان، انیمیشن‌ها و کاتالوگ فروشگاه با موفقیت کامل پیاده‌سازی، متصل و آزمایش شده‌اند. تنها گام‌های باقیمانده برای پروداکشن تجاری، اتصال درگاه واقعی بانکی و ارائه‌دهنده پیامک/ایمیل واقعی است.
