# ماتریس جامع اندپوینت‌های رابط برنامه‌نویسی پارادوکس شاپ (Authoritative API Inventory)

> **منبع حقیقت استخراج**: مستندات OpenAPI 3.0 زنده سرور داکر (`/api/schema/`) و روت‌های رسمی `backend/api/v1/urls.py`  
> **تعداد کل اندپوینت‌های شناسایی‌شده**: ۸۲ اندپوینت  
> **پیش‌وند پایه**: `/api/v1`

---

## ۱. سلامت سیستم و زیرساخت (System Health)

| متد | آدرس اندپوینت | احراز هویت | مجوز (Permission) | بدنه درخواست (Request) | ساختار پاسخ (Response) | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/health/` | عمومی | `AllowAny` | — | `{"status": "ready", "services": {"database": "ok", "redis": "ok"}}` | `healthApi.check` | `test_health_and_settings.py` | ✅ فعال |
| `GET` | `/health/live/` | عمومی | `AllowAny` | — | `{"status": "healthy"}` | مانیتورینگ داکر / K8s | `test_health_and_settings.py` | ✅ فعال |
| `GET` | `/health/ready/` | عمومی | `AllowAny` | — | `{"status": "ready", "services": {...}}` | پروب داکر | `test_health_and_settings.py` | ✅ فعال |

---

## ۲. کاربران، احراز هویت و آدرس‌ها (Users & Authentication)

| متد | آدرس اندپوینت | احراز هویت | مجوز | بدنه درخواست | ساختار پاسخ | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `POST` | `/users/register/` | عمومی | `AllowAny` | `email, password, password_confirm, first_name, last_name` | `{"user": {...}, "tokens": {"access": "...", "refresh": "..."}}` | `authApi.register` | `test_users_api.py` | ✅ فعال |
| `POST` | `/users/login/` | عمومی | `AllowAny` | `email, password` | `{"access": "...", "refresh": "...", "user": {...}}` | `authApi.login` | `test_users_api.py` | ✅ فعال |
| `POST` | `/users/login/refresh/` | عمومی | `AllowAny` | `{"refresh": "..."}` | `{"access": "...", "refresh": "..."}` | `apiClient.interceptors` | `test_users_api.py` | ✅ فعال |
| `POST` | `/users/logout/` | لاگین | `IsAuthenticated` | `{"refresh": "..."}` | `HTTP 204 No Content` | `authApi.logout` | `test_users_api.py` | ✅ فعال |
| `GET` | `/users/profile/` | لاگین | `IsAuthenticated` | — | شیء کامل مشخصات `UserProfile` | `authApi.getProfile` | `test_users_api.py` | ✅ فعال |
| `PATCH` | `/users/profile/` | لاگین | `IsAuthenticated` | `first_name, last_name, avatar, national_id, bio` (Multipart/JSON) | `UserProfile` به‌روزرسانی شده | `authApi.updateProfile` | `test_users_api.py` | ✅ فعال |
| `POST` | `/users/verify-email/` | عمومی | `AllowAny` | `{"email": "...", "code": "123456"}` | `{"detail": "...", "is_verified": true}` | `authApi.verifyEmail` | `test_otp_and_auth_hardening.py` | ✅ فعال |
| `POST` | `/users/resend-otp/` | عمومی | `AllowAny` | `{"email": "..."}` | `{"detail": "...", "resend_after": 60}` | `authApi.resendOtp` | `test_otp_and_auth_hardening.py` | ✅ فعال |
| `POST` | `/users/profile/verify-phone/`| لاگین | `IsAuthenticated` | `{"phone_number": "0912..."}` | `{"detail": "...", "expires_in": 120}` | `authApi.verifyPhone` | `test_otp_and_auth_hardening.py` | ✅ فعال |
| `POST` | `/users/profile/confirm-phone/`| لاگین | `IsAuthenticated` | `{"phone_number": "0912...", "code": "..."}` | `{"detail": "...", "is_verified": true}` | `authApi.confirmPhone` | `test_otp_and_auth_hardening.py` | ✅ فعال |
| `POST` | `/users/password/change/` | لاگین | `IsAuthenticated` | `old_password, new_password, new_password_confirm` | `{"detail": "Password updated successfully"}` | `authApi.changePassword` | `test_users_api.py` | ✅ فعال |
| `POST` | `/users/password-reset/request/` | عمومی | `AllowAny` | `{"email": "..."}` | `{"detail": "Password reset token sent"}` | `authApi.requestPasswordReset` | `test_otp_and_auth_hardening.py` | ✅ فعال |
| `POST` | `/users/password-reset/confirm/` | عمومی | `AllowAny` | `email, token, new_password, new_password_confirm` | `{"detail": "Password reset successful"}` | `authApi.confirmPasswordReset` | `test_otp_and_auth_hardening.py` | ✅ فعال |
| `GET` | `/users/addresses/` | لاگین | `IsAuthenticated` | — | لیست صفحه‌بندی‌شده آدرس‌های کاربر | `authApi.getAddresses` | `test_users_api.py` | ✅ فعال |
| `POST` | `/users/addresses/` | لاگین | `IsAuthenticated` | `title, recipient_name, recipient_phone, province, city, postal_code, address_line, is_default` | شیء آدرس جدید ایجاد شده | `authApi.createAddress` | `test_users_api.py` | ✅ فعال |
| `GET` | `/users/addresses/{id}/` | لاگین | `IsAuthenticated, IsOwner` | — | جزئیات آدرس مشخص | `authApi.getAddress` | `test_users_api.py` | ✅ فعال |
| `PATCH` | `/users/addresses/{id}/` | لاگین | `IsAuthenticated, IsOwner` | فیلدهای انتخابی آدرس | شیء آدرس به‌روزرسانی شده | `authApi.updateAddress` | `test_users_api.py` | ✅ فعال |
| `DELETE`| `/users/addresses/{id}/` | لاگین | `IsAuthenticated, IsOwner` | — | `HTTP 204 No Content` (Soft Delete) | `authApi.deleteAddress` | `test_users_api.py` | ✅ فعال |

---

## ۳. کاتالوگ و دسته‌بندی محصولات (Products & Taxonomy)

| متد | آدرس اندپوینت | احراز هویت | مجوز | بدنه درخواست | ساختار پاسخ | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/products/` | عمومی | `AllowAny` | پارامترهای کوئری: `category, brand, is_featured, min_price, max_price, search, page` | پاسخ صفحه‌بندی‌شده محصولات `ProductListItem` | `productsApi.getList` | `test_products_api.py` | ✅ فعال |
| `GET` | `/products/{slug}/` | عمومی | `AllowAny` | — | جزئیات کامل محصول، تنوع‌ها و گالری تصاویر | `productsApi.getBySlug` | `test_products_api.py` | ✅ فعال |
| `GET` | `/categories/` | عمومی | `AllowAny` | `page, page_size, is_root, parent` | لیست صفحه‌بندی‌شده دسته‌بندی‌ها | `categoriesApi.getList` | `test_categories_api.py` | ✅ فعال |
| `GET` | `/categories/{slug}/` | عمومی | `AllowAny` | — | اطلاعات دسته‌بندی و ویژگی‌های والد/فرزند | `categoriesApi.getBySlug` | `test_categories_api.py` | ✅ فعال |
| `GET` | `/categories/tree/` | عمومی | `AllowAny` | — | ساختار درختی سلسله‌مراتبی کامل تاکسونومی | `categoriesApi.getTree` | `test_categories_api.py` | ✅ فعال |
| `GET` | `/products/{product_id}/comments/` | عمومی | `AllowAny` | — | لیست کامنت‌های متنی ساده محصول | `productsApi.getComments` | `test_product_comments_api.py` | ✅ فعال |
| `POST` | `/products/{product_id}/comments/` | لاگین | `IsAuthenticated` | `{"content": "...", "parent": null}` | شیء کامنت ثبت‌شده در انتظار بررسی | `productsApi.createComment` | `test_product_comments_api.py` | ✅ فعال |

