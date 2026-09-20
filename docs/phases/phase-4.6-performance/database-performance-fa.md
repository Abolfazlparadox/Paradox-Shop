# ممیزی و تحلیل عملکرد پایگاه داده (Database Performance & Query Optimization) — فاز ۴.۶
**پروژه:** Paradox Shop  
**موتور پایگاه داده:** PostgreSQL 16  
**ابزار سنجش:** Django Connection Queries Instrumentation & EXPLAIN ANALYZE  

---

## ۱. جدول سنجش کوئری‌های SQL و حذف الگوهای N+1

| اندپوینت | تعداد کوئری قبل | تعداد کوئری بعد | کاهش | نوع بهینه‌سازی اعمال‌شده |
|:---|:---:|:---:|:---:|:---|
| `/api/v1/products/` | ۱۰۵ تا ۲۷۵ | **۸ کوئری** ($O(1)$) | **-۹۲.۴٪ تا -۹۷.۱٪** | استفاده از اشتراک‌گذاری پروموشن‌های مقیم حافظه رم به جای کوئری روی روابط چندبه‌چند |
| `/api/v1/orders/` | ۱۹ کوئری | **۲ کوئری** ($O(1)$) | **-۸۹.۵٪** | حاشیه‌نویسی `Count("items")` در دیتابیس و پیش‌بارگذاری `select_related("shipment__shipping_method")` |
| `/api/v1/reviews/product/{id}/` | ۱ + N کوئری | **۴ کوئری** ($O(1)$) | **حذف کامل N+1** | اصلاح نگاشت صفحه در کانتکست سریالایزر و واکشی آرای کاربر در یک کوئری `IN (...)` |
| `/api/v1/categories/tree/` | ۱ کوئری | **۱ کوئری** | ۰٪ (از ابتدا بهینه) | ساخت سلسله‌مراتب درختی در حافظه اپلیکیشن |

---

## ۲. شاخص‌ها و ایندکس‌های جدید افزوده شده (Database Indexes)

برای تسریع عملیات فیلتر، مرتب‌سازی و جوین‌های پرتکرار، شاخص‌های کامپوزیت زیر تعریف و با مایگریشن‌های امن اعمال گردیدند:

### جدول `Product` (`apps/products/models.py`)
1. `prod_catalog_sort_idx`:
   - فیلدها: `(is_active, -is_featured, -created_at)`
   - کاربرد: شتاب‌بخشی به واکشی پیش‌فرض کاتالوگ فروشگاه (محصولات فعال، برگزیده و به ترتیب جدیدترین).
2. `prod_base_price_idx`:
   - فیلدها: `(base_price)`
   - کاربرد: تسریع فیلترینگ بازه قیمتی و مرتب‌سازی ارزان‌ترین/گران‌ترین.

### جدول `ProductImage` (`apps/products/models.py`)
3. `prod_img_primary_idx`:
   - فیلدها: `(product, is_primary)`
   - کاربرد: تسریع بازیابی تصویر کاور/شاخص در تمامی لیست‌ها و کارت‌های کاتالوگ.

### جدول `Order` (`apps/orders/models.py`)
4. `order_user_created_idx`:
   - فیلدها: `(user, -created_at)`
   - کاربرد: فیلتر سفارش‌های کاربر جاری به ترتیب تاریخ ثبت در داشبورد مشتری.
5. `order_status_created_idx`:
   - فیلدها: `(status, created_at)`
   - کاربرد: گزارش‌گیری پنل مدیریت و فیلتر بر اساس وضعیت سفارش.

---

## ۳. طرح‌های اجرایی کوئری (Execution Plans & EXPLAIN ANALYZE)
- در کوئری واکشی محصولات (`Product.objects.filter(is_active=True).order_by("-is_featured", "-created_at")`):
  - قبل: Sequential Scan با مرتب‌سازی در حافظه (Sort Method: quicksort, Memory: 42kB).
  - بعد: Index Scan using `prod_catalog_sort_idx` با زمان اجرا زیر ۰.۸ میلی‌ثانیه بدون نیاز به مرحله Sort جداگانه.
- در کوئری سفارشات کاربر:
  - استفاده از Bitmap Index Scan بر روی `order_user_created_idx`، کاهش شدید Buffer Reads و زمان اجرا زیر ۱.۲ میلی‌ثانیه.
