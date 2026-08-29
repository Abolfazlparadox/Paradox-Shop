import { apiClient } from './client';
import {
  Address,
  AddressRequest,
  AddToCartRequest,
  CategoryDetail,
  CategoryList,
  CategoryTreeNode,
  CheckoutRequest,
  ConfirmPhoneRequest,
  ConfirmPhoneResponse,
  CreateProductCommentRequest,
  CreateReviewRequest,
  LoginRequest,
  MergeCartRequest,
  MockPayRequest,
  OrderDetail,
  OrderListItem,
  PaginatedResponse,
  PasswordChangeRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  PasswordResetResponse,
  PaymentDetail,
  PaymentListItem,
  ProductComment,
  ProductDetail,
  ProductFilterParams,
  ProductListItem,
  RegisterResponse,
  RequestPhoneVerificationRequest,
  RequestPhoneVerificationResponse,
  ResendOTPRequest,
  ResendOTPResponse,
  Review,
  TokenPair,
  UpdateCartItemRequest,
  User,
  UserProfile,
  UserRegistrationRequest,
  VerifyEmailRequest,
  VerifyEmailResponse,
  Wishlist,
  WishlistItem,
  AddWishlistItemRequest,
  MergeWishlistRequest,
  Shipment,
  ShippingCalculateRequest,
  ShippingQuote,
  ActivePromotion,
  CouponValidateRequest,
  CouponValidateResponse,
  CartDiscountPreviewRequest,
  CartDiscountPreviewResponse,
} from '@/types/api';

