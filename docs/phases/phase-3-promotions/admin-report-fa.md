# مستندات انتشار: مرکز کنترل و مدیریت تخفیف‌ها و کوپن‌ها در پنل ادمین (Admin Promotions & Coupons Control Center)

## ۱. نمای کلی و معماری پیاده‌سازی شده

در این فاز، مرکز کنترل جامع، امن و پیشرفته مدیریت تخفیف‌ها، کوپن‌های تبلیغاتی (Vouchers) و تله‌متری گزارشات مالی تخفیف‌ها در پنل ادمین پارادوکس با رعایت دقیق اصول **Paradox Impossible Minimalism** پیاده‌سازی و یکپارچه‌سازی شد.

این سیستم شامل قابلیت‌های زیر است:
1. **مدیریت کمپین‌های تخفیف خودکار (`/admin/promotions`)**:
   - مشاهده لیست کامل پروموشن‌ها با اولویت، بازه زمانی و وضعیت فعالیت.
   - ایجاد و ویرایش کمپین‌های درصدی یا مبلغ ثابت با سقف تخفیف (Max Cap).
   - سوئیچ فعال/غیرفعال‌سازی آنی و حذف امن (بدون آسیب به لاگ‌های تاریخی سفارشات).
2. **مرکز صدور و نظارت کوپن‌های تبلیغاتی (`/admin/promotions/coupons`)**:
   - صدور کدهای تخفیف با فرمت استاندارد حروف بزرگ و شرایط حداقل سبد خرید.
   - تعیین سهمیه مصرف جهانی (`total_usage_limit`) و سهمیه به ازای هر کاربر (`per_user_usage_limit`).
   - تعریف جامعه هدف عمومی یا کاربران ویژه (VIP List).
   - کشوی بازرسی لاگ ردیم و استفاده‌های کوپن (`CouponUsagesDrawer`) با جزئیات مشتری، شماره سفارش، مبلغ و تاریخ.
3. **تله‌متری و گزارشات عملکرد تخفیف‌ها (`/admin/promotions/reports`)**:
   - تجمیع محاسباتی سرورساید (بدون پردازش‌های سنگین در کلاینت).
   - فیلترهای زمانی (امروز، ۷ روز، ۳۰ روز، ۹۰ روز و بازه سفارشی).
   - کارت‌های شاخص‌های کلیدی عملکرد (مجموع تخفیف‌های اعطا شده، درآمد حاصل از سفارشات تخفیف‌دار، تعداد ردیم کوپن‌ها، تعداد کمپین‌های فعال/منقضی).
   - لیدربورد کوپن‌های با بیشترین و کمترین میزان استفاده.
4. **توسعه پرونده سفارشات (`OrderDetailModal`)**:
   - نمایش قیمت اولیه (`original_unit_price`)، تخفیف پروموشن خط کالا (`discount_amount`) و برچسب نام پروموشن برای هر آیتم.
   - تفکیک جزئیات مالی سفارش: مجموع اقلام، تخفیف پروموشن، کد کوپن مصرف‌شده و تخفیف کوپن، هزینه ارسال و مبلغ نهایی تسویه.
5. **ناوبری و پالت دستورات (Command Palette & Sidebar)**:
   - افزودن گروه ناوبری جدید `Campaigns & Vault` به منوی ادمین با کنترل مجوزهای امنیتی (`promotions.view`).
   - شورت‌کات‌های دسترسی سریع در پالت فرامین (`G R` برای Promotions و `G V` برای Coupons).
6. **لاگ حسابرسی و سیستم نوتیفیکیشن ادمین**:
   - ثبت رویدادهای ایجاد، ویرایش و تغییر وضعیت پروموشن‌ها و کوپن‌ها در `AdminNotification` و `AuditLog`.

---

## ۲. مشخصات اندپوینت‌ها و مجوزها

### مجوزهای مورد نیاز
- مشاهده تخفیف‌ها و گزارشات: `promotions.view` یا دسترسی Superuser
- ایجاد، ویرایش، حذف و تغییر وضعیت: `promotions.manage` یا دسترسی Superuser

### اندپوینت‌های ادمین
| متد | مسیر | شرح |
|---|---|---|
| `GET / POST` | `/api/v1/admin/promotions/` | لیست و ایجاد کمپین‌های تخفیف خودکار |
| `GET / PATCH / DELETE` | `/api/v1/admin/promotions/<id>/` | دریافت جزئیات، ویرایش و حذف پروموشن |
| `POST` | `/api/v1/admin/promotions/<id>/toggle/` | تغییر وضعیت فعال/غیرفعال پروموشن |
| `GET` | `/api/v1/admin/promotions/reports/` | گزارشات تله‌متری و لیدربورد تخفیف‌ها (`?days=30` یا `?start_date=&end_date=`) |
| `GET / POST` | `/api/v1/admin/coupons/` | لیست و ایجاد کوپن‌های تخفیف |
| `GET / PATCH / DELETE` | `/api/v1/admin/coupons/<id>/` | دریافت جزئیات، ویرایش و حذف کوپن |
| `POST` | `/api/v1/admin/coupons/<id>/toggle/` | تغییر وضعیت فعال/غیرفعال کوپن |
| `GET` | `/api/v1/admin/coupons/<id>/usages/` | دریافت تاریخچه استفاده و رکوردهای ردیم کوپن |

