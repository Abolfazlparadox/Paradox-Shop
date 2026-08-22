/**
 * Paradox Shop — Authoritative API Contract Types
 * Directly derived from OpenAPI 3.0.3 specification (`Paradox Shop API.yaml`)
 */

// ==========================================
// 1. Generic & Standard Contract Interfaces
// ==========================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface APIError {
  code: string;
  detail: string;
  errors?: Record<string, string[]>;
  request_id?: string;
}

// ==========================================
// 2. Authentication & Users Domain
// ==========================================

export type Gender = 'M' | 'F' | 'O';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
  is_staff?: boolean;
}

export interface UserProfileDetail {
  avatar?: string | null;
  national_id?: string | null;
  date_of_birth?: string | null;
  gender?: Gender | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  is_email_verified?: boolean;
}

export interface UserProfile extends User {
  profile?: UserProfileDetail;
}

export interface UserRegistrationRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
}

export interface RegisterResponse {
  detail: string;
  email: string;
  requires_verification: boolean;
  cooldown: number;
  ttl: number;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface VerifyEmailResponse {
  detail: string;
  access: string;
  refresh: string;
  user: UserProfile;
}

export interface ResendOTPRequest {
  email: string;
  type?: 'verify' | 'reset';
}

export interface ResendOTPResponse {
  detail: string;
  cooldown: number;
  ttl: number;
}

export interface RequestPhoneVerificationRequest {
  phone_number: string;
}

export interface RequestPhoneVerificationResponse {
  detail: string;
  cooldown: number;
  ttl: number;
}

export interface ConfirmPhoneRequest {
  otp: string;
}

export interface ConfirmPhoneResponse {
  detail: string;
  user: UserProfile;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  detail: string;
  cooldown: number;
  ttl: number;
}

export interface PasswordResetConfirmRequest {
  email: string;
  otp: string;
  new_password: string;
  new_password_confirm: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface Address {
  id: string;
  title: string;
  recipient_name: string;
  recipient_phone: string;
  province: string;
  city: string;
  postal_code: string;
  address_line: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressRequest {
  title: string;
  recipient_name: string;
  recipient_phone: string;
  province: string;
  city: string;
  postal_code: string;
  address_line: string;
  is_default?: boolean;
}

// ==========================================
// 3. Categories & Taxonomy Domain
// ==========================================

export type AttributeType = 'text' | 'number' | 'boolean' | 'select';

export interface CategoryAttribute {
  id: string;
  name: string;
  attribute_type: AttributeType;
  is_required: boolean;
  is_filterable: boolean;
  is_variant: boolean;
  sort_order?: number;
}

export interface CategoryMini {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
}

export interface CategoryList {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  image?: string | null;
  sort_order?: number;
}

export interface CategoryDetail {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parent?: CategoryMini | null;
  children: CategoryMini[];
  attributes: CategoryAttribute[];
  sort_order?: number;
  created_at: string;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  sort_order?: number;
  children?: CategoryTreeNode[];
}

// ==========================================
// 4. Products & Catalog Domain
// ==========================================

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

export interface ProductImage {
  id: string;
  image: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
  variant?: string | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name?: string;
  price_override?: string | null;
  final_price: string;
  stock: number;
  attributes: Record<string, any>;
  is_active: boolean;
}

export interface ProductAttributeValue {
  id?: string;
  attribute_id: string;
  attribute_name: string;
  attribute_type?: string;
  value: string | number | boolean | null;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  short_description?: string | null;
  base_price: string;
  is_active?: boolean;
  is_featured: boolean;
  product_type?: string;
  category: CategoryMini;
  brand?: Brand | null;
  primary_image?: string | null;
  min_price?: string;
  max_price?: string;
  total_stock?: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string | null;
  base_price: string;
  is_active: boolean;
  is_featured: boolean;
  product_type: string;
  category: CategoryMini;
  brand?: Brand | null;
  variants: ProductVariant[];
  images: ProductImage[];
  attribute_values: ProductAttributeValue[];
  created_at: string;
  updated_at?: string;
}

export interface ProductFilterParams {
  category?: string;
  brand?: string;
  search?: string;
  min_price?: string | number;
  max_price?: string | number;
  is_featured?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface ProductCommentReply {
  id: string;
  author_name: string;
  is_staff_reply: boolean;
  content: string;
  created_at: string;
}

export interface ProductComment {
  id: string;
  author_name: string;
  is_staff_reply: boolean;
  content: string;
  created_at: string;
  replies: ProductCommentReply[];
}

export interface CreateProductCommentRequest {
  content: string;
  parent?: string | null;
}

// ==========================================
// 5. Shopping Cart Domain
// ==========================================

export interface CartItemProduct {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  primary_image?: string | null;
}

export interface CartItemVariant {
  id: string;
  sku: string;
  name: string;
  stock: number;
  is_active: boolean;
}

export interface CartItem {
  id: string;
  product: CartItemProduct;
  variant?: CartItemVariant | null;
  quantity: number;
  unit_price: string;
  total_price: string;
  created_at: string;
}

export interface Cart {
  id: string;
  user?: string | null;
  session_key?: string | null;
  items: CartItem[];
  items_count?: number;
  total_items?: number;
  subtotal: string;
  created_at: string;
  updated_at: string;
}

export interface AddToCartRequest {
  product_id: string;
  variant_id?: string | null;
  quantity?: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface MergeCartRequest {
  session_key: string;
}

// ==========================================
// 6. Orders Domain
// ==========================================

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  product_name: string;
  variant_sku?: string | null;
  variant_name?: string | null;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface OrderAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  province: string;
  city: string;
  postal_code: string;
  address_line: string;
}

export interface OrderListItem {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: string;
  shipping_cost: string;
  discount_amount: string;
  total: string;
  notes?: string | null;
  created_at: string;
  paid_at?: string | null;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: string;
  shipping_cost: string;
  discount_amount: string;
  total: string;
  notes?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  shipping_address: OrderAddress;
  items: OrderItem[];
}

export interface CheckoutRequest {
  address_id: string;
  notes?: string | null;
}

// ==========================================
// 7. Payments Domain
// ==========================================

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export interface PaymentListItem {
  id: string;
  order_number: string;
  amount: string;
  status: PaymentStatus;
  gateway: string;
  transaction_id: string;
  created_at: string;
}

export interface PaymentDetail {
  id: string;
  order: string;
  order_number: string;
  amount: string;
  status: PaymentStatus;
  payment_method?: string;
  gateway: string;
  transaction_id: string;
  idempotency_key?: string | null;
  gateway_response?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MockPayRequest {
  order_id: string;
  idempotency_key?: string | null;
}

// ==========================================
// 8. Reviews Domain
// ==========================================

export interface Review {
  id: string;
  product?: string;
  user_display_name?: string;
  user_name?: string;
  rating: number;
  title?: string | null;
  comment?: string;
  body?: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateReviewRequest {
  product_id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
}
