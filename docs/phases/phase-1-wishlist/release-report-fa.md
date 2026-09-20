# گزارش انتشار فاز ۱ — لیست علاقه‌مندی‌ها و کالاهای ذخیره‌شده (Phase 1: Customer Wishlist & Saved Products)

---

## ۱. هدف فاز (Goal)
پیاده‌سازی یک ماژول کامل، پایدار و تولیدی (Production-Grade) برای ذخیره و مدیریت کالاهای مورد علاقه مشتریان (**Wishlist & Saved Products**) در پلتفرم **Paradox Shop**. این سیستم قابلیت استفاده برای کاربران مهمان (Session/LocalStorage) و کاربران احراز هویت شده را فراهم کرده و فرآیند ادغام خودکار علاقه‌مندی‌ها پس از ورود، انتقال مستقیم کالا از علاقه‌مندی به سبد خرید (Move to Cart)، دکمه‌های تعاملی با میکرواَنیمیشن‌های قلبی لوکس، و صفحات اختصاصی استورفرانت و داشبورد کاربری را پوشش می‌دهد.

---

## ۲. وضعیت قبلی (Previous State)
* هیچ‌گونه موجودیت یا مدل دیتابیسی برای لیست علاقه‌مندی‌ها در سیستم وجود نداشت.
* کاربران امکان علامت‌گذاری یا ذخیره محصولات برای خریدهای آینده را نداشتند.
* تعامل با کارت‌های محصول صرفاً به «مشاهده جزئیات» یا «افزودن مستقیم به سبد خرید» محدود بود.

---

## ۳. تصمیمات معماری (Architecture Decision)
1. **دامنه مجزا در معماری Modular Monolith (`apps.wishlist`)**:
   - ایجاد ماژول مستقل جنگو برای جداسازی مسئولیت‌ها و عدم دستکاری مدل هسته کاربر.
   - تفکیک کامل لایه‌های خواندن (`selectors.py`) و لایه‌های تغییر وضعیت و تراکنش (`services.py`).
2. **استراتژی دوگانه مهمان و کاربر احراز هویت شده**:
   - برای کاربران مهمان: ذخیره‌سازی محلی شناسه‌های کالا در `localStorage` با استور SSR-Safe Zustand.
   - برای کاربران وارد شده: ذخیره‌سازی دیتابیسی با هماهنگ‌سازی و کش سرور توسط TanStack Query.
   - ادغام خودکار (Auto-Merge) پس از لاگین بدون ایجاد آیتم تکراری.
3. **تضمین یکتایی در سطح پایگاه داده (Database Integrity)**:
   - اعمال محدودیت `UniqueConstraint(fields=['wishlist', 'product', 'variant'])` جهت ممانعت قطعی از ثبت آیتم‌های تکراری در شرایط همزمانی.

---

## ۴. تغییرات بک‌اند (Backend Changes)
* ایجاد ماژول `backend/apps/wishlist/`:
  - `models.py`: تعریف `Wishlist` و `WishlistItem` با فیلدهای UUID و Timestamp.
  - `selectors.py`: توابع `get_user_wishlist`، `get_wishlist_items` و `is_in_wishlist` با اعمال `prefetch_related` و `select_related`.
  - `services.py`: توابع اتمیک `add_to_wishlist`، `remove_from_wishlist`، `remove_by_product`، `clear_wishlist` و `merge_guest_wishlist`.
  - `serializers.py`: سریالایزرهای `WishlistSerializer`، `WishlistItemSerializer`، `WishlistProductSerializer` و `AddWishlistItemSerializer`.
  - `views.py`: ویوهای استاندارد REST با پشتیبانی کامل از مستندسازی OpenAPI.
  - `urls.py`: تعریف روت‌های استاندارد `api/v1/wishlist/`.
  - `admin.py`: کنترل پنل مدیریت ادمین جنگو برای نظارت بر لیست‌های علاقه‌مندی کاربران.
* ثبت `apps.wishlist` در `INSTALLED_APPS` و افزودن برچسب اختصاصی به تنظیمات `drf-spectacular`.

---

## ۵. تغییرات فرانت‌اند (Frontend Changes)
* **انواع داده‌ای و کلاینت API**:
  - افزودن تایپ‌های `Wishlist`, `WishlistItem`, `WishlistProduct`, `AddWishlistItemRequest` در `types/api.ts`.
  - ایجاد آبجکت `wishlistApi` در `lib/api/endpoints.ts`.
* **مدیریت وضعیت و هوک‌ها**:
  - `useGuestWishlistStore`: استور Zustand با قابلیت ذخیره‌سازی پایدار در مرورگر و مدیریت محیط SSR/Node.
  - `useWishlist`: هوک TanStack Query برای کوئری سرور، جهش‌های افزودن/حذف/پاکسازی/ادغام و بازخورد نوتیفیکیشن.
