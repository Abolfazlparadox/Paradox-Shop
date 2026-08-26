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
  full_name?: string;
  phone_number?: string | null;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_verified?: boolean;
  permissions?: string[];
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
  permissions?: string[];
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
  product: string;
  product_id?: string;
  variant?: string | null;
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
  items_count?: number;
  shipment?: Shipment | null;
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
  updated_at?: string;
  shipping_address: OrderAddress;
  items: OrderItem[];
  shipment?: Shipment | null;
}

export interface CheckoutRequest {
  address_id: string;
  shipping_method_id?: string | null;
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

// ==========================================
// 9. Admin Control Center Domain
// ==========================================

export interface AdminKPIs {
  monthly_revenue: number;
  monthly_revenue_change: number;
  total_orders: number;
  total_orders_change: number;
  active_customers: number;
  active_customers_change: number;
  conversion_rate: number;
  conversion_rate_change: number;
  average_order_value: number;
  customer_acquisition_cost: number;
  refund_rate: number;
  target_revenue_progress: number;
  active_products: number;
  low_stock_variants: number;
  out_of_stock_variants: number;
}

export interface AdminRevenuePoint {
  date: string;
  revenue: number;
  projected: number;
  orders: number;
}

export interface AdminAcquisitionChannel {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface AdminTopProduct {
  id: string;
  name: string;
  category: string;
  units_sold: number;
  revenue: number;
  stock: number;
}

export interface AdminCohort {
  cohort: string;
  users: number;
  m1: string;
  m2: string;
  m3: string;
  m4: string;
}

export interface AdminDashboardData {
  kpis: AdminKPIs;
  revenue_chart: AdminRevenuePoint[];
  acquisition_channels: AdminAcquisitionChannel[];
  status_distribution: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  };
}

export interface AdminAnalyticsData {
  kpis: AdminKPIs;
  revenue_chart: AdminRevenuePoint[];
  acquisition_channels: AdminAcquisitionChannel[];
  top_products: AdminTopProduct[];
  cohorts: AdminCohort[];
}

export interface AdminCustomerSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface AdminOrderItem {
  id: string;
  product_id?: string | null;
  variant_id?: string | null;
  product_name: string;
  variant_name?: string | null;
  sku: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  primary_image?: string | null;
}

export interface AdminOrderAddress {
  recipient_name: string;
  recipient_phone: string;
  province: string;
  city: string;
  postal_code: string;
  address_line: string;
}

export interface AdminPaymentSummary {
  id: string;
  amount: string;
  status: PaymentStatus;
  payment_method?: string;
  gateway: string;
  transaction_id: string;
  created_at: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  customer: AdminCustomerSummary;
  status: OrderStatus;
  subtotal: string;
  shipping_cost: string;
  discount_amount: string;
  total: string;
  total_amount?: string;
  items_count: number;
  items: AdminOrderItem[];
  shipping_address?: AdminOrderAddress;
  shipment?: Shipment | null;
  shipping_method_name?: string | null;
  tracking_code?: string | null;
  notes?: string | null;
  payments?: AdminPaymentSummary[];
  paid_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminShippingMethod {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  base_rate: string;
  free_shipping_threshold?: string | null;
  estimated_days_min: number;
  estimated_days_max: number;
  estimated_delivery_text?: string;
  is_active: boolean;
  sort_order: number;
}

export interface AdminProductVariant {
  id: string;
  sku: string;
  name: string;
  price_override?: string | null;
  final_price: string;
  stock: number;
  is_active: boolean;
  attributes?: Record<string, any>;
}

export interface AdminProductImage {
  id: string;
  variant?: string | null;
  image: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  category?: { id: string; name: string; slug: string } | null;
  brand?: { id: string; name: string; slug: string } | null;
  product_type: 'simple' | 'variable';
  base_price: string;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  primary_image?: string | null;
  variants: AdminProductVariant[];
  images?: AdminProductImage[];
  description?: string;
  short_description?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminInventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  category_name: string;
  sku: string;
  name: string;
  final_price: string;
  stock: number;
  is_active: boolean;
  primary_image?: string | null;
  updated_at: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  is_verified: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  orders_count: number;
  total_spent: string;
  last_order_date?: string | null;
  addresses_count: number;
  addresses?: any[];
  orders?: any[];
  created_at: string;
  updated_at: string;
}

export interface AdminReviewItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  author_name: string;
  author_email: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminCommentReply {
  id: string;
  author_name: string;
  author_email: string;
  content: string;
  is_approved: boolean;
  created_at: string;
}

export interface AdminCommentItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  author_name: string;
  author_email: string;
  parent_id?: string | null;
  content: string;
  is_approved: boolean;
  is_staff_reply: boolean;
  replies_count: number;
  replies: AdminCommentReply[];
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  created_at: string;
  updated_at: string;
}

export interface AdminPaymentTransaction {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  amount: string;
  status: PaymentStatus;
  payment_method?: string;
  gateway: string;
  transaction_id: string;
  is_mock: boolean;
  idempotency_key?: string | null;
  gateway_response?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'ORDER' | 'STOCK' | 'REVIEW' | 'PAYMENT' | 'SYSTEM';
  notification_type: 'ORDER' | 'STOCK' | 'REVIEW' | 'PAYMENT' | 'SYSTEM';
  is_read: boolean;
  action_url?: string | null;
  resource_id?: string | null;
  timestamp: string;
  created_at: string;
}

export interface AdminAuditLogItem {
  id: string;
  user_id?: string | null;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address?: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AdminSystemSettingsData {
  store_name: string;
  store_url: string;
  currency: string;
  tax_rate: number;
  shipping_fee_base: number;
  free_shipping_threshold: number;
  maintenance_mode: boolean;
  webhook_url: string;
  updated_at?: string;
}

export interface AdminMeProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  permissions: string[];
}

// ==========================================
// 10. Wishlist Domain
// ==========================================

export interface WishlistProductImage {
  id: string;
  image: string;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
}

export interface WishlistVariant {
  id: string;
  sku: string;
  name: string;
  price_override?: string | null;
  stock?: number;
  is_active?: boolean;
}

export interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  base_price: string;
  brand_name?: string | null;
  category_name?: string | null;
  images: WishlistProductImage[];
  is_active: boolean;
  is_featured: boolean;
}

export interface WishlistItem {
  id: string;
  product: WishlistProduct;
  variant?: WishlistVariant | null;
  created_at: string;
}

export interface Wishlist {
  id: string;
  items_count: number;
  items: WishlistItem[];
  created_at: string;
  updated_at: string;
}

export interface AddWishlistItemRequest {
  product_id: string;
  variant_id?: string | null;
}

export interface MergeWishlistRequest {
  product_ids: string[];
}

// ==========================================
// 8. Shipping & Delivery Domain
// ==========================================

export interface ShippingQuote {
  method_id: string;
  code: string;
  name: string;
  description: string | null;
  base_rate: string;
  shipping_fee: string;
  is_free: boolean;
  free_shipping_threshold: string | null;
  estimated_days_min: number;
  estimated_days_max: number;
  estimated_delivery_text: string;
}

export interface ShippingCalculateRequest {
  method_id?: string | null;
  province?: string;
  city?: string;
  subtotal?: string | number;
}

export interface Shipment {
  id: string;
  tracking_code: string;
  carrier_name: string;
  shipping_fee: string;
  status: 'pending' | 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
  status_display: string;
  shipped_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  shipping_method?: ShippingQuote | null;
  recipient_province?: string;
  recipient_city?: string;
  order_number?: string;
  created_at: string;
  updated_at?: string;
}



