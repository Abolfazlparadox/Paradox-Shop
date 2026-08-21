# گزارش رفع خطاهای هیدریشن، انیمیشن فریمور موشن و هشدار LCP در فرانت‌اند (فاز ۱)

این سند خلاصه اقدامات مهندسی جهت حذف کامل هشدارهای کنسول مرورگر، خطاهای تطابق هیدریشن (Hydration Mismatch)، رفع هشدارهای انیمیشن رنگ در Framer Motion و بهینه‌سازی سرعت بارگذاری تصاویر (LCP) در پروژه **Paradox Shop** را شرح می‌دهد.

---

## ۱. خلاصه‌ی تغییرات اعمال‌شده

| بخش / مؤلفه | نوع مشکل | راهکار و تغییر اعمال‌شده | وضعیت |
| :--- | :--- | :--- | :--- |
| **`CustomCursor.tsx`** | هشدار انیمیشن رنگ در Framer Motion به دلیل استفاده از `currentColor` | جایگزینی مقدار `currentColor` با مقدار صریح RGBA (`rgba(255, 255, 255, 0.8)`) در خصیصه `borderColor` و همگام‌سازی استایل‌های مرزی | 🟢 رفع شد |
| **`CatalogFilters.tsx`** | ریسک خطای عدم تطابق هیدریشن React و ساختار دکمه‌های فیلتر | افزودن صریح `type="button"` به تمامی دکمه‌های تعاملی فیلتر و تضمین تطابق ۱۰۰٪ ساختار DOM سرور و کلاینت | 🟢 رفع شد |
| **`ProductCard.tsx` / `CatalogGrid.tsx` / `page.tsx`** | هشدار عدم اولویت‌دهی بارگذاری تصاویر شاخص (LCP Image Warning) | افزودن پراپ `priority` به `ProductCard` و فعال‌سازی آن برای ۳ محصول اول در بالای صفحه (Above-the-Fold) | 🟢 رفع شد |

---

## ۲. جزئیات فنی تغییرات

### ۲.۱. رفع خطای انیمیشن رنگ در `CustomCursor.tsx`
* **مسئله:** فریمور موشن (Framer Motion) نمی‌تواند مقادیر رشته‌ای نظیر `currentColor` را به صورت ریاضی به دیگر مقادیر رنگی (نظیر `rgba`) درون ترنزیشن اینترپولیت (Interpolate) کند و منجر به ثبت اخطار در کنسول مرورگر می‌شد.
* **راهکار:** مقدار `borderColor` در انیمیشن حالت فعال به صورت صریح با `rgba(255, 255, 255, 0.8)` و در حالت غیرفعال با `rgba(239, 68, 68, 0.6)` مقداردهی شد. همچنین استایل نشانگرها از مقادیر استاتیک و ایمن بهره‌مند شدند.

### ۲.۲. تضمین تطابق ۱۰۰٪ ساختار DOM در `CatalogFilters.tsx`
* **مسئله:** رندرهای کلاینت در صورت تفاوت در تایپ یا وضعیت دکمه‌ها ممکن است با DOM تولید شده در SSR ناهمخوان شوند.
* **راهکار:** تمامی المان‌های `<button>` درون `CatalogFilters.tsx` با ویژگی صریح `type="button"` مشخص شدند. ساختار واکنش‌گرا بر مبنای کلاس‌های کاربردی Tailwind CSS (`hidden lg:block` و `lg:hidden`) مدیریت می‌شود تا درخت DOM تولیدشده در SSR و کلاینت کاملاً یکسان باشد.

### ۲.۳. بهینه‌سازی LCP با اضافه کردن پراپ `priority`
* **مسئله:** کامپوننت `next/image` در صورت قرارگیری تصاویر در بالای خط برش صفحه (Above-the-Fold) بدون ویژگی `priority` هشدار LCP ثبت می‌کند.
* **راهکار:**
  1. اضافه شدن فیلد اختیاری `priority?: boolean` به اینترفیس `ProductCardProps`.
  2. ارسال مقدار `priority={idx < 3}` در شبکه‌ی کاتالوگ (`CatalogGrid.tsx`) و محصولات برگزیده‌ی صفحه اصلی (`page.tsx`) جهت بارگذاری پیش‌فرض و بی‌درنگ تصاویر شاخص اولیه.

---

## ۳. اعتبارسنجی و تست‌های سلامت

تمامی بررسی‌های استاتیک و ساخت محصول با موفقیت پشت سر گذاشته شدند:

```bash
# 1. بررسی اعتبارسنجی قوانین کدنویسی (Lint)
npm run lint
✔ No ESLint warnings or errors

# 2. بررسی کامل انواع داده در تایپ‌اسکریپت
npx tsc --noEmit
# خروجی بدون خطا (Exit code 0)

# 3. کامپایل و ساخت نهایی نسخه پروداکشن Next.js
npm run build
✓ Compiled successfully
✓ Generating static pages (17/17)
```

---

## ۴. راهنمای تست دستی در مرورگر (Testing Guide)

1. **بررسی کنسول مرورگر (Browser DevTools Console):**
   * صفحه اصلی ([http://localhost:3000/](http://localhost:3000/)) و صفحه کاتالوگ ([http://localhost:3000/products](http://localhost:3000/products)) را در مرورگر باز کنید.
   * کلید `F12` را فشرده و به تب **Console** بروید.
   * تأیید کنید هیچ خطایی با عنوان `Hydration failed because the initial UI does not match what was rendered on the server` یا اخطارهای Framer Motion مربوط به `currentColor` وجود ندارد.
2. **تست نشانگر ماوس سفارشی (Custom Cursor):**
   * نشانگر ماوس را روی لینک‌ها، دکمه‌ها و کارت‌های محصول حرکت دهید.
   * تغییر سایز و انیمیشن روان حلقه بدون هیچ لگ یا پیام خطایی را بررسی کنید.
3. **تست فیلترها و دراور واکنش‌گرا:**
   * در نمای دسکتاپ، فیلترهای کناری را بررسی کرده و دسته‌بندی‌ها را انتخاب کنید.
   * عرض صفحه را به زیر `1024px` کاهش داده و باز شدن منوی کشویی (Drawer) فیلترها را از طریق دکمه «Filters» تست کنید.
4. **تست بارگذاری تصاویر:**
   * به تب **Network** در DevTools بروید و فیلتر `Img` را فعال کنید.
   * تأیید کنید تصاویر شاخص محصولات اول با اولویت بالا (High Priority) بارگذاری می‌شوند.

---

## ۵. پیام کامیت و دستورات گیت (Commit Message & Git Commands)

### دستورات گیت برای ثبت تغییرات:

```bash
git add frontend/src/components/ui/CustomCursor.tsx \
        frontend/src/features/catalog/components/CatalogFilters.tsx \
        frontend/src/components/ui/ProductCard.tsx \
        frontend/src/features/catalog/components/CatalogGrid.tsx \
        frontend/src/app/page.tsx \
        frontend/docs/phase-1-fixes-report.md

git commit -m "fix(frontend): eliminate hydration mismatches, motion currentColor warnings, and optimize LCP images"
```

### شرح ساختاریافته کامیت (Commit Details):
```text
fix(frontend): eliminate hydration mismatches, motion currentColor warnings, and optimize LCP images

- Replace 'currentColor' with explicit RGBA interpolation values in CustomCursor motion config.
- Add explicit type="button" to interactive controls in CatalogFilters for strict SSR/client DOM consistency.
- Add priority prop to ProductCard and activate for above-the-fold cards in catalog and home page to eliminate LCP warnings.
- Add Phase 1 fixes documentation report.
```