// ==========================================
// 1. Authentication & Users
// ==========================================

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenPair> => {
    const res = await apiClient.post<TokenPair>('/users/login/', data);
    return res.data;
  },
  register: async (data: UserRegistrationRequest): Promise<RegisterResponse> => {
    const res = await apiClient.post<RegisterResponse>('/users/register/', data);
    return res.data;
  },
  verifyEmail: async (data: VerifyEmailRequest): Promise<VerifyEmailResponse> => {
    const res = await apiClient.post<VerifyEmailResponse>('/users/verify-email/', data);
    return res.data;
  },
  resendOtp: async (data: ResendOTPRequest): Promise<ResendOTPResponse> => {
    const res = await apiClient.post<ResendOTPResponse>('/users/resend-otp/', data);
    return res.data;
  },
  verifyPhone: async (data: RequestPhoneVerificationRequest): Promise<RequestPhoneVerificationResponse> => {
    const res = await apiClient.post<RequestPhoneVerificationResponse>('/users/profile/verify-phone/', data);
    return res.data;
  },
  confirmPhone: async (data: ConfirmPhoneRequest): Promise<ConfirmPhoneResponse> => {
    const res = await apiClient.post<ConfirmPhoneResponse>('/users/profile/confirm-phone/', data);
    return res.data;
  },
  requestPasswordReset: async (data: PasswordResetRequest): Promise<PasswordResetResponse> => {
    const res = await apiClient.post<PasswordResetResponse>('/users/password-reset/request/', data);
    return res.data;
  },
  confirmPasswordReset: async (data: PasswordResetConfirmRequest): Promise<{ detail: string }> => {
    const res = await apiClient.post<{ detail: string }>('/users/password-reset/confirm/', data);
    return res.data;
  },
  refreshToken: async (refresh: string): Promise<TokenPair> => {
    const res = await apiClient.post<TokenPair>('/users/login/refresh/', { refresh });
    return res.data;
  },
  logout: async (refresh: string): Promise<void> => {
    await apiClient.post('/users/logout/', { refresh });
  },
  changePassword: async (data: PasswordChangeRequest): Promise<void> => {
    await apiClient.post('/users/password/change/', data);
  },
  getProfile: async (): Promise<UserProfile> => {
    const res = await apiClient.get<UserProfile>('/users/profile/');
    return res.data;
  },
  updateProfile: async (data: FormData | Partial<UserProfile>): Promise<UserProfile> => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const res = await apiClient.patch<UserProfile>('/users/profile/', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return res.data;
  },
  getAddresses: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Address>> => {
    const res = await apiClient.get<PaginatedResponse<Address>>('/users/addresses/', { params });
    return res.data;
  },
  createAddress: async (data: AddressRequest): Promise<Address> => {
    const res = await apiClient.post<Address>('/users/addresses/', data);
    return res.data;
  },
  getAddress: async (id: string): Promise<Address> => {
    const res = await apiClient.get<Address>(`/users/addresses/${id}/`);
    return res.data;
  },
  updateAddress: async (id: string, data: Partial<AddressRequest>): Promise<Address> => {
    const res = await apiClient.patch<Address>(`/users/addresses/${id}/`, data);
    return res.data;
  },
  deleteAddress: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/addresses/${id}/`);
  },
};

// ==========================================
// 2. Categories & Taxonomy
// ==========================================

export const categoriesApi = {
  getTree: async (): Promise<CategoryTreeNode[]> => {
    const res = await apiClient.get<CategoryTreeNode[]>('/categories/tree/');
    return res.data;
  },
  getList: async (params?: { page?: number; page_size?: number; is_root?: boolean; parent?: string }): Promise<PaginatedResponse<CategoryList>> => {
    const res = await apiClient.get<PaginatedResponse<CategoryList>>('/categories/', { params });
    return res.data;
  },
  getBySlug: async (slug: string): Promise<CategoryDetail> => {
    const res = await apiClient.get<CategoryDetail>(`/categories/${slug}/`);
    return res.data;
  },
};

// ==========================================
// 3. Products & Catalog
// ==========================================

export const productsApi = {
  getList: async (params?: ProductFilterParams): Promise<PaginatedResponse<ProductListItem>> => {
    const res = await apiClient.get<PaginatedResponse<ProductListItem>>('/products/', { params });
    return res.data;
  },
  getBySlug: async (slug: string): Promise<ProductDetail> => {
    const res = await apiClient.get<ProductDetail>(`/products/${slug}/`);
    return res.data;
  },
  getComments: async (productIdOrSlug: string): Promise<PaginatedResponse<ProductComment>> => {
    const res = await apiClient.get<PaginatedResponse<ProductComment>>(`/products/${productIdOrSlug}/comments/`);
    return res.data;
  },
  createComment: async (productId: string, data: CreateProductCommentRequest): Promise<ProductComment> => {
    const res = await apiClient.post<ProductComment>(`/products/${productId}/comments/`, data);
    return res.data;
  },
};

// ==========================================
// 4. Shopping Cart
// ==========================================

export const cartApi = {
  getCart: async (): Promise<any> => {
    const res = await apiClient.get('/cart/');
    return res.data;
  },
  addItem: async (data: AddToCartRequest): Promise<any> => {
    const res = await apiClient.post('/cart/items/', data);
    return res.data;
  },
  updateItem: async (itemId: string, data: UpdateCartItemRequest): Promise<any> => {
    const res = await apiClient.patch(`/cart/items/${itemId}/`, data);
    return res.data;
  },
  removeItem: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/cart/items/${itemId}/`);
  },
  mergeCart: async (data: MergeCartRequest): Promise<any> => {
    const res = await apiClient.post('/cart/merge/', data);
    return res.data;
  },
};

// ==========================================
// 5. Orders & Checkout
// ==========================================

export const ordersApi = {
  getList: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<OrderListItem>> => {
    const res = await apiClient.get<PaginatedResponse<OrderListItem>>('/orders/', { params });
    return res.data;
  },
  getById: async (id: string): Promise<OrderDetail> => {
    const res = await apiClient.get<OrderDetail>(`/orders/${id}/`);
    return res.data;
  },
  checkout: async (data: CheckoutRequest): Promise<OrderDetail> => {
    const res = await apiClient.post<OrderDetail>('/orders/checkout/', data);
    return res.data;
  },
  cancel: async (id: string): Promise<OrderDetail> => {
    const res = await apiClient.post<OrderDetail>(`/orders/${id}/cancel/`);
    return res.data;
  },
};

// ==========================================
// 6. Payments
// ==========================================

export const paymentsApi = {
  getList: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<PaymentListItem>> => {
    const res = await apiClient.get<PaginatedResponse<PaymentListItem>>('/payments/', { params });
    return res.data;
  },
  getById: async (id: string): Promise<PaymentDetail> => {
    const res = await apiClient.get<PaymentDetail>(`/payments/${id}/`);
    return res.data;
  },
  mockPay: async (data: MockPayRequest): Promise<PaymentDetail> => {
    const res = await apiClient.post<PaymentDetail>('/payments/pay/', data);
    return res.data;
  },
};

