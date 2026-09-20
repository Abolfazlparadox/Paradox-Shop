# گزارش جامع پایداری، رفع خطاهای زمان اجرا و بهینه‌سازی عملکرد فرانت‌اند
## PARADOX SHOP — FRONTEND STABILITY & PERFORMANCE HARDENING

این مستند گزارش مهندسی تغییرات، ریشه‌یابی خطاها، جداسازی محیط‌های کانتینری، و بهینه‌سازی‌های عملکرد فرانت‌اند Next.js پروژه Paradox Shop است.

---

## ۱. خلاصه اجرایی (Executive Summary)

در این فاز مهندسی، تمرکز اصلی بر پایدارسازی کامل فرانت‌اند، رفع هشدارهای زمان اجرا (Runtime Warnings / Hydration Errors)، استانداردسازی معماری کانتینری توسعه و تولید، و ارتقای چشمگیر معیارهای عملکردی (Core Web Vitals) بدون ایجاد کوچک‌ترین تغییر در هویت بصری و دیزاین سیستم مینیمال پروژه بوده است.

### نتایج کلیدی:
* **حجم باندل اشتراکی اولیه (Shared First Load JS):** تنها **۸۷.۴ کیلوبایت** (کاهش چشمگیر و زیر سقف استاندارد ۲۰۰ کیلوبایت).
* **بیلد تولیدی (Production Build):** کامپایل موفق و بدون خطای تمامی **۴۰ مسیر (Routes)** در قالب `standalone`.
* **تست‌های خودکار (Automated Tests):** قبولی ۱۰۰٪ تمامی ۸ سوئیت تست و ۳۹ تست موجود (Vitest).
* **بررسی نوع داده و ساختار (Type & Lint Checks):** خروجی صفر خطا در `npx tsc --noEmit` و `npm run lint`.

---

## ۲. ریشه‌یابی و اصلاحات پایداری (Root Cause Analysis & Fixes)

### ۲.۱. جداسازی کامل محیط توسعه و تولید در Docker Compose
- **ریشه مسئله:** پیش از این، استفاده همزمان از یک فایل compose برای سناریوهای توسعه و تولید و اشتراک نامناسب پوشه `.next` بین هاست و کانتینر منجر به تداخل کش بیلد و خطاهای runtime در زمان سوئیچ بین حالت‌ها می‌شد.
- **اقدام انجام‌شده:**
  1. ایجاد فایل استاندارد `docker-compose.dev.yml` با تعریف والیوم‌های اختصاصی و دستور `npm run dev`.
  2. به‌روزرسانی `docker-compose.prod.yml` جهت دریافت متغیرهای `build args` و اجرای کانتینر سبک standalone.
  3. به‌روزرسانی مستندات `README.md` با دستورات استاندارد برای هر دو محیط.

### ۲.۲. متمرکزسازی متغیرهای محیطی (`src/lib/config.ts`)
- **ریشه مسئله:** پراکندگی دسترسی مستقیم به `process.env.NEXT_PUBLIC_API_URL` و `INTERNAL_API_URL` در بخش‌های مختلف کلاینت و سرور باعث ناسازگاری احتمالی آدرس‌های API در سناریوهای SSR کانتینری و کلاینت می‌شد.
- **اقدام انجام‌شده:**
  1. ایجاد ماژول متمرکز [src/lib/config.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/lib/config.ts) جهت تعریف متغیرهای محیطی با فال‌بک‌های ایمن و تعیین داینامیک URLها.
  2. به‌روزرسانی [client.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/lib/api/client.ts)، [sitemap.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/sitemap.ts) و [robots.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/robots.ts) برای استفاده از کانفیگ مرکزی.

### ۲.۳. رفع خطای React `forwardRef` در `WishlistItemCard` و `AnimatePresence`
- **ریشه مسئله:** در فریم‌ورک Framer Motion، زمانی که یک کامپوننت کاستوم فرزند مستقیم `<AnimatePresence>` باشد، برای پایش انیمیشن‌های خروج (Exit Animations) نیازمند دریافت `ref` است. کامپوننت `WishlistItemCard` بدون `forwardRef` پیاده شده بود که منجر به هشدار کنسول ری‌اکت می‌شد.
- **اقدام انجام‌شده:**
  - ریفکتور کامپوننت [WishlistItemCard.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/wishlist/components/WishlistItemCard.tsx) با استفاده از `React.forwardRef<HTMLDivElement, WishlistItemCardProps>` و اتصال آن به `<motion.div ref={ref}>`.

