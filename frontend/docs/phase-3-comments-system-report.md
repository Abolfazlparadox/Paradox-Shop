# گزارش جامع پیاده‌سازی فاز ۳: سیستم دیدگاه‌ها و پرسش و پاسخ سلسله‌مراتبی محصولات (Hierarchical Product Comments System)

**پروژه:** فروشگاه پارادوکس (Paradox Shop)  
**نسخه / فاز:** Phase 3 — Threaded Product Comments & Admin Replies with Strict Privacy & Rate Limiting  
**تاریخ پیاده‌سازی:** ۲۲ اوت ۲۰۲۶ (۲ شهریور ۱۴۰۵)  
**وضعیت:** تکمیل شده و تست‌شده به صورت ۱۰۰٪ (Passed 73/73 Tests)

---

## ۱. خلاصه و اهداف پیاده‌سازی (Executive Summary)

در این فاز، سیستم تعاملی و پیشرفته دیدگاه‌ها و پرسش‌های فنی پیرامون محصولات با ویژگی‌های امنیتی و حریم‌خصوصی سازمانی طراحی و پیاده‌سازی شد. ویژگی‌های کلیدی این فاز شامل موارد زیر است:

1. **مدل‌سازی سلسله‌مراتبی (Threaded Comments Hierarchy):**
   - ایجاد ساختار درختی و پشتیبانی از پرسش‌های ریشه (Root Comments) و پاسخ‌های مستقیم و رسمی پرسنل/ادمین (Staff Replies).
2. **کنترل دسترسی و اعتبارسنجی چندمرحله‌ای (Access Control & Permissions):**
   - ارسال کامنت ریشه صرفاً برای کاربران لاگین‌شده و دارای حساب تاییدشده (`email_verified=True`) مجاز است.
   - ارسال پاسخ (Reply) به صورت انحصاری در اختیار مدیران و پرسنل آتلیه (`is_staff=True`) قرار دارد. تلاش کاربران عادی برای ارسال پاسخ به کامنت‌ها با خطای `403 Forbidden` متوقف می‌شود.
3. **حفظ حداکثری حریم خصوصی (Strict PII Privacy Protection):**
   - هیچ‌گونه داده حساسی نظیر ایمیل (`user.email`)، شماره تماس (`user.phone_number`) یا شناسه کاربری (User UUID) در پاسخ‌های عمومی API ارسال نمی‌شود.
   - نام نویسنده بر اساس نام و حرف اول نام‌خانوادگی، یا فرمت ماسک‌شده (`joh***`) نمایش می‌یابد و پرسنل با برچسب رسمی `(Atelier Support)` مشخص می‌شوند.
4. **جلوگیری از اسپم و سوءاستفاده (Scoped Rate Limiting):**
   - تراتل سفارشی اختصاصی با محدودیت حداکثر ۵ دیدگاه در هر ۱۰ دقیقه برای هر کاربر فعال شده است.
5. **رابط کاربری لوکس و تعاملی فرانت‌اند (Next.js 14 + React Query):**
   - کامپوننت مدرن `ProductComments.tsx` با شمارنده کاراکتر (`0/1000`)، تایمر معکوس کلاینت هنگام تراتل، بنرهای هوشمند ورود و تایید ایمیل، و فرم پاسخ مستقیم ویژه ادمین.

---

## ۲. تغییرات و ساختار بک‌اند (Backend Architecture & Implementation)

### ۲.۱. مدل داده `ProductComment` ([backend/apps/products/models.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/products/models.py))

```python
class ProductComment(UUIDPrimaryKeyMixin, TimestampMixin):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name=_("product"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_comments",
        verbose_name=_("user"),
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
        verbose_name=_("parent comment"),
    )
    content = models.TextField(_("content"))
    is_approved = models.BooleanField(_("is approved"), default=True, db_index=True)

    class Meta:
        verbose_name = _("Product Comment")
        verbose_name_plural = _("Product Comments")
        ordering = ["created_at"]
```

- **مایگریشن:** مایگریشن `apps/products/migrations/0003_productcomment.py` ایجاد و بر روی دیتابیس PostgreSQL اعمال شد.

---

### ۲.۲. سطوح دسترسی و تراتلینگ (Permissions & Throttles)

- **کلاس دسترسی `IsVerifiedUser` ([backend/apps/products/permissions.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/products/permissions.py)):**
  - بررسی می‌کند که کاربر لاگین بوده، فعال (`is_active=True`) و ایمیل حساب کاربری وی در پروفایل تایید شده باشد (`email_verified=True`).
- **تراتل سفارشی `CommentRateThrottle` ([backend/apps/products/throttling.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/products/throttling.py)):**
  - اعمال نرخ `5/600s` (حداکثر ۵ ارسال در هر ۶۰۰ ثانیه / ۱۰ دقیقه).

---

