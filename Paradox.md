### ۱. علت ارور Docker و نحوه برطرف شدن آن

اروری که هنگام `docker compose build` دریافت کردید:

```text
RUN curl -sSf https://astral.sh/uv/install.sh | sh
sh: 1: cannot open html: No such file or directory

```

#### دلیل ارور:

دستور `curl` سعی داشته اسکریپت نصب `uv` را از سایت `astral.sh` دانلود کند. به دلیل **محدودیت‌های شبکه / فیلترینگ / تحریم در ایران**، دامنه‌ی `astral.sh` مسدود شده یا صفحه خطای HTML (مانند ۴۰۳ یا صفحه پیوندها/فیلترینگ) برگردانده است. وقتی `curl` به‌جای اسکریپت Shell، کد HTML دانلود می‌کند و آن را به `sh` پاس می‌دهد، شل سعی می‌کند تگ‌های `<html...>` را اجرا کند و خطای `cannot open html` می‌دهد.

همچنین هشدار `version is obsolete` به این دلیل است که در نسخه‌های جدید Docker Compose (V2) خصیصه `version: '3.8'` منسوخ شده و نیازی به نوشتن آن در بالای فایل نیست.

#### کد اصلاح‌شده:

فایل‌های `Dockerfile.dev` و `Dockerfile` و `docker-compose.yml` به‌روزرسانی شدند. به جای دانلود با `curl` از سایت خارجی، اکنون `uv` را به‌طور مستقیم و امن از طریق `pip install uv` نصب می‌کنیم که بدون مشکل از مخازن پایتون دانلود می‌شود.

پروژه‌ی اصلاح‌شده مجدداً بسته‌بندی شد و می‌توانید فایل آپدیت‌شده را دانلود کنید:

* 📦 **دانلود پروژه اصلاح‌شده (v2)**: [shop-project-phase-1-foundation-v2.zip](https://drive.google.com/file/d/1QWyBYUY6tv3BOijN_IOKNIAFiOahqssA/view?usp=drivesdk)

---

### ۲. پاسخ به سوالات محیط مجازی (Virtual Environment) و requirements.txt

1. **آیا به Virtual Environment نیاز داریم؟**
* **در محیط Docker**: خیر! هر کانتینر Docker خودش یک ماشین و محیط کاملاً ایزوله است؛ بنابراین درون داکر نیازی به ساخت Virtual Environment دستی نیست.
* **برای اجرا بدون Docker (روی ویندوز خودتان)**: بله! اگر بخواهید کدها را مستقیماً روی ویندوز بدون داکر اجرا و ویرایش کنید، داشتن محیط مجازی الزامی است.


**کد ساخت Virtual Environment با `uv` در ویندوز (PowerShell)**:
```powershell
# ۱. نصب uv روی ویندوز (اگر نصب نیست)
pip install uv

# ۲. ورود به پوشه backend
cd backend

# ۳. ساخت محیط مجازی با uv
uv venv

# ۴. فعال‌سازی محیط مجازی در PowerShell ویندوز
.venv\Scripts\activate

# ۵. نصب تمام پکیج‌های پروژه از روی pyproject.toml
uv pip install -e .[dev]

```


2. **چرا `requirements.txt` نساختیم؟**
در پایتون مدرن (استاندارد PEP 518 / PEP 621)، فایل سنتی `requirements.txt` جای خود را به `pyproject.toml` داده است. ابزار `uv` نیز دقیقاً مانند `npm` در نودجی‌اس یا `Cargo` در راست، از فایل `pyproject.toml` (برای لیست پکیج‌ها) و `uv.lock` (برای قفل کردن نسخه دقیق پکیج‌ها) استفاده می‌کند.
اگر به هر دلیلی نیاز به یک فایل `requirements.txt` سنتی داشتید، می‌توانید با دستور زیر آن را از روی `pyproject.toml` تولید کنید:
```bash
uv pip compile pyproject.toml -o requirements.txt

```



---

### ۳. آیا عدم استفاده از دستور `django-admin startproject` مشکلی ایجاد می‌کند؟

**خیر، به هیچ وجه!**
دستور `django-admin startproject` کاری جادویی انجام نمی‌دهد؛ این دستور فقط ۴ فایل متنی پایتون ساده (`manage.py`, `settings.py`, `urls.py`, `wsgi.py`) ایجاد می‌کند.

جنگو یک فریم‌ورک کامپایل‌شونده نیست که به فایل‌های ساخت خاصی نیاز داشته باشد. جنگو تنها به دو چیز نیاز دارد:

1. فایل `manage.py` برای اجرای دستورات.
2. یک ماژول تنظیمات که متغیر `DJANGO_SETTINGS_MODULE` به آن اشاره کند.

ما تمام این فایل‌ها را با ساختاری بسیار استانداردتر و حرفه‌ای‌تر ایجاد کرده‌ایم.

---

### ۴. توضیح زیرساخت و ساختار پوشه‌ها به زبان کاملاً ساده

در پروژه‌های کوچک و آموزشی، همه کدها درون یک پوشه و یک فایل `settings.py` قرار می‌گیرند. اما در پروژه‌های بزرگ (مانند آمازون یا دیجی‌کالا)، اگر همه کدها یکجا باشند، پروژه به سرعت تبدیل به کدهای درهم‌تنیده و غیرقابل مدیریت (Spaghetti Code) می‌شود.

#### الف) چرا پوشه `settings` را تقسیم کردیم؟

تنظیمات لپ‌تاپ شما (محیط توسعه) با تنظیمات سرور واقعی (محیط تولید) متفاوت است:

* **`base.py`**: تنظیمات مشترک بین همه محیط‌ها (مانند نام دیتابیس، اپلیکیشن‌های نصب‌شده).
* **`development.py`**: تنظیمات لپ‌تاپ شما (`DEBUG = True` برای دیدن خطاها).
* **`production.py`**: تنظیمات سرور واقعی (`DEBUG = False` و تنظیمات امنیتی SSL).

#### ب) پوشه `apps/` چیست؟ (معماری Modular Monolith)

به جای مخلوط کردن کدهای همه بخش‌ها، پروژه را به **ماژول‌های تجاری مستقل** تقسیم کرده‌ایم:

* **`users/`**: تمام کدهای مربوط به کاربران، پروفایل و آدرس‌ها.
* **`products/`**: تمام کدهای مربوط به محصولات و ویژگی‌ها.
* **`categories/`**: دسته‌بندی محصولات.
* **`cart/`**: سبد خرید.
* **`orders/`**: ثبت و مدیریت سفارش‌ها.
* **`payments/`**: درگاه‌های پرداخت و تراکنش‌ها.
* **`reviews/`**: نظرات و امتیازات.

#### ج) فایل‌های درون هر ماژول (مثلاً درون `apps/products/`):

* **`models.py`**: تعریف جداول دیتابیس این بخش.
* **`serializers.py`**: تبدیل داده‌های جنگو به فرمت JSON (برای فرانت‌اند).
* **`views.py`**: دریافت درخواست‌ها (Requests) از وب‌سایت و ارسال پاسخ (Response).
* **`services.py`**: **منطق اصلی کسب‌وکار و تغییر داده‌ها** (مثلاً دستور کاهش موجودی انبار یا ایجاد سفارش).
* **`selectors.py`**: **منطق خواندن داده‌ها** (مثلاً کوئری برای دریافت ۱۰ محصول پرفروش).
* **`permissions.py`**: تعاریف دسترسی (مثلاً فقط خریداری که محصول را خریده می‌تواند نظر ثبت کند).
* **`urls.py`**: آدرس‌های وب مربوط به این ماژول.

#### د) پوشه `common/` چیست؟

کدهای عمومی و مشترکی که همه بخش‌ها به آن نیاز دارند:

* **`health.py`**: تست سلامت دیتابیس و ردیس.
* **`exceptions.py`**: نمایش یکدست و استاندارد خطاها به فرانت‌اند.
* **`logging.py`**: سیستم ثبت لاگ‌ها (با حذف خودکار پسوردها و اطلاعات حساس از لاگ).

---

### ۵. کانتینرهای Docker پروژه چیستند؟

معماری پروژه شامل **۶ کانتینر ایزوله** است که با `docker compose` اجرا می‌شوند:

```text
                           +------------------------+
                           |   Client / Browser     |
                           +-----------+------------+
                                       |
                           +-----------v------------+
                           |  Next.js (Frontend)    |
                           +-----------+------------+
                                       |
                           +-----------v------------+
                           |  Django (Backend API)  |
                           +---+----------------+---+
                               |                |
                +--------------+                +--------------+
                |                                              |
    +-----------v------------+                     +-----------v------------+
    | PostgreSQL Database    |                     |     Redis Store        |
    | (اطلاعات اصلی سیستم)   |                     | (حافظه کش و صف پیام‌ها) |
    +------------------------+                     +---+----------------+---+
                                                       |                |
                                           +-----------v----+      +----v-----------+
                                           | Celery Worker  |      | Celery Beat    |
                                           | (کارهای سنگین)  |      | (زمان‌بندی کارها)|
                                           +----------------+      +----------------+

```

1. **`shop_postgres` (PostgreSQL 16)**:
دیتابیس اصلی پروژه برای ذخیره دائمی کاربران، محصولات، سفارش‌ها و تراکنش‌ها.
2. **`shop_redis` (Redis 7)**:
حافظه موقت و پرسرعت برای سیستم Caching، مدیریت Sessionها و صف پیام‌های Celery.
3. **`shop_backend` (Django REST Framework)**:
سرور اصلی پایتون که درخواست‌های API فرانت‌اند را پردازش می‌کند.
4. **`shop_celery_worker` (Celery Worker)**:
پردازشگر پس‌زمینه. کارهای زمان‌بر (مانند ارسال ایمیل خوش‌آمدگویی، صدور فاکتور PDF یا استعلام از بانک) را بدون معطل کردن کاربر انجام می‌دهد.
5. **`shop_celery_beat` (Celery Beat)**:
زمان‌بند دوره‌ای کارهای پس‌زمینه (مانند پاکسازی سبدهای خرید رهاشده در پایان هر شب).
6. **`shop_frontend` (Next.js 14)**:
سرور فرانت‌اند که صفحات وب‌سایت را رندر کرده و به کاربر نمایش می‌دهد.

---

### ۶. جمع‌بندی و گام‌های شما برای تست پروژه

1. ابتدا فایل جدید **[shop-project-phase-1-foundation-v2.zip](https://drive.google.com/file/d/1QWyBYUY6tv3BOijN_IOKNIAFiOahqssA/view?usp=drivesdk)** را دانلود و آن را unzip کنید.
2. درون ترمینال ویندوز به پوشه پروژه بروید:
```powershell
cd Paradox-Shop
cp .env.example .env
docker compose build --no-cache
docker compose up -d

```


3. پس از بالامدن کانتینرها، می‌توانید سلامت سیستم را از طریق مرورگر چک کنید:
* **آدرس تست سلامت**: [http://localhost:8000/api/v1/health/](http://localhost:8000/api/v1/health/)
* **فرانت‌اند**: [http://localhost:3000/](http://localhost:3000/)

ساختار فایل‌های پروژه (Created File Structure)
shop-project/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── api/
│   │   └── v1/
│   │       └── urls.py
│   ├── apps/
│   │   ├── cart/
│   │   ├── categories/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── products/
│   │   ├── reviews/
│   │   └── users/
│   ├── common/
│   │   ├── exceptions.py
│   │   └── pagination.py
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── asgi.py
│   │   ├── celery.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── manage.py
│   └── pyproject.toml
├── docs/
│   ├── architecture/
│   │   └── overview.md
│   └── decisions/
│       ├── ADR-001-modular-monolith.md
│       └── ADR-002-technology-stack.md
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── globals.css
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
├── infrastructure/
│   └── nginx/
│       ├── conf.d/
│       │   └── default.conf
│       └── nginx.conf
├── tests/
│   ├── conftest.py
│   └── __init__.py
├── .dockerignore
├── .env.example
├── .gitignore
├── docker-compose.prod.yml
├── docker-compose.yml
├── LICENSE
├── Makefile
└── README.md