* **کامپوننت‌های رابط کاربری با طراحی لوکس (Engineered Luxury)**:
  - `WishlistButton.tsx`: دکمه قلب با انیمیشن فنری Framer Motion، حالت‌های فعال/غیرفعال، و عدم انتشار رویداد کلیک به کارت اصلی.
  - `WishlistItemCard.tsx`: کارت محصول ذخیره‌شده با تصویر، وضعیت انبار، قیمت، دکمه حذف و دکمه اختصاصی «انتقال به سبد خرید».
  - `WishlistView.tsx`: گرید واکنش‌گرا با انیمیشن خروج `AnimatePresence`، اسکلت لودینگ، و پیام راهنمای کاربران مهمان.
* **یکپارچه‌سازی در صفحات**:
  - افزودن دکمه علاقه‌مندی به `ProductCard.tsx` در کاتالوگ و صفحه اصلی.
  - افزودن دکمه علاقه‌مندی در صفحه جزئیات کالا `ProductDetailView.tsx`.
  - ایجاد صفحه عمومی `/wishlist` در استورفرانت.
  - ایجاد صفحه اختصاصی داشبورد `/dashboard/wishlist` و افزودن لینک در سایدبار `dashboard/layout.tsx`.
  - افزودن آیکون لیست علاقه‌مندی‌ها به همراه شمارنده زنده (Live Badge) در نوبار اصلی `Navbar.tsx` و منوی موبایل `MobileNav.tsx`.

---

## ۶. تغییرات دیتابیس (Database Changes)
* ایجاد مایگریشن اولیه:
  - `backend/apps/wishlist/migrations/0001_initial.py`
  - ایجاد جدول `wishlist_wishlist` (شناسه UUID، ارتباط یک‌به‌یک با جدول کاربر، تایم‌استمپ).
  - ایجاد جدول `wishlist_wishlistitem` (شناسه UUID، کلید خارجی به علاقه‌مندی و محصول و متغیر، ایندکس و قید یکتایی).
* اجرای موفقیت‌آمیز `migrate` روی PostgreSQL بدون هیچ‌گونه تداخل یا خطای معلق.

---

## ۷. تغییرات API (API Endpoints)
| متد | مسیر اندپوینت | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/wishlist/` | Authenticated | دریافت لیست کامل کالاهای ذخیره‌شده کاربر |
| `DELETE` | `/api/v1/wishlist/` | Authenticated | پاکسازی کل لیست علاقه‌مندی‌های کاربر |
| `POST` | `/api/v1/wishlist/items/` | Authenticated | افزودن کالا (و متغیر) به لیست علاقه‌مندی |
| `DELETE` | `/api/v1/wishlist/items/{id}/` | Authenticated | حذف یک آیتم مشخص بر اساس UUID |
| `POST` | `/api/v1/wishlist/items/remove-by-product/` | Authenticated | حذف مستقیم بر اساس شناسه محصول (پشتیبانی Toggle) |
| `POST` | `/api/v1/wishlist/merge/` | Authenticated | ادغام لیست محلی مهمان با حساب کاربر |
| `GET` | `/api/v1/wishlist/check/?product_id=...` | Authenticated | بررسی وجود یک محصول مشخص در لیست علاقه‌مندی |

---

## ۸. لاگینگ و پایش‌پذیری (Logging & Observability)
رویدادهای زیر با فرمت لاگینگ ساختاریافته در لاگر `commerce.wishlist` به همراه `user_id`, `product_id`, `wishlist_id` و `request_id` ثبت می‌شوند:
* `commerce.wishlist.created`
* `commerce.wishlist.item_added`
* `commerce.wishlist.item_removed`
* `commerce.wishlist.item_removed_by_product`
* `commerce.wishlist.cleared`
* `commerce.wishlist.merged`

---

## ۹. بررسی‌های امنیتی (Security Gate)
* **تفکیک و ایزولاسیون داده‌ای (IDOR Prevention)**: کاربران تنها به لیست علاقه‌مندی‌های متصل به حساب خود دسترسی دارند. تلاش برای حذف یا ویرایش آیتم کاربر دیگر با پاسخ `404 Not Found` مسدود می‌شود.
* **احراز هویت سرور**: تمام اندپوینت‌های ذخیره‌سازی سرور ملزم به احراز هویت معتبر با JWT (`IsAuthenticated`) هستند.
* **اعتبارسنجی وضعیت فعال کالا**: محصولات غیرفعال یا آرشیوشده امکان اضافه شدن به لیست علاقه‌مندی‌ها را ندارند (`404 Not Found`).

---

## ۱۰. بررسی کارایی و عملکرد (Performance Gate)
* بهینه‌سازی کوئری‌ها با `prefetch_related('items__product__images', 'items__variant')` که مانع از وقوع خطای N+1 در دریافت لیست علاقه‌مندی‌ها می‌گردد.
* حجم باندل صفحه `/wishlist` در بیلد پروداکشن Next.js تنها `169 B` (و `192 kB` First Load JS) بوده و عملکردی فوق‌العاده سبک و سریع دارد.
* به کارگیری کشینگ ۵ دقیقه‌ای در TanStack Query جهت کاهش بار سرور در ناوبری‌های مکرر بین صفحات.

---

## ۱۱. آزمون‌ها و نتایج (Test Results)

### ۱. آزمون‌های بک‌اند جنگو (`pytest -v`)
```text
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_unauthenticated_cannot_access_wishlist PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_get_empty_wishlist PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_add_product_to_wishlist PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_add_duplicate_product_to_wishlist PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_add_product_with_variant PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_remove_item_by_id PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_remove_item_by_product_toggle PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_clear_entire_wishlist PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_merge_guest_wishlist PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_check_product_in_wishlist PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_cross_user_isolation PASSED
tests/integration/test_wishlist_api.py::TestWishlistAPI::test_inactive_product_cannot_be_added PASSED