// ==========================================
// 7. Reviews
// ==========================================

export const reviewsApi = {
  getByProduct: async (productId: string, params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Review>> => {
    const res = await apiClient.get<PaginatedResponse<Review>>(`/reviews/product/${productId}/`, { params });
    return res.data;
  },
  create: async (data: CreateReviewRequest): Promise<Review> => {
    const res = await apiClient.post<Review>('/reviews/create/', data);
    return res.data;
  },
};

// ==========================================
// 8. Health & Diagnostics
// ==========================================

export const healthApi = {
  check: async (): Promise<{ status: string; [key: string]: any }> => {
    const res = await apiClient.get('/health/');
    return res.data;
  },
};

// ==========================================
// 9. Wishlist Domain
// ==========================================

export const wishlistApi = {
  getWishlist: async (): Promise<Wishlist> => {
    const res = await apiClient.get<Wishlist>('/wishlist/');
    return res.data;
  },
  addItem: async (data: AddWishlistItemRequest): Promise<WishlistItem> => {
    const res = await apiClient.post<WishlistItem>('/wishlist/items/', data);
    return res.data;
  },
  removeItem: async (itemId: string): Promise<Wishlist> => {
    const res = await apiClient.delete<Wishlist>(`/wishlist/items/${itemId}/`);
    return res.data;
  },
  removeByProduct: async (data: AddWishlistItemRequest): Promise<{ detail: string; removed: boolean }> => {
    const res = await apiClient.post<{ detail: string; removed: boolean }>('/wishlist/items/remove-by-product/', data);
    return res.data;
  },
  clearWishlist: async (): Promise<{ detail: string; deleted_count: number }> => {
    const res = await apiClient.delete<{ detail: string; deleted_count: number }>('/wishlist/');
    return res.data;
  },
  mergeWishlist: async (data: MergeWishlistRequest): Promise<Wishlist> => {
    const res = await apiClient.post<Wishlist>('/wishlist/merge/', data);
    return res.data;
  },
  checkInWishlist: async (productId: string, variantId?: string): Promise<{ in_wishlist: boolean }> => {
    const res = await apiClient.get<{ in_wishlist: boolean }>('/wishlist/check/', {
      params: { product_id: productId, variant_id: variantId },
    });
    return res.data;
  },
};

// ==========================================
// 10. Shipping & Delivery Domain
// ==========================================

export const shippingApi = {
  getQuotes: async (params?: {
    province?: string;
    city?: string;
    subtotal?: string | number;
  }): Promise<ShippingQuote[]> => {
    const res = await apiClient.get<ShippingQuote[]>('/shipping/methods/', { params });
    return res.data;
  },
  calculateQuote: async (data: ShippingCalculateRequest): Promise<ShippingQuote> => {
    const res = await apiClient.post<ShippingQuote>('/shipping/calculate/', data);
    return res.data;
  },
  getOrderShipment: async (orderId: string): Promise<Shipment> => {
    const res = await apiClient.get<Shipment>(`/shipping/orders/${orderId}/shipment/`);
    return res.data;
  },
  trackShipment: async (trackingCode: string): Promise<Shipment> => {
    const res = await apiClient.get<Shipment>(`/shipping/track/${trackingCode}/`);
    return res.data;
  },
};

// ==========================================
// 11. Promotions & Coupons Domain
// ==========================================

export const promotionsApi = {
  getActivePromotions: async (): Promise<ActivePromotion[]> => {
    const res = await apiClient.get<ActivePromotion[]>('/promotions/');
    return res.data;
  },
  validateCoupon: async (data: CouponValidateRequest): Promise<CouponValidateResponse> => {
    const res = await apiClient.post<CouponValidateResponse>('/promotions/coupons/validate/', data);
    return res.data;
  },
  getCartDiscountPreview: async (data?: CartDiscountPreviewRequest): Promise<CartDiscountPreviewResponse> => {
    const res = await apiClient.post<CartDiscountPreviewResponse>('/promotions/cart/preview/', data || {});
    return res.data;
  },
};