### ۲.۳. سریالایزرها و گارانتی عدم نشت داده (Serializers & Privacy Guarantees)

در [backend/apps/products/serializers.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/products/serializers.py):

- **`ProductCommentSerializer`:**
  - فیلدها: `id`, `author_name`, `is_staff_reply`, `content`, `created_at`, `replies`.
  - متد `get_author_name`:
    - پرسنل: `Farhad (Atelier Support)`
    - کاربر با نام: `Farhad M.`
    - کاربر بدون نام: پیشوند ایمیل ماسک‌شده `far***` (بدون افشای دامنه یا مشخصات ایمیل)
- **`ProductCommentCreateSerializer`:**
  - اعتبارسنجی طول محتوا (حداقل ۳ و حداکثر ۱۰۰۰ کاراکتر).
  - در صورت وجود `parent`:
    - بررسی اکید `request.user.is_staff == True` (رد درخواست با پیام امنیتی در صورت عدم دسترسی).
    - بررسی تطابق محصول والد با محصول جاری.
    - جلوگیری از تو در تویی بیش از یک سطح (پاسخ روی پاسخ قبلی مجاز نیست).

---

### ۲.۴. اندپوینت‌ها و روتینگ API ([backend/apps/products/urls.py](file:///d:/Project/GitHub/Paradox-Shop/backend/apps/products/urls.py))

- `GET /api/v1/products/<uuid:product_id>/comments/`: مشاهده لیست دیدگاه‌های تاییدشده به همراه پاسخ‌های درختی پرسنل (عمومی).
- `GET /api/v1/products/<slug:slug>/comments/`: مشاهده لیست دیدگاه‌ها بر اساس Slug محصول (عمومی).
- `POST /api/v1/products/<uuid:product_id>/comments/`: ارسال پرسش ریشه یا پاسخ ادمین (نیازمند کاربر تاییدشده).

---

## ۳. تغییرات و ساختار فرانت‌اند (Frontend Architecture & UI)

### ۳.۱. تایپ‌ها و کلاینت API
- **[frontend/src/types/api.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/types/api.ts):**
  - اضافه شدن اینترفیس‌های `ProductComment`, `ProductCommentReply`, `CreateProductCommentRequest` و اضافه شدن `is_staff?: boolean` به مدل `User`.
- **[frontend/src/lib/api/endpoints.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/lib/api/endpoints.ts):**
  - توابع `productsApi.getComments(productIdOrSlug)` و `productsApi.createComment(productId, data)`.

### ۳.۲. هوک‌های React Query ([frontend/src/features/product/queries/useProductComments.ts](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/product/queries/useProductComments.ts))
- هوک `useProductComments` با کلید کش `['productComments', productId]`.
- میوتیشن `useCreateProductComment` به همراه Invalidation خودکار کش جهت به‌روزرسانی آنی لیست کامنت‌ها پس از ثبت.

### ۳.۳. کامپوننت دیدگاه‌ها ([frontend/src/features/product/components/ProductComments.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/product/components/ProductComments.tsx))
- **طراحی بصری و هماهنگ با دیزاین سیستم Paradox:**
  - هدر جذاب با آیکون درخشان و شمارنده تعداد گفتگوها.
  - نمایش کامنت‌های ریشه همراه با آواتار بر اساس حروف اول نام نویسنده و برچسب تاریخ شمسی/میلادی دقیق.
  - باکس پاسخ رسمی پرسنل با نوار هایلایت رنگ اکسنت و بج `Atelier Support`.
  - فرم نگارش کامنت با شمارنده کاراکتر زنده `0 / 1000`.
  - تایمر معکوس کلاینت در زمان دریافت پاسخ ۴۲۹ از سرور (نمایش ثانیه‌شمار تا امکان ثبت مجدد).
  - بنرهای وضعیت کاربر:
    - بنر هدایت به لاگین برای کاربران مهمان.
    - بنر هشدار تایید ایمیل برای کاربرانی که ایمیل خود را تایید نکرده‌اند.
  - دکمه و فرم درون‌خطی پاسخ ویژه ادمین (فقط و فقط در صورتی که `user.is_staff === true` باشد رندر می‌شود).

### ۳.۴. ادغام در صفحه محصول ([frontend/src/features/product/components/ProductDetailView.tsx](file:///d:/Project/GitHub/Paradox-Shop/frontend/src/features/product/components/ProductDetailView.tsx))
- قرارگیری بخش `ProductComments` به همراه انیمیشن `ScrollReveal` در انتهای صفحه جزئیات هر محصول.

---

## ۴. نتایج آزمون‌های یکپارچگی (Test Suite & Verification Results)

مجموعه تست‌های یکپارچه‌سازی بک‌اند با اجرای دستور `pytest` در محیط داکر با **موفقیت ۱۰۰٪ (۷۳ از ۷۳ تست)** به پایان رسید:

```text
============================= test session starts ==============================
collected 73 items

tests/integration/test_cart_api.py .....                                 [  6%]
tests/integration/test_cart_tasks.py ....                                [ 12%]
tests/integration/test_categories_api.py ...                             [ 16%]
tests/integration/test_health_and_settings.py ....                       [ 21%]
tests/integration/test_notification_tasks.py ....                        [ 27%]
tests/integration/test_orders_api.py ....                                [ 32%]
tests/integration/test_orders_tasks.py ....                              [ 38%]
tests/integration/test_otp_and_auth_hardening.py .........               [ 50%]
tests/integration/test_payments_api.py ...                               [ 54%]
tests/integration/test_product_comments_api.py .......                   [ 64%]
tests/integration/test_products_api.py ......                            [ 72%]
tests/integration/test_reviews_api.py ...                                [ 76%]
tests/integration/test_security_and_auth.py .....                        [ 83%]
tests/integration/test_users_api.py ..........                           [ 97%]
tests/integration/test_notification_tasks.py .                           [ 98%]
tests/integration/test_health_and_settings.py .                          [100%]

============================= 73 passed in 19.78s ==============================
```

### اعتبارسنجی فرانت‌اند:
- **Lint & Type Check:** دستور `npm run lint && npx tsc --noEmit` با ۰ خطا و ۰ وارنینگ پاس شد.
- **Production Build:** دستور `npm run build` با ساخت موفق ۱۹ روت استاتیک و داینامیک کامل شد.

---

## ۵. راهنمای تست دستی و اجرای پروژه

### ۵.۱. اجرای سرویس‌ها در داکر
```bash
docker compose build
docker compose up -d
```

### ۵.۲. سناریوهای تست
1. **مشاهده دیدگاه‌ها بدون لاگین:**
   - ورود به صفحه هر محصول (مثلاً `/products/chrono-minimalist`).
   - مشاهده لیست دیدگاه‌ها و پاسخ‌های رسمی آتلیه. مشاهده بنر دعوت به ورود جهت طرح پرسش جدید.
2. **طرح پرسش توسط کاربر تاییدشده:**
   - ورود با یک حساب دارای ایمیل تاییدشده.
   - درج دیدگاه در باکس متنی و ارسال آن -> بلافاصله در بالای لیست گفتگوها نمایش داده می‌شود.
3. **تست تراتلینگ و شمارنده معکوس:**
   - ارسال متوالی ۵ دیدگاه توسط کاربر -> در تلاش ششم پیام خطای Throttled دریافت شده و دکمه تا اتمام تایمر غیرفعال می‌شود.
4. **پاسخ پرسنل:**
   - ورود با حساب ادمین یا ایجاد حساب دارای `is_staff=True`.
   - کلیک روی دکمه «Reply as Staff» زیر هر کامنت مشتری و ثبت پاسخ رسمی آتلیه.

---

## ۶. رفع باگ‌ها و اصلاحات تکمیلی (Post-Release Fixes & Hardening)

1. **رفع خطای `RelatedObjectDoesNotExist: User has no profile` در ارسال مجدد OTP:**
   - در `UserService.resend_otp` و متدهای فعال‌سازی، دسترسی مستقیم به `user.profile` ایمن‌سازی شد و از سیگنال `post_save` جهت ساخت خودکار رکورد پروفایل برای کاربران سیستمی/سوپریوزر استفاده گردید.
2. **رفع خطای ۴۰۰ هنگام ثبت نقد و ریتینگ محصول در سفارش‌های تحویل‌شده:**
   - در صفحه جزئیات سفارش (`orders/[id]/page.tsx`)، شناسه ارسال‌شده به مودال نقد از `item.id` (شناسه آیتم سفارش) به `item.product` (شناسه واقعی محصول) تصحیح شد.
   - استخراج پیام‌های خطا در `CreateReviewModal.tsx` بهبود یافت تا خطاهای اعتبارسنجی سرور به صورت واضح نمایش داده شوند.
3. **رفع وارنینگ `forwardRef` در کامپوننت `ToastCard`:**
   - کامپوننت `ToastCard` با `React.forwardRef` بازنویسی شد تا وارنینگ انیمیشن خروج فریمور موشن (`PopChild`) در کنسول برطرف گردد.
4. **نمایش دکمه پاسخ پرسنل (`Reply as Staff`) و ادغام در پنل ادمین جنگو:**
   - فیلدهای `is_staff` و `is_superuser` در `UserProfileSerializer` اضافه شدند تا وضعیت ادمین در استور کلاینت شناسایی شود.
   - بخش `ProductCommentInline` به صفحه محصول در جنگو ادمین اضافه شد تا مدیریت دیدگاه‌ها و پاسخ‌ها مستقیماً در کنسول مدیریت در دسترس باشد.