============================= 98 passed in 32.71s ==============================
```
**نتیجه بک‌اند: ۹۸ از ۹۸ آزمون (شامل ۱۲ تست یکپارچه جدید Wishlist) با موفقیت ۱۰۰٪ پاس شدند.**

### ۲. آزمون‌های فرانت‌اند
* `npm run lint` -> بدون هیچ‌گونه خطا یا هشدار (ESLint Clean).
* `npx tsc --noEmit` -> تایپ‌چک کامل TypeScript بدون خطا (0 Errors).
* `npm test` -> ۱۷ تست واحد و استور در ۴ سوئیت آزمون با موفقیت پاس شدند (`guest-wishlist.test.ts` شامل ۵ تست).
* `npm run build` -> ساخت بیلد کامل پروداکشن Next.js 14 با تولید تمام ۳۵ مسیر استاتیک و داینامیک.

### ۳. بررسی شمای OpenAPI
* `python manage.py spectacular --validate` -> تولید و اعتبارسنجی کامل اسکیما بدون کوچکترین هشدار.

---

## ۱۲. وضعیت داکر و زیرساخت (Docker Verification)
* تمام مدل‌ها و جداول جدید بر بستر کانتینر رسمی PostgreSQL 16 و وابستگی‌های پایتون همگام شده‌اند.

---

## ۱۳. بررسی ران‌تایم و جریان‌های کاربری (Runtime Verification)
جریان‌های زیر در ران‌تایم با موفقیت تست و تایید شدند:
1. **جریان کاربر مهمان (Guest Flow)**:
   - کاربر ناشناس در کاتالوگ روی آیکون قلب محصول کلیک می‌کند -> کالا ذخیره شده و نشانگر نوبار به ۱ تغییر می‌کند.
   - مراجعه به `/wishlist` -> نمایش کالای ذخیره‌شده به همراه بنر اطلاع‌رسانی سشن مهمان.
2. **جریان ورود و ادغام خودکار (Login & Auto-Merge Flow)**:
   - کاربر لاگین می‌کند -> بلافاصله رویداد ادغام کالاها فراخوانی شده، حافظه محلی پاک شده و آیتم‌ها در دیتابیس حساب کاربر ذخیره می‌شوند.
3. **جریان انتقال به سبد خرید (Move to Cart Flow)**:
   - کلیک روی دکمه «Move to Cart» در کارت علاقه‌مندی -> کالا به سبد خرید اضافه شده، سبد به‌روزرسانی شده و آیتم از لیست علاقه‌مندی حذف می‌گردد.

---

## ۱۴. فایل‌های تغییر یافته و ایجاد شده (Files Changed)
### بک‌اند:
* `backend/apps/wishlist/__init__.py` [جدید]
* `backend/apps/wishlist/apps.py` [جدید]
* `backend/apps/wishlist/models.py` [جدید]
* `backend/apps/wishlist/selectors.py` [جدید]
* `backend/apps/wishlist/services.py` [جدید]
* `backend/apps/wishlist/serializers.py` [جدید]
* `backend/apps/wishlist/permissions.py` [جدید]
* `backend/apps/wishlist/views.py` [جدید]
* `backend/apps/wishlist/urls.py` [جدید]
* `backend/apps/wishlist/admin.py` [جدید]
* `backend/apps/wishlist/migrations/0001_initial.py` [جدید]
* `backend/config/settings/base.py` [ویرایش: افزودن apps.wishlist و تگ اسکیما]
* `backend/api/v1/urls.py` [ویرایش: اتصال روت /api/v1/wishlist/]
* `backend/tests/integration/test_wishlist_api.py` [جدید: ۱۲ تست یکپارچه]

### فرانت‌اند:
* `frontend/src/types/api.ts` [ویرایش: افزودن انواع داده‌ای دامنه Wishlist]
* `frontend/src/lib/api/endpoints.ts` [ویرایش: افزودن کلاینت wishlistApi]
* `frontend/src/features/wishlist/stores/wishlist-store.ts` [جدید]
* `frontend/src/features/wishlist/hooks/use-wishlist.ts` [جدید]
* `frontend/src/features/wishlist/components/WishlistButton.tsx` [جدید]
* `frontend/src/features/wishlist/components/WishlistItemCard.tsx` [جدید]
* `frontend/src/features/wishlist/components/WishlistView.tsx` [جدید]
* `frontend/src/app/(shop)/wishlist/page.tsx` [جدید: روت فروشگاه]
* `frontend/src/app/(shop)/dashboard/wishlist/page.tsx` [جدید: روت داشبورد]
* `frontend/src/components/ui/ProductCard.tsx` [ویرایش: افزودن دکمه علاقه‌مندی]
* `frontend/src/features/product/components/ProductDetailView.tsx` [ویرایش: افزودن دکمه علاقه‌مندی]
* `frontend/src/components/layout/Navbar.tsx` [ویرایش: افزودن آیکون نوبار و منوی کاربر]
* `frontend/src/components/layout/MobileNav.tsx` [ویرایش: افزودن لینک منوی موبایل]
* `frontend/src/app/(shop)/dashboard/layout.tsx` [ویرایش: افزودن تب ناوبری داشبورد]
* `frontend/__tests__/wishlist/guest-wishlist.test.ts` [جدید: ۵ تست واحد]

### مستندات:
* `docs/decisions/ADR-001-wishlist.md` [جدید]
* `docs/releases/phase-1-wishlist-fa.md` [جدید]

---

## ۱۵. تغییرات وابستگی‌ها (Dependencies Changed)
* بدون نیاز به نصب پکیج جدید. از پکیج‌های موجود (`framer-motion`, `lucide-react`, `@tanstack/react-query`, `zustand`, `drf-spectacular`, `pytest-django`) استفاده شد.

---

## ۱۶. محدودیت‌های شناخته شده (Known Limitations)
* اشتراک‌گذاری عمومی لیست علاقه‌مندی‌ها با پیوند یکتا (Public Shareable Wishlist URL) در فازهای آتی محتوایی در نظر گرفته خواهد شد.

---

## ۱۷. راهنمای آزمون دستی (Manual Test Instructions)
1. **آزمون در حالت مهمان**:
   - به صفحه محصولات `http://localhost:3000/products` بروید.
   - روی دکمه قلب در بالای یکی از محصولات کلیک کنید.
   - مشاهده تغییر رنگ دکمه به قرمز با انیمیشن جهشی و افزایش عدد شمارنده در نوبار.
   - مراجعه به `http://localhost:3000/wishlist` و مشاهده کارت محصول ذخیره‌شده.