### ۲.۴. امنیت و پایدارسازی بارگذاری تصاویر (`next.config.js`)
- **اقدام انجام‌شده:**
  - تنظیم دقیق قوانین `remotePatterns` در [next.config.js](file:///d:/Project/GitHub/Paradox-Shop/frontend/next.config.js) شامل هاست‌های داخلی داکر (`backend`)، پورت‌های محلی، و دامنه‌های امن HTTPS.
  - حفظ بازنویسی داینامیک مسیرهای `/media/:path*` برای دسترسی روان کلاینت و سرور به فایل‌های آپلود شده.

---

## ۳. مهندسی عملکرد (Performance Engineering)

### ۳.۱. بهینه‌سازی بارگذاری المان سه‌بعدی Three.js
- کامپوننت هیرو سه‌بعدی (`PenroseHero3D`) با استفاده از `next/dynamic` با قابلیت `ssr: false` بارگذاری می‌شود تا باندل سنگین WebGL در مرحله هیدریشن اولیه صفحه اصلی قرار نگیرد.
- در طول بارگذاری، اسکلتون اختصاصی با ابعاد ثابت رندر می‌شود تا از هرگونه CLS (Cumulative Layout Shift) جلوگیری شود.

### ۳.۲. بهینه‌سازی اسکرول روان (Lenis Smooth Scroll)
- کنترل هوشمند اجرای Lenis در [SmoothScroll.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/layout/SmoothScroll.tsx):
  - غیرفعال‌سازی خودکار در دستگاه‌های لمسی (`pointer: coarse`).
  - احترام کامل به تنظیمات `prefers-reduced-motion`.
  - توقف خودکار در زمان باز بودن کشوی سبد خرید، منوی موبایل یا پنجره‌های Modal.
  - عدم اجرای سربار اسکرول روان در مسیرهای تعاملی ادمین و داشبورد (`/admin`, `/dashboard`, `/login`).

### ۳.۳. مدیریت هوشمند Custom Cursor
- نشانگر ماوس اختصاصی تنها در دستگاه‌های دسکتاپ با نشانگر دقیق (`(pointer: fine) and (hover: hover)`) فعال می‌شود.
- در صورت انتخاب کاهش حرکت توسط کاربر (`prefers-reduced-motion: reduce`)، این ویژگی بلافاصله غیرفعال می‌گردد.

---

## ۴. گزارش تست‌ها و اعتبارسنجی (Verification & Quality Gates)

| نوع بررسی | دستور اجرا شده | نتیجه | توضیحات |
| :--- | :--- | :--- | :--- |
| **Type Check** | `npx tsc --noEmit` | ✅ **Passed (Code 0)** | بدون هیچ‌گونه خطای تایپ در سطح کل پروژه |
| **Code Linting** | `npm run lint` | ✅ **Passed (Code 0)** | صفر هشدار و صفر خطا |
| **Unit & Integration Tests** | `npm test` (Vitest) | ✅ **۸/۸ فایل (۳۹/۳۹ تست)** | تمامی تست‌های روتین، دسترسی‌ها و جریان‌های خرید با موفقیت پاس شدند |
| **Production Build** | `npm run build` | ✅ **Passed (Code 0)** | تولید فایل‌های Standalone به همراه خروجی ۴۰ صفحه |

### خلاصه حجم صفحات در بیلد نهایی:
```text
Route (app)                              Size     First Load JS
┌ ○ /                                    7.55 kB         197 kB
├ ○ /products                            7.55 kB         198 kB
├ ƒ /products/[slug]                     12.2 kB         200 kB
├ ○ /cart                                7.42 kB         195 kB
├ ○ /checkout                            7.46 kB         202 kB
├ ○ /wishlist                            171 B           194 kB
└ ○ /admin/* (داشبوردها)                 ~5-13 kB        ~135-147 kB
+ First Load JS shared by all            87.4 kB
```

---

## ۵. راهنمای راه‌اندازی و اجرا (Deployment Commands)

### محیط توسعه (Development):
```bash
# با استفاده از Makefile
make up

# یا به صورت مستقیم
docker compose -f docker-compose.dev.yml up -d
```

### محیط شبیه‌ساز تولید (Production):
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