---

## ۴. سبد خرید (Shopping Cart)

| متد | آدرس اندپوینت | احراز هویت | مجوز | بدنه درخواست | ساختار پاسخ | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/cart/` | مهمان/کاربر | `AllowAny` | — (هدر `X-Session-Key` یا `Bearer`) | شیء سبد خرید، آیتم‌ها، مجموع قیمت و تعداد | `cartApi.getCart` | `test_cart_api.py` | ✅ فعال |
| `POST` | `/cart/items/` | مهمان/کاربر | `AllowAny` | `{"variant_id": "...", "quantity": 1}` | سبد خرید به‌روزرسانی شده با وضعیت موجودی | `cartApi.addItem` | `test_cart_api.py` | ✅ فعال |
| `PATCH` | `/cart/items/{item_id}/` | مهمان/کاربر | `AllowAny` | `{"quantity": 2}` | سبد خرید به‌روزرسانی شده | `cartApi.updateItem` | `test_cart_api.py` | ✅ فعال |
| `DELETE`| `/cart/items/{item_id}/` | مهمان/کاربر | `AllowAny` | — | `HTTP 204 No Content` | `cartApi.removeItem` | `test_cart_api.py` | ✅ فعال |
| `POST` | `/cart/merge/` | لاگین | `IsAuthenticated` | `{"guest_session_key": "..."}` | سبد خرید نهایی کاربر پس از ادغام | `cartApi.mergeCart` | `test_cart_api.py` | ✅ فعال |

---

## ۵. لیست علاقه‌مندی‌ها (Wishlist)

| متد | آدرس اندپوینت | احراز هویت | مجوز | بدنه درخواست | ساختار پاسخ | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/wishlist/` | لاگین | `IsAuthenticated` | — | لیست آیتم‌های علاقه‌مندی کاربر | `wishlistApi.getWishlist` | `test_wishlist_api.py` | ✅ فعال |
| `POST` | `/wishlist/items/` | لاگین | `IsAuthenticated` | `{"product_id": "...", "variant_id": null}` | شیء آیتم اضافه شده | `wishlistApi.addItem` | `test_wishlist_api.py` | ✅ فعال |
| `DELETE`| `/wishlist/items/{item_id}/` | لاگین | `IsAuthenticated` | — | وضعیت به‌روزرسانی شده لیست | `wishlistApi.removeItem` | `test_wishlist_api.py` | ✅ فعال |
| `POST` | `/wishlist/items/remove-by-product/`| لاگین | `IsAuthenticated` | `{"product_id": "...", "variant_id": null}`| `{"detail": "Removed", "removed": true}` | `wishlistApi.removeByProduct` | `test_wishlist_api.py` | ✅ فعال |
| `DELETE`| `/wishlist/` | لاگین | `IsAuthenticated` | — | `{"detail": "Cleared", "deleted_count": 5}` | `wishlistApi.clearWishlist` | `test_wishlist_api.py` | ✅ فعال |
| `POST` | `/wishlist/merge/` | لاگین | `IsAuthenticated` | `{"guest_items": [{"product_id": "..."}]}` | لیست تلفیقی نهایی کاربر | `wishlistApi.mergeWishlist` | `test_wishlist_api.py` | ✅ فعال |
| `GET` | `/wishlist/check/` | لاگین | `IsAuthenticated` | پارامتر کوئری: `product_id, variant_id` | `{"in_wishlist": true/false}` | `wishlistApi.checkInWishlist`| `test_wishlist_api.py` | ✅ فعال |

