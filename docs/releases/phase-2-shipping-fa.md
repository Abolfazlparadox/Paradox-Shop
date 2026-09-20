# گزارش جامع انتشار فاز ۲ — روش‌های ارسال و تحویل مرسولات (Shipping & Delivery)
**پروژه فروشگاه تجارت الکترونیک لوکس پارادوکس (Paradox Shop)**  
**شاخه گیت:** `feature/shipping`  
**تاریخ تهیه:** ۴ شهریور ۱۴۰۵ (2026-08-26)  
**معماری:** ماژولار مونولیت جنگو ۵ + DRF + نکست‌جی‌اس ۱۴ (TypeScript, Tailwind, TanStack Query)

---

## ۱. اهداف و محدوده فاز ۲
هدف از اجرای این فاز، توسعه و راه‌اندازی زیرساخت کامل و سطح تولیدی مدیریت روش‌های ارسال، محاسبه هوشمند و پویای نرخ حمل‌ونقل بر مبنای موقعیت جغرافیایی (استان/شهر)، سقف ارسال رایگان، ادغام کامل با فرآیند تسویه‌حساب (Checkout)، و سامانه آنلاین و بلادرنگ رهگیری مرسولات پستی و پیک اختصاصی بود.

---

## ۲. خلاصه تغییرات معماری بک‌اند (`apps.shipping`)
- **مدل‌های داده‌ای ([models.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/shipping/models.py))**:
  - `ShippingMethod`: متدهای ارسال فعال (اکسپرس VIP، پیشتاز، باربری سنگین) با نرخ پایه، سقف ارسال رایگان و تخمین روزهای تحویل.
  - `ShippingZone`: تعریف مناطق جغرافیایی بر اساس استان‌ها و شهرها.
  - `ShippingZoneRate`: نرخ‌های مازاد یا بازنویسی‌شده برای هر منطقه جغرافیایی.
  - `Shipment`: رکورد فیزیکی مرسوله متصل به سفارش (`Order`) با کد رهگیری یکتای ایندکس‌شده (`PDX-XXXXXXXX`)، نام متصدی حمل و ماشین حالت ۵ مرحله‌ای (`pending`, `label_created`, `in_transit`, `out_for_delivery`, `delivered`, `failed`).
- **سلکتورها و سرویس‌ها ([selectors.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/shipping/selectors.py) & [services.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/shipping/services.py))**:
  - سرویس محاسبه دقیق و امن سمت سرور هزینه ارسال با بررسی خودکار مناطق و اعمال سقف ارسال رایگان.
  - ایجاد خودکار و اتمیک رکورد `Shipment` در زمان ثبت سفارش.
  - هماهنگ‌سازی وضعیت سفارش با تغییر وضعیت مرسوله (انتقال به `SHIPPED` و `DELIVERED`).
- **اندپوینت‌های RESTful**:
  - `GET /api/v1/shipping/methods/` — فهرست متدهای فعال همراه با محاسبه زنده هزینه بر اساس استان، شهر و مبلغ سبد.
  - `POST /api/v1/shipping/calculate/` — محاسبه دقیق نرخ ارسال برای مقصد مشخص.
  - `GET /api/v1/shipping/orders/{order_id}/shipment/` — دریافت وضعیت مرسوله سفارش مشتری.
  - `GET /api/v1/shipping/track/{tracking_code}/` — رهگیری عمومی مرسوله با کد بارکد.

---

## ۳. تغییرات فرانت‌اند و تجربه کاربری (Next.js)
- **کامپوننت‌های لوکس**:
  - [ShippingMethodSelector.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/shipping/components/ShippingMethodSelector.tsx): انتخابگر روش ارسال با کارت‌های تعاملی، انیمیشن Framer Motion، نشانگر تحویل رایگان و بازه زمانی تحویل.
  - [ShipmentTrackingCard.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/shipping/components/ShipmentTrackingCard.tsx): نوار پیشرفت ۵ مرحله‌ای استپر، امکان کپی کد رهگیری، نمایش متصدی حمل و تاریخ‌های میلادی/شمسی.
- **صفحات و ادغام‌ها**:
  - صفحه تسویه‌حساب ([checkout/page.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/%28shop%29/checkout/page.tsx)): انتخاب روش ارسال در مرحله ۲، محاسبه زنده هزینه حمل و ارسال `shipping_method_id` به سرور.
  - صفحه جزئیات سفارش ([orders/[id]/page.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/%28shop%29/dashboard/orders/%5Bid%5D/page.tsx)): نمایش زنده وضعیت مرسوله و رهگیری.
  - سامانه آنلاین رهگیری مرسولات ([track/page.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/app/%28shop%29/track/page.tsx)): روت مستقل `/track` با جستجوی سریع کد رهگیری.
  - اضافه شدن پیوند رهگیری به [Navbar.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/layout/Navbar.tsx) و [MobileNav.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/components/layout/MobileNav.tsx).

---

## ۴. نتایج اعتبارسنجی کیفی (Release Gates)

1. **تست‌های بک‌اند جنگو (Pytest)**:
   - **۱۰۶ از ۱۰۶ تست با موفقیت ۱۰۰٪ پاس شدند** (۸ تست اختصاصی جدید در `test_shipping_api.py`).
2. **تست‌های فرانت‌اند (Vitest)**:
   - **۲۱ از ۲۱ تست در ۵ فایل تست پاس شدند** (۴ تست جدید در `shipping-flow.test.ts`).
3. **بررسی انواع تایپ‌اسکریپت**:
   - `npx tsc --noEmit` با **۰ خطا** اجرا گردید.
4. **بررسی استاندارد کد (ESLint)**:
   - `npm run lint` با **۰ خطا و ۰ اخطار** به پایان رسید.
5. **بیلد پروداکشن Next.js**:
   - تولید موفق تمامی **۳۶ روت** استاتیک و داینامیک برنامه (`/track` با حجم بهینه ۳.۴۱ کیلوبایت).
6. **اعتبارسنجی OpenAPI Schema**:
   - تایید کامل اسکیما توسط `drf-spectacular`.

---

## ۵. تصمیمات معماری (ADR)
مستند [ADR-002-shipping-and-delivery.md](file:///d:/Project/GitHub/Paradox-Shop/docs/decisions/ADR-002-shipping-and-delivery.md) ایجاد گردید.
