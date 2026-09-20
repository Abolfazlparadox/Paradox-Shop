# مستندات انتشار جامع — فاز ۴: زیرسیستم نظرات، تأیید خرید، پیوست‌های رسانه‌ای، سیستم پاسخ پرسنل و پرسش‌وپاسخ فنی (Q&A)

## ۱. نمای کلی و اهداف فاز ۴ (Executive Summary)
فاز ۴ با هدف استقرار یک زیرسیستم کامل، امن و منطبق بر استانداردهای کلاس سازمانی برای مدیریت **نظرات خریداران (Client Reviews)**، **تأیید خرید قطعی (Verified Purchase)**، **پیوست‌های چندرسانه‌ای (Media Attachments)**، **ماشین وضعیت بازبینی محتوا (Moderation Workflow)**، **پاسخ‌های رسمی آتلیه پارادوکس (Staff Responses)** و **پرسش‌وپاسخ فنی مستقل (Product Q&A Subsystem)** طراحی، پیاده‌سازی و تست گردید.

این زیرسیستم کاملاً مستقل از فرانت‌اند، با اقتدار قطعی سرور (Server Authority) و جداسازی کامل دامنه‌ها بر روی ساختار ماژولار مونولیت پیاده‌سازی شده است.

---

## ۲. مشخصات و دستاوردهای معماری (Architectural Achievements)

### ۲.۱. اقتدار سرور در اعتبارسنجی نشان خریدار قطعی (Verified Purchase Authority)
- اعتبارسنجی خریدار قطعی توسط `ReviewSelector.user_has_purchased_product` بر روی پایگاه داده بررسی می‌شود.
- شرط اعتبارسنجی: وجود رکورد `OrderItem` متناظر با کاربر جاری و محصول، در سفارشی با وضعیت `Order.OrderStatus.DELIVERED` (تحویل قطعی شده).
- کلاینت و فرانت‌اند هیچ‌گونه نقشی در مشخص کردن وضعیت خرید ندارند.

### ۲.۲. ماشین وضعیت بازبینی و چرخه ویرایش (Moderation State Machine & Re-moderation)
- وضعیت‌های نظر و پرسش: `PENDING` (در انتظار بررسی)، `APPROVED` (تأیید و انتشار عمومی)، `REJECTED` (رد شده همراه با درج دلیل)، `HIDDEN` (مخفی موقت).
- **قانون عدم دستکاری پس از تأیید**: هرگونه ویرایش بر روی یک نظرِ تاییدشده، بلافاصله وضعیت آن را به `PENDING` بازمی‌گرداند تا از ویرایش محتوا پس از تایید جلوگیری شود.
- محدودیت یکتا بودن: هر کاربر تنها می‌تواند یک نظر به ازای هر محصول ثبت کند (`unique_together = ['product', 'user']`).

### ۲.۳. پردازش غیرهمزمان تصاویر (Asynchronous Media Processing with Celery & Pillow)
- کاربر می‌تواند تا ۵ تصویر (JPEG/PNG/WebP، حداکثر ۵ مگابایت) پیوست کند.
- اعتبارسنجی اولیه فرمت با خواندن Magic Bytes و Pillow در سمت سرور انجام می‌شود.
- وظیفه پس‌زمینه `process_review_image_task` در سلری:
  1. فراداده‌های حساس (EXIF Data) شامل موقعیت مکانی و اطلاعات دستگاه را حذف می‌نماید.
  2. فرمت تصویر را بهینه‌سازی و تبدیل به WebP می‌کند.
  3. تصویر بندانگشتی (Thumbnail 400x400) ایجاد و در فیلد `thumbnail` ذخیره می‌کند.

### ۲.۴. سیستم رأی‌گیری مفید بودن و گزارش تخلف (Helpful Voting & Abuse Reporting)
- ثبت رأی مفید/غیرمفید با مدل `ReviewVote` و قید یکتایی `(review, user)`.
- کلید‌های شمارنده `helpful_count` و `unhelpful_count` با تراکنش اتمیک بروزرسانی می‌شوند.
- سیستم گزارش تخلف با مدل `ReviewReport` و `QuestionReport` جهت گزارش اسپم، توهین، تقلب یا تصاویر نامناسب با قابلیت بررسی و بستن توسط مدیران.

