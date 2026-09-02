# ممیزی و طبقه‌بندی اسناد فنی پروژه پارادوکس شاپ (Documentation Forensic Audit)

> **هدف**: ارزیابی، صحت‌سنجی و برچسب‌گذاری دقیق کلیه مستندات موجود در مخزن بر مبنای تطابق با کدهای منبع و وضعیت زنده سیستم  
> **دسته‌بندی‌ها**:
> - `CURRENT`: کاملاً معتبر و منطبق بر آخرین وضعیت کدها و زمان اجرای پروژه.
> - `USEFUL`: سندی که از نظر تاریخی، معماری یا ارجاع مفید است اما نسخه ارتقایافته‌تر دارد.
> - `SUPERSEDED`: سندی که نسخه‌ای جدیدتر از آن (مانند مستندات فازهای بالاتر) نوشته شده و جایگزین آن شده است.
> - `OUTDATED`: سندی که حاوی اطلاعات یا آمارهای قدیمی است (نظیر شمارش قدیمی تست‌ها).
> - `DUPLICATE`: مستندی که محتوای تکراری با سند دیگری دارد.
> - `CONTRADICTORY`: سندی که ادعاهایی در تضاد با کدهای واقعی دارد.
> - `OBSOLETE`: سندی که کاملاً بی‌استفاده، منسوخ یا ناشی از اشتباه نام‌گذاری بوده است.

---

## ۱. جدول ممیزی تک‌تک اسناد مخزن

| مسیر سند | عنوان / محتوا | طبقه‌بندی | دلیل و تطابق با کدها | اقدام انجام‌شده |
| :--- | :--- | :---: | :--- | :--- |
| `docs/project-master-audit-fa.md` | گزارش جامع ممیزی (۲۳ آگوست ۲۰۲۶) | `SUPERSEDED` / `OUTDATED` | ادعای وجود ۷ دامین به جای ۱۰ دامین؛ آمار تست‌ها (۷۲ بک‌اند و ۷ فرانت‌اند) در حالی که اکنون ۱۳۹ بک‌اند و ۵۱ فرانت‌اند است. | نگهداری به عنوان مرجع تاریخی؛ جایگزین‌شده با `docs/audits/project-audit-fa.md`. |
| `docs/backend-audit.md` | ممیزی بک‌اند (۱۷ آگوست ۲۰۲۶) | `SUPERSEDED` | متعلق به فاز ۰ قبل از اضافه شدن ویش‌لیست، شیپینگ، پروموشن و ریویو. | آرشیو در `docs/phases/phase-0-baseline/backend-audit.md`. |
| `docs/frontend-release-report.md` | گزارش انتشار کاندیدای فرانت‌اند | `SUPERSEDED` | اشاره به ۵۷ تست بک‌اند قبل از فازهای ۳ و ۴. | آرشیو در `docs/phases/phase-0-baseline/frontend-release-report.md`. |
| `docs/implementation_plan-3md` | پلن پایانی هاردنینگ بک‌اند | `OBSOLETE` | غلط املایی در پسوند فایل (فاقد نقطه قبل از md) و محتوای موقت فاز ۰. | انتقال و تصحیح پسوند به `docs/phases/phase-0-baseline/implementation_plan-3.md`. |
| `docs/implementation_plan.md` | پلن بک‌اند فاز ۰ | `SUPERSEDED` | پلن اولیه فاز ۰ که پیاده‌سازی و نهایی شده است. | آرشیو در `docs/phases/phase-0-baseline/implementation_plan-1.md`. |
| `docs/implementation_plan-2.md` | پلن هاردنینگ بک‌اند فاز ۰ | `SUPERSEDED` | پلن میانی فاز ۰. | آرشیو در `docs/phases/phase-0-baseline/implementation_plan-2.md`. |
| `docs/walkthrough-3.md` | خلاصه عملکرد هاردنینگ سلری فاز ۰ | `SUPERSEDED` | گزارش میانی تکمیل سلری در فاز ۰. | آرشیو در `docs/phases/phase-0-baseline/walkthrough-3.md`. |
| `docs/task.md` | ترکر تسک‌های فاز ۰ | `SUPERSEDED` | کلیه تسک‌های تیک‌خورده فاز ۰. | آرشیو در `docs/phases/phase-0-baseline/task-tracker.md`. |
| `docs/decisions/ADR-001-wishlist.md` | تصمیم معماری ویش‌لیست | `DUPLICATE` (در شماره) | تداخل شماره با `ADR-001-modular-monolith.md`. | بازشماری به `ADR-004-wishlist-subsystem.md`. |
| `docs/decisions/ADR-002-shipping-and-delivery.md` | تصمیم لجستیک | `DUPLICATE` (در شماره) | تداخل شماره با `ADR-002-technology-stack.md`. | بازشماری به `ADR-005-shipping-and-delivery.md`. |
| `docs/decisions/ADR-004-reviews-and-qa-subsystem.md` | تصمیم سیستم نظرات | `USEFUL` | بازشماری به دلیل تقدم فاز پروموشن. | بازشماری به `ADR-007-reviews-and-qa-subsystem.md`. |
| `docs/decisions/ADR-006-promotions-and-discounts.md` | تصمیم موتور تخفیف | `CURRENT` | تکمیل خلأ مستندات معماری فاز ۳. | ایجاد سند جدید در `docs/decisions/`. |
| `docs/releases/phase-0-baseline-fa.md` | گزارش انتشار فاز ۰ | `CURRENT` (تاریخی) | مستند معتبر فاز ۰. | بایگانی و لینک در `docs/phases/phase-0-baseline/`. |
| `docs/releases/phase-1-wishlist-fa.md` | گزارش انتشار فاز ۱ | `CURRENT` (تاریخی) | مستند معتبر فاز ۱. | بایگانی و لینک در `docs/phases/phase-1-wishlist/`. |
| `docs/releases/phase-2-shipping-fa.md` | گزارش انتشار فاز ۲ | `CURRENT` (تاریخی) | مستند معتبر فاز ۲. | بایگانی و لینک در `docs/phases/phase-2-shipping/`. |
| `docs/releases/phase-promotions-*.md` (۵ فایل) | گزارشات پنج‌گانه فاز ۳ | `CURRENT` (تاریخی) | مستندات معتبر بک‌اند، فرانت، چک‌اوت و ادمین پروموشن. | بایگانی و لینک در `docs/phases/phase-3-promotions/`. |
| `docs/releases/phase-4-reviews-and-qa-fa.md` | گزارش انتشار فاز ۴ | `CURRENT` | آخرین مستند انتشار معتبر بر روی شاخه فعال جاری. | بایگانی و لینک در `docs/phases/phase-4-reviews-qa/`. |
| `PROJECT_CONTEXT.md` | کانتکست پرامپت پروژه در ریشه | `OUTDATED` | عدم ذکر دامین‌های shipping, promotions, wishlist. | اصلاح و به‌روزرسانی با واقعیت ۱۰ دامین و فاز ۴. |
| `README.md` | ریدمی ریشه مخزن | `OUTDATED` | مستندات قدیمی و نیازمند راهنمای داکر، دستورات تست و نقشه راه واقعی. | بازنویسی کامل با اطلاعات اثبات‌شده. |
