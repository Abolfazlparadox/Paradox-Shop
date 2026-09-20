# لاگ و تاریخچه مهندسی بهینه‌سازی‌ها (Optimization Engineering Log) — فاز ۴.۶
**پروژه:** Paradox Shop  
**شاخه:** `feature/performance-load-testing`  

---

## فهرست رویدادها و اقدامات مهندسی

### رویداد ۱: استقرار زیرساخت‌های اندازه‌گیری و بنچ‌مارک
- **اقدام:** ایجاد پوشه `performance/load-tests/` و پیاده‌سازی اسکریپت‌های `public-api.js`, `catalog-flow.js`, `cart-flow.js`, `authenticated-api.js`.
- **دستور مدیریت داده آزمایشی:** ایجاد `seed_perf_data.py` برای تولید امن و پاکسازی داده‌های شبیه‌سازی‌شده بدون آلودگی پایگاه داده.
- **کامیت:** `920deb9` (`perf: add performance measurement infrastructure`).

### رویداد ۲: اصلاح طوفان کوئری N+1 در سیستم تخفیف‌ها
- **گلوگاه:** در `get_promotions_for_product` استفاده از `promo.included_products.values_list("id", flat=True)` باعث نادیده گرفتن `prefetch_related` و صدور کوئری جدید به ازای هر محصول و واریانت می‌شد (۱۰۵ تا ۲۷۵ کوئری در هر لود کاتالوگ).
- **اصلاح:** تبدیل به فیلتر در حافظه رم با استفاده از ست‌های پایتون: `{p.id for p in promo.included_products.all()}`.
- **نتیجه:** کاهش کوئری‌ها به ۸ کوئری ثابت ($O(1)$) و سقوط تأخیر P95 کاتالوگ از ۲,۴۴۵ میلی‌ثانیه به ۴۰۶ میلی‌ثانیه.

### رویداد ۳: اصلاح کوئری N+1 در لیست سفارشات کاربر
- **گلوگاه:** سریالایزر سفارشات برای فیلدهای `item_count` و `shipping_method` اقدام به واکشی جداگانه می‌کرد (۱۹ کوئری برای ۵ سفارش).
- **اصلاح:** افزودن `.annotate(annotated_items_count=Count("items"))` و `.select_related("shipment__shipping_method")` در `get_user_orders`.
- **نتیجه:** کاهش کوئری‌ها به ۲ کوئری ثابت.

### رویداد ۴: اصلاح نگاشت صفحه در نظرات
- **گلوگاه:** در View نظرات، ارجاع به `_paginator_page` به جای `page` صورت می‌گرفت که باعث شکست در واکشی دسته‌ای آرای کاربر می‌شد.
- **اصلاح:** جایگزینی با `getattr(self, "page", None)`.
- **نتیجه:** بازیابی دسته‌ای آرای کاربر در یک کوئری `IN (...)`.

### رویداد ۵: افزودن شاخص‌های پایگاه داده
- **اقدام:** افزودن ۵ ایندکس کامپوزیت روی جداول `Product`, `ProductImage`, و `Order`.
- **مایگریشن‌ها:** `products.0004` و `orders.0004` به صورت امن اجرا شدند.
- **کامیت:** `7e72e70` (`perf: optimize database and API bottlenecks`).

### رویداد ۶: بهینه‌سازی رندرر سه‌بعدی فرانت‌اند
- **اقدام:** تجهیز `PenroseHero3D.tsx` به `IntersectionObserver` و رویداد `visibilitychange` جهت توقف رندرر Three.js در حالت اسکرول یا تب پس‌زمینه؛ کلمپ DPR به ۱.۵.
- **کامیت:** `92a06d2` (`perf: optimize frontend performance and 3D rendering`).

### رویداد ۷: پوشش آزمون‌های رگرسیون عملکردی
- **اقدام:** ایجاد فایل `test_performance_and_queries.py` برای سنجش کران بالا بر روی کوئری‌های کاتالوگ، سفارشات، ساختار درختی و بررسی اندازه پی‌لود.
- **کامیت:** `cce41b1` (`test: add performance regression coverage`).