### ۲.۵. پاسخ‌های رسمی پرسنل آتلیه (Official Staff Responses)
- پاسخ‌های پرسنل از طریق مدل `ReviewResponse` و `QuestionAnswer` پیوند ۱-به-۱ می‌خورند.
- نشان رسمی **Paradox Atelier Team** در کنار نام مدیر، همراه با ارسال اعلان درون‌برنامه‌ای به کاربر (`UserNotification`).

### ۲.۶. کشینگ عملکردی بالا در ردیس (Redis Summary Caching)
- میانگین امتیاز، تعداد کل نظرات، تعداد خریداران قطعی، نظرات دارای تصویر و توزیع ستاره‌ها (۱ تا ۵ ستاره با درصد و تعداد) در ردیس کش می‌شوند (`review_summary:{product_id}`).
- به محض هرگونه تغییر وضعیت (تأیید، حذف، مخفی‌سازی)، کش به صورت رویدادمحور بی‌اعتبار و بازسازی می‌شود.

---

## ۳. قابلیت‌های فرانت‌اند و تجربه کاربری لوکس (Frontend & UX)

1. **نمودار هیستوگرام ستاره‌ها و امتیاز تجمیعی (`ProductReviews.tsx`)**:
   - نمایش امتیاز بزرگ طلایی (مثلاً `4.8`)، ستاره‌های درخشان، و درصد تفکیکی هر ستاره (۵★ تا ۱★).
   - کلیک بر روی هر میله درصد، لیست نظرات را بر اساس همان امتیاز فیلتر می‌کند.
2. **نوار فیلتر و مرتب‌سازی پیشرفته**:
   - فیلتر بر اساس امتیاز، خریداران قطعی، نظرات دارای عکس، و مرتب‌سازی (جدیدترین، بیشترین رأی مفید، بالاترین امتیاز، پایین‌ترین امتیاز).
3. **مودال ثبت نظر (`Write Review Modal`)**:
   - انتخاب‌گر ۵ ستاره انیمیشنی با برچسب‌های توصیفی ("بی‌نقص"، "بسیار خوب"، ...).
   - فیلد عنوان و متن نظر همراه با شمارنده کاراکتر.
   - سازنده تگ‌های پویا برای نکات مثبت (Strengths) و نکات منفی (Caution areas).
   - بارگذار تصویر با پیش‌نمایش آنی، اعتبارسنجی حجم و فرمت، و دکمه حذف تصویر.
4. **لایت‌باکس تمام‌صفحه تصاویر (`Lightbox Modal`)**:
   - باز شدن تصویر در حالت تمام‌صفحه با دکمه‌های بعدی/قبلی و نوار تصاویر بندانگشتی.
5. **زیرسیستم پرسش‌وپاسخ فنی (`ProductQA.tsx`)**:
   - لیست سوالات تایید شده همراه با پاسخ‌های رسمی کارشناسان آتلیه.
   - مودال "طرح سوال از کارشناسان آتلیه" و دکمه گزارش تخلف.
6. **داشبورد کاربری (`/dashboard/reviews`)**:
   - تب نظرات من با وضعیت لحظه‌ای (تایید شده، در حال بازبینی، رد شده همراه با دلیل رد).
   - تب سوالات من همراه با امکان مشاهده پاسخ کارشناسان و حذف سوال.
7. **مرکز کنترل و مدیریت مدیران (`/admin/reviews`)**:
   - تب صف نظرات با فیلتر وضعیت، فیلتر ستاره، پیش‌نمایش عکس‌ها، تایید، رد (با ثبت دلیل)، مخفی‌سازی و پاسخ مستقیم.
   - تب صف پرسش‌وپاسخ با امکان ثبت پاسخ رسمی و تایید خودکار.
   - تب گزارش‌های تخلف جامعه با دکمه‌های حل‌وفصل (Resolve) و رد گزارش (Dismiss).

---

## ۴. نتایج آزمون‌ها و اعتبارسنجی (Test & Validation Results)

### ۴.۱. آزمون‌های بک‌اند (Pytest)
```bash
docker exec shop_backend pytest
# Result: 141 passed in 37.00s (100% Green)
```
پوشش آزمون‌های جدید فاز ۴ در `tests/integration/test_reviews_and_qa_phase4.py` و `tests/integration/test_reviews_api.py`:
- اعتبارسنجی نشان خرید تایید شده تنها پس از سفارش تحویل داده شده.
- ماشین وضعیت بازبینی و ریست شدن وضعیت به `PENDING` در صورت ویرایش.
- مسدودسازی ثبت نظر تکراری توسط یک کاربر روی یک محصول.
- محاسبات و کشینگ ردیس در `summary`.
- سیستم پرسش‌وپاسخ و پاسخ‌های پرسنل.