---

## ۳. تغییرات فایل‌ها

### فرانت‌اند
- [AdminSidebar.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/admin/AdminSidebar.tsx): اضافه شدن گروه ناوبری `Campaigns & Vault`.
- [CommandPalette.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/admin/CommandPalette.tsx): فرامین ناوبری سریع پروموشن‌ها و کوپن‌ها.
- [OrderDetailModal.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/admin/OrderDetailModal.tsx): نمایش ریز تخفیفات آیتم‌ها، کوپن مصرفی و تفکیک مالی.
- [PromotionBuilderModal.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/admin/PromotionBuilderModal.tsx): فرم مودال ایجاد و ویرایش پروموشن با اعتبارسنجی مقادیر.
- [CouponBuilderModal.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/admin/CouponBuilderModal.tsx): فرم مودال صدور و ویرایش کوپن با سهمیه‌ها و جامعه هدف.
- [CouponUsagesDrawer.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/admin/CouponUsagesDrawer.tsx): کشوی بازرسی رکوردهای ردیم کوپن.
- [frontend/src/app/admin/promotions/page.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/admin/promotions/page.tsx): صفحه اصلی مدیریت پروموشن‌ها با فیلترها و جدول.
- [frontend/src/app/admin/promotions/coupons/page.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/admin/promotions/coupons/page.tsx): صفحه مدیریت کوپن‌ها.
- [frontend/src/app/admin/promotions/reports/page.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/admin/promotions/reports/page.tsx): داشبورد گزارشات و تله‌متری تخفیف‌ها.
- [frontend/src/hooks/useAdminData.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/hooks/useAdminData.ts): هوک‌های ری‌اکت‌کوئری و اینولیدیشن کش‌ها.
- [frontend/src/lib/api/admin.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/lib/api/admin.ts): متدهای کلاینت API پنل ادمین.
- [frontend/src/types/admin.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/types/admin.ts) & [frontend/src/types/api.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/types/api.ts): تایپ‌های کامل TypeScript.
- [promotions-admin.test.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/__tests__/admin/promotions-admin.test.ts): تست‌های واحد Vitest.

### بک‌اند
- [backend/apps/promotions/selectors.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/promotions/selectors.py): تجمیع دیتابیسی گزارشات در `PromotionReportSelector`.
- [backend/apps/promotions/serializers.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/promotions/serializers.py): سریالایزرهای گزارشات و لیدربورد.
- [backend/api/v1/admin_views.py](file:///d:/Project/GitHub/Paradox-Shop/backend/api/v1/admin_views.py) & [backend/api/v1/admin_urls.py](file:///d:/Project/GitHub/Paradox-Shop/backend/api/v1/admin_urls.py): ثبت اندپوینت گزارشات.
- [backend/apps/promotions/services.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/promotions/services.py): اتصال نوتیفیکیشن‌های ادمین و حسابرسی رویدادها.

---

## ۴. نتایج آزمون‌ها و کیفیت‌سنجی

1. **تست‌های فرانت‌اند (Vitest)**:
   - اجرای ۸ سوئیت تستی شامل ۳۹ آزمون با موفقیت کامل (`39 passed`).
2. **بررسی تایپ‌های TypeScript**:
   - اجرای `npx tsc --noEmit` با خروجی کاملاً پاک و بدون خطای نوع داده.
3. **لینتر کلاینت (Next Lint)**:
   - خروجی `✔ No ESLint warnings or errors`.
4. **بیلد پروداکشن کلاینت (Next Build)**:
   - تولید موفقیت‌آمیز ۴۰ مسیر استاتیک و دینامیک بدون هیچ خطایی.
5. **تست‌های بک‌اند (Pytest)**:
   - اجرای کامل ۱۳۴ آزمون ادغام با موفقیت (`134 passed in 32.61s`).
6. **بررسی یکپارچگی سیستم جنگو (`check`)**:
   - `System check identified no issues (0 silenced)`.
7. **اعتبارسنجی OpenAPI Schema (`spectacular --validate`)**:
   - اعتبارسنجی موفق بدون خطای ساختاری در کدهای اسپک.
