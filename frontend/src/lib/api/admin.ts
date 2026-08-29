import { apiClient } from '@/lib/api/client';
import {
  AdminAnalyticsData,
  AdminAuditLogItem,
  AdminCommentItem,
  AdminCustomer,
  AdminDashboardData,
  AdminInventoryItem,
  AdminMeProfile,
  AdminNotificationItem,
  AdminOrder,
  AdminPaymentTransaction,
  AdminProduct,
  AdminReviewItem,
  AdminShippingMethod,
  AdminSystemSettingsData,
  Shipment,
} from '@/types/api';
import {
  AdminCoupon,
  AdminPromotion,
  AdminCouponUsage,
  AdminPromotionReports,
} from '@/types/admin';


/**
 * Helper to extract results array from DRF standard pagination or direct arrays.
 */
function extractResults<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * Authoritative Paradox Control Center API Client.
 * Communicates strictly with backend `/api/v1/admin/...` endpoints.
 * ZERO synthetic mock fallbacks or localStorage state.
 */
export const adminApi = {
  // 1. Identity & Clearance
  async getMe(): Promise<AdminMeProfile> {
    const { data } = await apiClient.get<AdminMeProfile>('/admin/me/');
    return data;
  },

  // 2. Intelligence & Telemetry
  async getDashboard(): Promise<AdminDashboardData> {
    const { data } = await apiClient.get<AdminDashboardData>('/admin/dashboard/');
    return data;
  },

  async getAnalytics(days: number = 30): Promise<AdminAnalyticsData> {
    const { data } = await apiClient.get<AdminAnalyticsData>('/admin/analytics/', {
      params: { days },
    });
    return data;
  },

  // 3. Orders Master Manifest & Lifecycle
  async getOrders(params?: {
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<AdminOrder[]> {
    const { data } = await apiClient.get('/admin/orders/', { params });
    return extractResults<AdminOrder>(data);
  },

  async getOrder(id: string): Promise<AdminOrder> {
    const { data } = await apiClient.get<AdminOrder>(`/admin/orders/${id}/`);
    return data;
  },

  async updateOrderStatus(id: string, status: string): Promise<AdminOrder> {
    const { data } = await apiClient.patch<AdminOrder>(`/admin/orders/${id}/status/`, {
      status,
    });
    return data;
  },

  async cancelOrder(id: string, reason?: string): Promise<AdminOrder> {
    const { data } = await apiClient.post<AdminOrder>(`/admin/orders/${id}/cancel/`, {
      reason,
    });
    return data;
  },

  async bulkUpdateOrderStatus(
    orderIds: string[],
    status: string
  ): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
    const { data } = await apiClient.post('/admin/orders/bulk-status/', {
      order_ids: orderIds,
      status,
    });
    return data;
  },

  // 4. Products & Catalog
  async getProducts(params?: {
    category?: string;
    stock?: string;
    search?: string;
  }): Promise<AdminProduct[]> {
    const { data } = await apiClient.get('/admin/products/', { params });
    return extractResults<AdminProduct>(data);
  },

  async getProduct(id: string): Promise<AdminProduct> {
    const { data } = await apiClient.get<AdminProduct>(`/admin/products/${id}/`);
    return data;
  },

  async createProduct(productData: any): Promise<AdminProduct> {
    const { data } = await apiClient.post<AdminProduct>('/admin/products/', productData);
    return data;
  },

  async updateProduct(id: string, productData: any): Promise<AdminProduct> {
    const { data } = await apiClient.patch<AdminProduct>(`/admin/products/${id}/`, productData);
    return data;
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/admin/products/${id}/`);
  },

  // 5. Inventory Operations
  async getInventory(params?: {
    category?: string;
    stock?: string;
    search?: string;
  }): Promise<AdminInventoryItem[]> {
    const { data } = await apiClient.get('/admin/inventory/', { params });
    return extractResults<AdminInventoryItem>(data);
  },

  async updateInventoryStock(variantId: string, stock: number): Promise<AdminInventoryItem> {
    const { data } = await apiClient.patch<AdminInventoryItem>(`/admin/inventory/${variantId}/`, {
      stock,
    });
    return data;
  },

  async batchUpdateInventory(
    items: Array<{ id?: string; variant_id?: string; stock: number }>
  ): Promise<any[]> {
    const { data } = await apiClient.post('/admin/inventory/batch/', { items });
    return data;
  },

  // 6. Categories
  async getCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
    const { data } = await apiClient.get('/admin/categories/');
    return extractResults<{ id: string; name: string; slug: string }>(data);
  },

  // 7. Customers Directory
  async getCustomers(params?: {
    status?: string;
    search?: string;
  }): Promise<AdminCustomer[]> {
    const { data } = await apiClient.get('/admin/customers/', { params });
    return extractResults<AdminCustomer>(data);
  },

  async getCustomer(id: string): Promise<AdminCustomer> {
    const { data } = await apiClient.get<AdminCustomer>(`/admin/customers/${id}/`);
    return data;
  },

  async toggleCustomerStatus(id: string): Promise<AdminCustomer> {
    const { data } = await apiClient.post<AdminCustomer>(`/admin/customers/${id}/toggle-status/`);
    return data;
  },

  // 8. Reviews & Q&A Moderation
  async getReviews(params?: {
    is_approved?: boolean;
    rating?: number;
    search?: string;
  }): Promise<AdminReviewItem[]> {
    const { data } = await apiClient.get('/admin/reviews/', { params });
    return extractResults<AdminReviewItem>(data);
  },

  async moderateReview(id: string, is_approved: boolean): Promise<AdminReviewItem> {
    const { data } = await apiClient.post<AdminReviewItem>(`/admin/reviews/${id}/moderate/`, {
      is_approved,
    });
    return data;
  },

  async deleteReview(id: string): Promise<void> {
    await apiClient.delete(`/admin/reviews/${id}/`);
  },

  async getComments(params?: {
    is_approved?: boolean;
    search?: string;
  }): Promise<AdminCommentItem[]> {
    const { data } = await apiClient.get('/admin/comments/', { params });
    return extractResults<AdminCommentItem>(data);
  },

  async moderateComment(id: string, is_approved: boolean): Promise<AdminCommentItem> {
    const { data } = await apiClient.post<AdminCommentItem>(`/admin/comments/${id}/moderate/`, {
      is_approved,
    });
    return data;
  },

  async replyToComment(id: string, content: string): Promise<AdminCommentItem> {
    const { data } = await apiClient.post<AdminCommentItem>(`/admin/comments/${id}/reply/`, {
      content,
    });
    return data;
  },

  // 9. Payment Transactions
  async getPayments(params?: {
    status?: string;
    payment_method?: string;
    gateway?: string;
    search?: string;
  }): Promise<AdminPaymentTransaction[]> {
    const { data } = await apiClient.get('/admin/payments/', { params });
    return extractResults<AdminPaymentTransaction>(data);
  },

  async getPayment(id: string): Promise<AdminPaymentTransaction> {
    const { data } = await apiClient.get<AdminPaymentTransaction>(`/admin/payments/${id}/`);
    return data;
  },

  // 10. Operational Notifications & Audit Logs
  async getNotifications(): Promise<AdminNotificationItem[]> {
    const { data } = await apiClient.get('/admin/notifications/');
    return extractResults<AdminNotificationItem>(data);
  },

  async markNotificationRead(id: string): Promise<AdminNotificationItem> {
    const { data } = await apiClient.post<AdminNotificationItem>(`/admin/notifications/${id}/read/`);
    return data;
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiClient.post('/admin/notifications/read-all/');
  },

  async getAuditLogs(params?: {
    action?: string;
    resource_type?: string;
  }): Promise<AdminAuditLogItem[]> {
    const { data } = await apiClient.get('/admin/activity/', { params });
    return extractResults<AdminAuditLogItem>(data);
  },

  // 11. System Governance & Settings
  async getSettings(): Promise<AdminSystemSettingsData> {
    const { data } = await apiClient.get<AdminSystemSettingsData>('/admin/settings/');
    return data;
  },

  async updateSettings(
    settingsData: Partial<AdminSystemSettingsData>
  ): Promise<AdminSystemSettingsData> {
    const { data } = await apiClient.patch<AdminSystemSettingsData>(
      '/admin/settings/',
      settingsData
    );
    return data;
  },

  // 12. Promotions & Marketing Campaigns
  async getPromotions(): Promise<AdminPromotion[]> {
    const { data } = await apiClient.get('/admin/promotions/');
    return extractResults<AdminPromotion>(data);
  },

  async getPromotion(id: string): Promise<AdminPromotion> {
    const { data } = await apiClient.get<AdminPromotion>(`/admin/promotions/${id}/`);
    return data;
  },

  async createPromotion(promotionData: Partial<AdminPromotion>): Promise<AdminPromotion> {
    const { data } = await apiClient.post<AdminPromotion>('/admin/promotions/', promotionData);
    return data;
  },

  async updatePromotion(
    id: string,
    promotionData: Partial<AdminPromotion>
  ): Promise<AdminPromotion> {
    const { data } = await apiClient.patch<AdminPromotion>(
      `/admin/promotions/${id}/`,
      promotionData
    );
    return data;
  },

  async deletePromotion(id: string): Promise<void> {
    await apiClient.delete(`/admin/promotions/${id}/`);
  },

  async togglePromotion(id: string): Promise<AdminPromotion> {
    const { data } = await apiClient.post<AdminPromotion>(`/admin/promotions/${id}/toggle/`);
    return data;
  },

  // 12.1 Vouchers & Coupons
  async getCoupons(): Promise<AdminCoupon[]> {
    const { data } = await apiClient.get('/admin/coupons/');
    return extractResults<AdminCoupon>(data);
  },

  async getCoupon(id: string): Promise<AdminCoupon> {
    const { data } = await apiClient.get<AdminCoupon>(`/admin/coupons/${id}/`);
    return data;
  },

  async createCoupon(couponData: Partial<AdminCoupon>): Promise<AdminCoupon> {
    const { data } = await apiClient.post<AdminCoupon>('/admin/coupons/', couponData);
    return data;
  },

  async updateCoupon(id: string, couponData: Partial<AdminCoupon>): Promise<AdminCoupon> {
    const { data } = await apiClient.patch<AdminCoupon>(`/admin/coupons/${id}/`, couponData);
    return data;
  },

  async deleteCoupon(id: string): Promise<void> {
    await apiClient.delete(`/admin/coupons/${id}/`);
  },

  async toggleCoupon(id: string): Promise<AdminCoupon> {
    const { data } = await apiClient.post<AdminCoupon>(`/admin/coupons/${id}/toggle/`);
    return data;
  },

  async getCouponUsages(id: string): Promise<AdminCouponUsage[]> {
    const { data } = await apiClient.get(`/admin/coupons/${id}/usages/`);
    return extractResults<AdminCouponUsage>(data);
  },

  // 12.2 Promotion Telemetry & Reports
  async getPromotionReports(params?: {
    days?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<AdminPromotionReports> {
    const { data } = await apiClient.get<AdminPromotionReports>('/admin/promotions/reports/', {
      params,
    });
    return data;
  },

  // 13. Shipping Methods & Logistics
  async getShippingMethods(): Promise<AdminShippingMethod[]> {
    const { data } = await apiClient.get('/admin/shipping/methods/');
    return extractResults<AdminShippingMethod>(data);
  },

  async updateShippingMethod(
    id: string,
    methodData: Partial<AdminShippingMethod>
  ): Promise<AdminShippingMethod> {
    const { data } = await apiClient.patch<AdminShippingMethod>(
      `/admin/shipping/methods/${id}/`,
      methodData
    );
    return data;
  },

  async createShippingMethod(
    methodData: Partial<AdminShippingMethod>
  ): Promise<AdminShippingMethod> {
    const { data } = await apiClient.post<AdminShippingMethod>(
      '/admin/shipping/methods/',
      methodData
    );
    return data;
  },

  async deleteShippingMethod(id: string): Promise<void> {
    await apiClient.delete(`/admin/shipping/methods/${id}/`);
  },

  async updateOrderShipment(
    orderId: string,
    shipmentData: {
      status?: string;
      tracking_code?: string;
      carrier_name?: string;
      notes?: string;
    }
  ): Promise<Shipment> {
    const { data } = await apiClient.patch<Shipment>(
      `/admin/orders/${orderId}/shipment/`,
      shipmentData
    );
    return data;
  },
};