### ۴.۲. آزمون‌های فرانت‌اند (Vitest)
```bash
npx vitest run
# Result: 51 passed in 732ms across 9 suites (100% Green)
```
شامل آزمون‌های اختصاصی `__tests__/reviews/reviews-qa-flow.test.ts`.

### ۴.۳. سلامت کد و بیلد فرانت‌اند
```bash
npx tsc --noEmit
# Result: 0 errors

npm run lint
# Result: 0 warnings, 0 errors
```

### ۴.۴. تطابق مستندات OpenAPI / Spectacular
```bash
docker exec shop_backend python manage.py spectacular --validate
# Result: Validation successful without schema errors
```

---

## ۵. خلاصه فایل‌های تغییر یافته و ایجاد شده

| بخش | مسیر فایل | توضیحات |
|---|---|---|
| **Backend Models** | `backend/apps/reviews/models.py` | تعریف مدل‌های `Review`, `ReviewImage`, `ReviewVote`, `ReviewReport`, `ReviewResponse`, `ProductQuestion`, `QuestionAnswer`, `QuestionReport` |
| **Backend Common** | `backend/common/models.py` | اضافه شدن مدل اعلان‌های کاربری `UserNotification` |
| **Backend Tasks** | `backend/apps/reviews/tasks.py` | وظیفه پس‌زمینه سلری برای تولید وب‌پی و تامب‌نیل و حذف اگزیف |
| **Backend Services** | `backend/apps/reviews/services.py` | سرویس‌های دامنه، اعتبارسنجی، تراکنش‌ها و ماشین وضعیت |
| **Backend Selectors**| `backend/apps/reviews/selectors.py` | کوئری‌های فیلترینگ، مرتب‌سازی، کشینگ ردیس و اهلیت خرید |
| **Backend Admin** | `backend/apps/reviews/admin_services.py` | اکشن‌های تایید، رد، مخفی‌سازی، پاسخ و حل گزارش‌ها |
| **Backend APIs** | `backend/apps/reviews/views.py` | اندپوینت‌های REST برای لیست، ثبت، ویرایش، رای، گزارش، خلاصه و پرسش‌ها |
| **Backend URLs** | `backend/apps/reviews/urls.py` & `backend/api/v1/admin_urls.py` | مسیریابی کامل مشتری و مدیریت |
| **Frontend Types** | `frontend/src/types/api.ts` | تایپ‌های کامل TypeScript نظرات، تصاویر، رای، پاسخ، خلاصه و سوالات |
| **Frontend APIs** | `frontend/src/lib/api/endpoints.ts` & `frontend/src/lib/api/admin.ts` | متدهای API برای کلاینت و ادمین |
| **Frontend Queries**| `frontend/src/features/product/queries/useProductReviews.ts` | هوک‌های TanStack Query فیلترینگ، ثبت، رای و گزارش |
| **Frontend UI** | `frontend/src/features/product/components/ProductReviews.tsx` | کامپوننت کامل و لوکس نظرات با هیستوگرام، مودال ثبت، لایت‌باکس و پاسخ پرسنل |
| **Frontend UI** | `frontend/src/features/product/components/ProductQA.tsx` | کامپوننت مستقل پرسش‌وپاسخ و پاسخ‌های کارشناس آتلیه |
| **Customer Dashboard**| `frontend/src/app/(shop)/dashboard/reviews/page.tsx` | صفحه مدیریت نظرات و پرسش‌های مشتری |
| **Admin Control** | `frontend/src/app/admin/reviews/page.tsx` | مرکز کنترل و صف بازبینی نظرات، پرسش‌ها و گزارش‌های تخلف |
| **Architecture ADR**| `docs/decisions/ADR-004-reviews-and-qa-subsystem.md` | سند تصمیمات معماری فاز ۴ |
| **Tests** | `frontend/__tests__/reviews/reviews-qa-flow.test.ts` | آزمون‌های واحد و یکپارچگی کلاینت فرانت‌اند |
| **Tests** | `backend/tests/integration/test_reviews_and_qa_phase4.py` | آزمون‌های جامع یکپارچگی بک‌اند |