---

## ۶. سفارش‌ها و تسویه‌حساب (Orders & Checkout)

| متد | آدرس اندپوینت | احراز هویت | مجوز | بدنه درخواست | ساختار پاسخ | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/orders/` | لاگین | `IsAuthenticated` | `page, page_size` | لیست تاریخچه سفارش‌های کاربر جاری | `ordersApi.getList` | `test_orders_api.py` | ✅ فعال |
| `GET` | `/orders/{id}/` | لاگین | `IsAuthenticated, IsOrderOwner` | — | فاکتور کامل، وضعیت اقلام، آدرس و شیپمنت | `ordersApi.getById` | `test_orders_api.py` | ✅ فعال |
| `POST` | `/orders/checkout/` | لاگین | `IsAuthenticated` | `shipping_address_id, shipping_method_id, coupon_code` | سفارش ایجاد شده با وضعیت `PENDING` | `ordersApi.checkout` | `test_orders_api.py` | ✅ فعال |
| `POST` | `/orders/{id}/cancel/` | لاگین | `IsAuthenticated, IsOrderOwner` | `{"reason": "..."}` | سفارش لغو شده با وضعیت `CANCELLED` | `ordersApi.cancel` | `test_orders_api.py` | ✅ فعال |

---

## ۷. حمل‌ونقل و لجستیک (Shipping & Logistics)

| متد | آدرس اندپوینت | احراز هویت | مجوز | بدنه درخواست | ساختار پاسخ | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/shipping/methods/` | عمومی | `AllowAny` | `province, city, subtotal` | لیست روش‌های ارسال با نرخ محاسبه‌شده | `shippingApi.getQuotes` | `test_shipping_api.py` | ✅ فعال |
| `POST` | `/shipping/calculate/` | عمومی | `AllowAny` | `shipping_method_id, province, city, subtotal` | کوت نهایی هزینه و زمان تخمینی تحویل | `shippingApi.calculateQuote` | `test_shipping_api.py` | ✅ فعال |
| `GET` | `/shipping/orders/{order_id}/shipment/`| لاگین| `IsAuthenticated, IsOrderOwner` | — | اطلاعات کامل مرسوله و وضعیت رهگیری | `shippingApi.getOrderShipment`| `test_shipping_api.py` | ✅ فعال |
| `GET` | `/shipping/track/{tracking_code}/`| عمومی | `AllowAny` | — | وضعیت عمومی رهگیری مرسوله | `shippingApi.trackShipment` | `test_shipping_api.py` | ✅ فعال |
| `POST` | `/shipping/webhook/carrier/` | امضای وب‌هوک | `AllowAny` (تایید امضا) | دیتای پوش وضعیت شرکت پست/پیک | `{"status": "processed"}` | وب‌هوک سرویس‌های خارجی | `test_shipping_api.py` | ✅ فعال |

