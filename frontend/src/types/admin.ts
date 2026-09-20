// ==========================================
// Paradox Shop - Dedicated Admin & Analytics Types
// ==========================================

export type AdminOrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type SentimentType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  role: 'SUPER_ADMIN' | 'ATELIER_MANAGER' | 'SUPPORT_AGENT';
  avatar_url?: string;
  last_active: string;
}

export interface AdminOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  variant_name?: string | null;
  original_unit_price?: number | string | null;
  discount_amount?: number | string | null;
  promotion_snapshot?: Record<string, any> | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
}

export interface AdminOrderAddress {
  recipient_name: string;
  recipient_phone: string;
  province: string;
  city: string;
  postal_code: string;
  address_line: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  status: AdminOrderStatus;
  items: AdminOrderItem[];
  items_count?: number;
  subtotal?: number;
  shipping_cost?: number;
  shipping_fee?: number;
  discount_amount?: number;
  coupon_code?: string | null;
  coupon_snapshot?: Record<string, any> | null;
  total: number;
  total_amount?: number;
  payment_method: string;
  payment_status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  shipping_address: AdminOrderAddress;
  notes?: string;
  tracking_code?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminProductVariant {
  id: string;
  sku: string;
  name: string;
  price_override?: number | null;
  final_price: number;
  stock: number;
  attributes: Record<string, string>;
  is_active: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  brand?: {
    id: string;
    name: string;
  } | null;
  product_type: 'physical' | 'digital';
  base_price: number;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  rating: number;
  reviews_count: number;
  primary_image?: string | null;
  images: string[];
  short_description?: string;
  description?: string;
  variants: AdminProductVariant[];
  created_at: string;
}

export interface AdminCustomer {
  id: string;
  email: string;
  name: string;
  phone_number?: string;
  avatar?: string;
  is_verified: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'FLAGGED';
  orders_count: number;
  total_spent: number;
  last_order_date?: string;
  created_at: string;
  addresses_count: number;
  notes?: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  projected: number;
  orders: number;
}

export interface AcquisitionChannel {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface CohortData {
  cohort: string;
  users: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
}

export interface AdminAnalytics {
  kpis: {
    monthly_revenue: number;
    monthly_revenue_change: number; // e.g. +14.2%
    total_orders: number;
    total_orders_change: number;
    active_customers: number;
    active_customers_change: number;
    conversion_rate: number;
    conversion_rate_change: number;
    average_order_value: number;
    customer_acquisition_cost: number;
    refund_rate: number;
    target_revenue_progress: number; // 0-100%
  };
  revenue_chart: RevenueDataPoint[];
  acquisition_channels: AcquisitionChannel[];
  top_products: {
    id: string;
    name: string;
    category: string;
    units_sold: number;
    revenue: number;
    stock: number;
    image_url?: string;
  }[];
  cohorts: CohortData[];
}

export interface AdminComment {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  author_name: string;
  author_email?: string;
  content: string;
  rating?: number;
  sentiment: SentimentType;
  is_approved: boolean;
  is_staff_reply: boolean;
  replies_count: number;
  created_at: string;
  parent_id?: string | null;
}

export interface AdminPromotion {
  id: string;
  name: string;
  slug: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_type_display?: string;
  discount_value: number;
  max_discount_amount?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  is_active: boolean;
  priority: number;
  included_products?: string[];
  excluded_products?: string[];
  included_categories?: string[];
  included_brands?: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminCoupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_type_display?: string;
  discount_value: number;
  max_discount_amount?: number | null;
  min_order_subtotal?: number;
  start_at?: string | null;
  end_at?: string | null;
  is_active: boolean;
  total_usage_limit?: number | null;
  per_user_usage_limit: number;
  usage_count: number;
  audience_type: 'ALL_USERS' | 'SPECIFIC_USERS';
  eligible_users?: string[];
  included_products?: string[];
  excluded_products?: string[];
  included_categories?: string[];
  included_brands?: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminCouponUsage {
  id: string;
  coupon: string;
  user: string;
  user_email: string;
  order?: string | null;
  order_number?: string | null;
  discount_amount: string | number;
  redeemed_at: string;
}

export interface CouponLeaderboardItem {
  id: string;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number | string;
  usage_count: number;
  total_usage_limit?: number | null;
  is_active: boolean;
}

export interface AdminPromotionReports {
  total_discounts_given: number | string;
  coupon_redemptions: number;
  total_coupon_discounts: number | string;
  revenue_affected: number | string;
  orders_with_coupons: number;
  orders_with_promotions: number;
  active_promotions_count: number;
  active_coupons_count: number;
  active_campaigns: number;
  expired_campaigns: number;
  most_used_coupons: CouponLeaderboardItem[];
  least_used_coupons: CouponLeaderboardItem[];
}


export interface StoreCurrency {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_default: boolean;
}

export interface SystemSettings {
  store_name: string;
  store_url?: string;
  contact_email?: string;
  support_phone?: string;
  currency?: string;
  currencies?: StoreCurrency[];
  default_currency?: string;
  tax_rate?: number;
  tax_rate_percentage?: number;
  shipping_fee_base?: number;
  standard_shipping_cost?: number;
  free_shipping_threshold?: number;
  maintenance_mode: boolean;
  allow_guest_checkout?: boolean;
  email_notifications_enabled?: boolean;
  webhook_url?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  admin_name?: string;
  admin_email?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  created_at: string;
  details?: Record<string, any>;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'ORDER' | 'STOCK' | 'REVIEW' | 'SYSTEM' | 'SECURITY';
  timestamp: string;
  is_read: boolean;
  action_url?: string;
}