2. **آزمون ورود و ادغام**:
   - به صفحه `http://localhost:3000/login` رفته و با حساب کاربری وارد شوید.
   - مشاهده نوتیفیکیشن «Wishlist Synchronized».
   - مراجعه به `http://localhost:3000/dashboard/wishlist` و مشاهده محصولات ادغام‌شده در پنل کاربری.
3. **آزمون انتقال به سبد خرید**:
   - روی دکمه «Move to Cart» کلیک کنید.
   - باز شدن دراور سبد خرید و اضافه شدن کالا به سبد به همراه حذف از لیست علاقه‌مندی.

---

## ۱۸. شاخه گیت (Git Branch)
```text
feature/wishlist
```

---

## ۱۹. کامیت پیشنهادی (Recommended Commit)
```bash
git add backend/ frontend/ docs/
git commit -m "feat(wishlist): implement full customer wishlist domain, guest sync, and luxury UI"
```

---

## ۲۰. فاز بعدی (Next Phase)
**فاز ۲ — روش‌های ارسال و تحویل سفارش (Phase 2: Shipping & Delivery)**
* شاخه: `feature/shipping`
* اهداف: ایجاد ماژول `apps/shipping/`، متدهای ارسال (پیک اکسپرس، پست پیشتاز، باربری)، بازه‌های زمانی تحویل، محاسبه خودکار هزینه ارسال بر اساس شهر/استان و سقف ارسال رایگان، یکپارچه‌سازی با تسویه‌حساب (Checkout) و رهگیری وضعیت مرسوله.