---

## ۸. درگاه و تراکنش‌های پرداخت (Payments)

| متد | آدرس اندپوینت | احراز هویت | مجوز | بدنه درخواست | ساختار پاسخ | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/payments/` | لاگین | `IsAuthenticated` | `page, page_size` | لیست تراکنش‌های پرداخت کاربر | `paymentsApi.getList` | `test_payments_api.py` | ✅ فعال |
| `GET` | `/payments/{id}/` | لاگین | `IsAuthenticated, IsPaymentOwner` | — | جزئیات فاکتور و رسید پرداخت | `paymentsApi.getById` | `test_payments_api.py` | ✅ فعال |
| `POST` | `/payments/pay/` | لاگین | `IsAuthenticated` | `order_id, payment_method, should_succeed` (هدر `Idempotency-Key`) | رسید پرداخت با وضعیت `SUCCESSFUL/FAILED` | `paymentsApi.mockPay` | `test_payments_api.py` | ✅ فعال |

---

## ۹. تخفیف‌ها، کمپین‌ها و کوپن‌ها (Promotions & Coupons)

| متد | آدرس اندپوینت | احراز هویت | مجوز | بدنه درخواست | ساختار پاسخ | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/promotions/` | عمومی | `AllowAny` | — | لیست کمپین‌های فعال فروشگاه | `promotionsApi.getActivePromotions` | `test_promotions_api.py` | ✅ فعال |
| `GET` | `/promotions/active/` | عمومی | `AllowAny` | — | لیست کمپین‌های معتبر جاری | روت پشتیبان | `test_promotions_api.py` | ✅ فعال |
| `POST` | `/promotions/coupons/validate/` | لاگین | `IsAuthenticated` | `{"code": "WELCOME25", "subtotal": 1000000}` | `{"valid": true, "discount_amount": 250000, ...}` | `promotionsApi.validateCoupon` | `test_promotions_api.py` | ✅ فعال |
| `POST` | `/promotions/cart/preview/` | لاگین | `IsAuthenticated` | `{"coupon_code": "..."}` | پیش‌نمایش تخفیف روی سبد خرید بدون تغییر دیتابیس | `promotionsApi.getCartDiscountPreview` | `test_promotions_api.py` | ✅ فعال |

---

## ۱۰. نظرات خریداران و پرسش‌وپاسخ (Reviews & Product Q&A)

| متد | آدرس اندپوینت | احراز هویت | مجوز | بدنه درخواست | ساختار پاسخ | مصرف‌کننده فرانت‌اند | تست بک‌اند | وضعیت |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET` | `/reviews/product/{product_id}/` | عمومی | `AllowAny` | `rating, verified, has_images, sort, page` | لیست نظرات تاییدشده خریداران | `reviewsApi.getByProduct` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `GET` | `/reviews/product/{product_id}/summary/`| عمومی | `AllowAny` | — | میانگین، توزیع ۵ ستاره و تعداد خریداران قطعی (ردیس کش) | `reviewsApi.getSummary` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `GET` | `/reviews/product/{product_id}/eligibility/`| لاگین | `IsAuthenticated` | — | `{"can_review": true/false, "has_purchased": true}` | `reviewsApi.getEligibility` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `POST` | `/reviews/create/` | لاگین | `IsAuthenticated` | `product_id, rating, title, body, pros, cons, images` (Multipart) | شیء نظر ثبت شده در انتظار تایید | `reviewsApi.create` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `GET` | `/reviews/{id}/` | عمومی | `AllowAny` | — | جزئیات تک‌نظر | `reviewsApi` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `PATCH` | `/reviews/{id}/` | لاگین | `IsAuthenticated` | ویرایش متن، امتیاز یا عکس‌های نظر (بازگشت به PENDING) | نظر به‌روزرسانی شده | `reviewsApi.update` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `DELETE`| `/reviews/{id}/` | لاگین | `IsAuthenticated` | — | `HTTP 204 No Content` | `reviewsApi.delete` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `POST` | `/reviews/{id}/vote/` | لاگین | `IsAuthenticated` | `{"is_helpful": true/false}` | شمارشگر جدید رأی‌های مفید و غیرمفید | `reviewsApi.vote` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `POST` | `/reviews/{id}/report/` | لاگین | `IsAuthenticated` | `{"reason": "spam", "details": "..."}` | `{"detail": "Report submitted successfully"}` | `reviewsApi.report` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `GET` | `/reviews/my/` | لاگین | `IsAuthenticated` | `page, page_size` | لیست نظرات ثبت شده توسط کاربر جاری | `reviewsApi.getMyReviews` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `GET` | `/reviews/questions/product/{product_id}/`| عمومی | `AllowAny` | `page, page_size` | لیست پرسش‌ها و پاسخ‌های تاییدشده محصول | `questionsApi.getByProduct` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `POST` | `/reviews/questions/create/` | لاگین | `IsAuthenticated` | `{"product_id": "...", "question": "..."}` | پرسش ثبت شده در انتظار تایید | `questionsApi.create` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `DELETE`| `/reviews/questions/{id}/` | لاگین | `IsAuthenticated` | — | `HTTP 204 No Content` | `questionsApi.delete` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `POST` | `/reviews/questions/{id}/report/` | لاگین | `IsAuthenticated` | `{"reason": "...", "details": "..."}` | `{"detail": "Report submitted"}` | `questionsApi.report` | `test_reviews_and_qa_phase4.py` | ✅ فعال |
| `GET` | `/reviews/questions/my/` | لاگین | `IsAuthenticated` | `page, page_size` | لیست سوالات ثبت‌شده کاربر جاری | `questionsApi.getMyQuestions` | `test_reviews_and_qa_phase4.py` | ✅ فعال |

---

## ۱۱. کنترل سنتر ادمین (Admin Control Center - 48 Endpoints)

> تمام این اندپوینت‌ها نیازمند مجوز سازمانی `IsStaffAdmin` بوده و توسط پرتال ادمین فرانت‌اند در `frontend/src/lib/api/admin.ts` مصرف می‌شوند.

| متد | آدرس اندپوینت | حوزه عملیاتی | عملکرد دقیق در بک‌اند | تابع فرانت‌اند | وضعیت |
| :---: | :--- | :---: | :--- | :--- | :---: |
| `GET` | `/admin/me/` | احراز هویت | دریافت مشخصات مدیر و لیست مجوزهای موثر (Effective Permissions) | `adminApi.getMe` | ✅ فعال |
| `GET` | `/admin/dashboard/` | مانیتورینگ | دریافت شاخص‌های زنده درآمد، سفارشات، توزیع وضعیت و نمودار درآمد | `adminApi.getDashboard` | ✅ فعال |
| `GET` | `/admin/analytics/` | تحلیل داده | سری زمانی درآمد ۳۰ روزه و تفکیک منابع جذب کاربر | `adminApi.getAnalytics` | ✅ فعال |
| `GET` | `/admin/orders/` | سفارش‌ها | فهرست مستر سفارشات فروشگاه همراه با فیلتر وضعیت و جستجو | `adminApi.getOrders` | ✅ فعال |
| `GET` | `/admin/orders/{id}/` | سفارش‌ها | جزئیات جامع سفارش، اقلام، مشتری، شیپمنت و تراکنش پرداخت | `adminApi.getOrder` | ✅ فعال |
| `PATCH` | `/admin/orders/{id}/status/` | سفارش‌ها | تغییر گام وضعیت سفارش (نظیر PENDING به PROCESSING یا SHIPPED) | `adminApi.updateOrderStatus` | ✅ فعال |
| `POST` | `/admin/orders/{id}/cancel/` | سفارش‌ها | لغو سیستمی سفارش همراه با استرداد خودکار موجودی انبار | `adminApi.cancelOrder` | ✅ فعال |
| `POST` | `/admin/orders/bulk-status/` | سفارش‌ها | تغییر دسته‌ای وضعیت مجموعه‌ای از سفارش‌ها | `adminApi.bulkUpdateOrderStatus`| ✅ فعال |
| `PATCH` | `/admin/orders/{id}/shipment/`| سفارش‌ها | به‌روزرسانی کد رهگیری مرسوله، شرکت حمل‌ونقل و وضعیت ارسال | `adminApi.updateOrderShipment` | ✅ فعال |
| `GET` | `/admin/shipping/methods/` | لجستیک | فهرست روش‌های ارسال و تنظیمات کرایه | `adminApi.getShippingMethods` | ✅ فعال |
| `POST` | `/admin/shipping/methods/` | لجستیک | ایجاد روش ارسال جدید (اکسپرس، پیشتاز و ...) | `adminApi.createShippingMethod` | ✅ فعال |
| `PATCH` | `/admin/shipping/methods/{id}/` | لجستیک | ویرایش هزینه پایه، آستانه ارسال رایگان و تخمین زمان تحویل | `adminApi.updateShippingMethod`| ✅ فعال |
| `DELETE`| `/admin/shipping/methods/{id}/` | لجستیک | حذف یا غیرفعال‌سازی متد حمل‌ونقل | `adminApi.deleteShippingMethod`| ✅ فعال |
| `GET` | `/admin/products/` | کاتالوگ | فهرست کلی محصولات با فیلتر دسته‌بندی و سطح موجودی | `adminApi.getProducts` | ✅ فعال |
| `POST` | `/admin/products/` | کاتالوگ | ایجاد محصول جدید در دیتابیس | `adminApi.createProduct` | ✅ فعال |
| `GET` | `/admin/products/{id}/` | کاتالوگ | دریافت اطلاعات محصول جهت ویرایش | `adminApi.getProduct` | ✅ فعال |
| `PATCH` | `/admin/products/{id}/` | کاتالوگ | ویرایش مشخصات محصول، قیمت پایه و وضعیت انتشار | `adminApi.updateProduct` | ✅ فعال |
| `DELETE`| `/admin/products/{id}/` | کاتالوگ | حذف محصول از پایگاه داده | `adminApi.deleteProduct` | ✅ فعال |
| `GET` | `/admin/inventory/` | انبارداری | مانیتورینگ موجودی تمامی تنوع‌ها (Variants) با هشدار کسری | `adminApi.getInventory` | ✅ فعال |
| `PATCH` | `/admin/inventory/{id}/` | انبارداری | اصلاح آنی موجودی انبار یک تنوع مشخص | `adminApi.updateInventoryStock` | ✅ فعال |
| `POST` | `/admin/inventory/batch/` | انبارداری | به‌روزرسانی دسته‌ای موجودی انبار اقلام متعدد | `adminApi.batchUpdateInventory` | ✅ فعال |
| `GET` | `/admin/categories/` | دسته‌بندی | فهرست دسته‌های کاتالوگ | `adminApi.getCategories` | ✅ فعال |
| `GET` | `/admin/customers/` | کاربران | فهرست مشتریان ثبت‌نامی با مجموع خرید و تعداد سفارشات | `adminApi.getCustomers` | ✅ فعال |
| `GET` | `/admin/customers/{id}/` | کاربران | پرونده مشتری، آدرس‌ها و تاریخچه سفارشات | `adminApi.getCustomer` | ✅ فعال |
| `POST` | `/admin/customers/{id}/toggle-status/`| کاربران | فعال‌سازی یا انسداد موقت حساب کاربری مشتری | `adminApi.toggleCustomerStatus` | ✅ فعال |
| `GET` | `/admin/reviews/` | بازبینی نظرات | فهرست نظرات خریداران با فیلتر وضعیت تأیید و امتیاز | `adminApi.getReviews` | ✅ فعال |
| `POST` | `/admin/reviews/{id}/moderate/` | بازبینی نظرات | تأیید، رد (با ذکر دلیل) یا مخفی‌سازی نظر | `adminApi.moderateReview` | ✅ فعال |
| `POST` | `/admin/reviews/{id}/respond/` | بازبینی نظرات | ثبت پاسخ رسمی و حقوقی پرسنل به نظر خریدار | `adminApi.respondToReview` | ✅ فعال |
| `DELETE`| `/admin/reviews/{id}/` | بازبینی نظرات | حذف فیزیکی نظر از پایگاه داده | `adminApi.deleteReview` | ✅ فعال |
| `GET` | `/admin/reviews/reports/` | گزارشات | فهرست گزارش‌های تخلف ارسال‌شده از سوی کاربران برای نظرات | `adminApi.getReviewReports` | ✅ فعال |
| `POST` | `/admin/reviews/reports/{id}/resolve/`| گزارشات | بستن و تعیین تکلیف گزارش تخلف | `adminApi.resolveReviewReport` | ✅ فعال |
| `GET` | `/admin/questions/` | پرسش‌وپاسخ | فهرست سوالات فنی کاربران درباره محصولات | `adminApi.getQuestions` | ✅ فعال |
| `POST` | `/admin/questions/{id}/moderate/` | پرسش‌وپاسخ | تأیید یا رد انتشار عمومی سوال کاربر | `adminApi.moderateQuestion` | ✅ فعال |
| `POST` | `/admin/questions/{id}/answer/` | پرسش‌وپاسخ | درج پاسخ تخصصی کارشناس آتلیه به سوال | `adminApi.answerQuestion` | ✅ فعال |
| `DELETE`| `/admin/questions/{id}/` | پرسش‌وپاسخ | حذف سوال | `adminApi.deleteQuestion` | ✅ فعال |
| `GET` | `/admin/comments/` | کامنت‌ها | فهرست نظرات ساده قدیمی محصولات | `adminApi.getComments` | ✅ فعال |
| `POST` | `/admin/comments/{id}/moderate/` | کامنت‌ها | تایید یا رد کامنت متنی | `adminApi.moderateComment` | ✅ فعال |
| `POST` | `/admin/comments/{id}/reply/` | کامنت‌ها | پاسخ به کامنت | `adminApi.replyToComment` | ✅ فعال |
| `GET` | `/admin/payments/` | مالی | مانیتورینگ کلیه تراکنش‌های درگاه پرداخت با فیلتر وضعیت | `adminApi.getPayments` | ✅ فعال |
| `GET` | `/admin/payments/{id}/` | مالی | لاگ تراکنش مالی، متادیتا و کلید تکرارناپذیری | `adminApi.getPayment` | ✅ فعال |
| `GET` | `/admin/notifications/` | اعلانات | دریافت اعلانات سیستمی مدیران (ثبت سفارش، گزارش تخلف و ...) | `adminApi.getNotifications` | ✅ فعال |
| `POST` | `/admin/notifications/{id}/read/` | اعلانات | خوانده‌شدن یک اعلان مشخص | `adminApi.markNotificationRead` | ✅ فعال |
| `POST` | `/admin/notifications/read-all/` | اعلانات | خوانده‌شدن تمامی اعلانات به صورت دسته‌ای | `adminApi.markAllNotificationsRead` | ✅ فعال |
| `GET` | `/admin/activity/` | ممیزی (Audit)| لاگ جامع کنش‌های امنیتی و اداری سیستم با آی‌پی و شناسه ردیابی | `adminApi.getAuditLogs` | ✅ فعال |
| `GET` | `/admin/settings/` | پیکربندی | دریافت تنظیمات عمومی فروشگاه | `adminApi.getSettings` | ✅ فعال |
| `PATCH` | `/admin/settings/` | پیکربندی | به‌روزرسانی تنظیمات عمومی فروشگاه | `adminApi.updateSettings` | ✅ فعال |
| `GET` | `/admin/promotions/` | تخفیف‌ها | فهرست کمپین‌های تخفیف فعال و زمان‌بندی‌شده | `adminApi.getPromotions` | ✅ فعال |
| `POST` | `/admin/promotions/` | تخفیف‌ها | ایجاد کمپین تخفیف جدید | `adminApi.createPromotion` | ✅ فعال |
| `PATCH` | `/admin/promotions/{id}/` | تخفیف‌ها | ویرایش درصد تخفیف، سقف مجاز و مهلت اعتبار کمپین | `adminApi.updatePromotion` | ✅ فعال |
| `DELETE`| `/admin/promotions/{id}/` | تخفیف‌ها | حذف کمپین | `adminApi.deletePromotion` | ✅ فعال |
| `POST` | `/admin/promotions/{id}/toggle/` | تخفیف‌ها | فعال/غیرفعال‌سازی سریع کمپین | `adminApi.togglePromotion` | ✅ فعال |
| `GET` | `/admin/promotions/reports/` | تخفیف‌ها | گزارش‌های تحلیلی عملکرد تخفیف‌ها و بازدهی مالی | `adminApi.getPromotionReports` | ✅ فعال |
| `GET` | `/admin/coupons/` | کوپن‌ها | فهرست کدهای تخفیف با میزان استفاده | `adminApi.getCoupons` | ✅ فعال |
| `POST` | `/admin/coupons/` | کوپن‌ها | ساخت کوپن جدید با محدودیت تعداد و تاریخ انقضا | `adminApi.createCoupon` | ✅ فعال |
| `PATCH` | `/admin/coupons/{id}/` | کوپن‌ها | ویرایش کوپن | `adminApi.updateCoupon` | ✅ فعال |
| `DELETE`| `/admin/coupons/{id}/` | کوپن‌ها | حذف کوپن | `adminApi.deleteCoupon` | ✅ فعال |
| `POST` | `/admin/coupons/{id}/toggle/` | کوپن‌ها | فعال/غیرفعال‌سازی سریع کوپن | `adminApi.toggleCoupon` | ✅ فعال |
| `GET` | `/admin/coupons/{id}/usages/` | کوپن‌ها | گزارش ممیزی تاریخچه استفاده کاربران از کوپن مشخص | `adminApi.getCouponUsages` | ✅ فعال |
