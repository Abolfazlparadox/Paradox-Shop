'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { AdminSystemSettingsData } from '@/types/api';

// ==========================================
// Query Keys
// ==========================================
export const adminKeys = {
  all: ['admin'] as const,
  me: () => [...adminKeys.all, 'me'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  analytics: (days: number) => [...adminKeys.all, 'analytics', days] as const,
  orders: (params?: any) => [...adminKeys.all, 'orders', params] as const,
  order: (id: string) => [...adminKeys.all, 'order', id] as const,
  products: (params?: any) => [...adminKeys.all, 'products', params] as const,
  product: (id: string) => [...adminKeys.all, 'product', id] as const,
  inventory: (params?: any) => [...adminKeys.all, 'inventory', params] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  customers: (params?: any) => [...adminKeys.all, 'customers', params] as const,
  customer: (id: string) => [...adminKeys.all, 'customer', id] as const,
  reviews: (params?: any) => [...adminKeys.all, 'reviews', params] as const,
  reviewReports: (params?: any) => [...adminKeys.all, 'review-reports', params] as const,
  questions: (params?: any) => [...adminKeys.all, 'questions', params] as const,
  comments: (params?: any) => [...adminKeys.all, 'comments', params] as const,

  payments: (params?: any) => [...adminKeys.all, 'payments', params] as const,
  payment: (id: string) => [...adminKeys.all, 'payment', id] as const,
  notifications: () => [...adminKeys.all, 'notifications'] as const,
  auditLogs: (params?: any) => [...adminKeys.all, 'audit-logs', params] as const,
  settings: () => [...adminKeys.all, 'settings'] as const,
  shippingMethods: () => [...adminKeys.all, 'shipping-methods'] as const,
  promotions: () => [...adminKeys.all, 'promotions'] as const,
  promotion: (id: string) => [...adminKeys.all, 'promotion', id] as const,
  coupons: () => [...adminKeys.all, 'coupons'] as const,
  coupon: (id: string) => [...adminKeys.all, 'coupon', id] as const,
  couponUsages: (id: string) => [...adminKeys.all, 'coupon', id, 'usages'] as const,
  promotionReports: (params?: any) => [...adminKeys.all, 'promotions', 'reports', params] as const,
};

// ==========================================
// 1. Identity & Clearance
// ==========================================
export function useAdminMe() {
  return useQuery({
    queryKey: adminKeys.me(),
    queryFn: () => adminApi.getMe(),
    staleTime: 5 * 60 * 1000,
  });
}

// ==========================================
// 2. Intelligence & Telemetry
// ==========================================
export function useAdminDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: () => adminApi.getDashboard(),
    staleTime: 30 * 1000,
  });
}

export function useAdminAnalytics(days: number = 30) {
  return useQuery({
    queryKey: adminKeys.analytics(days),
    queryFn: () => adminApi.getAnalytics(days),
    staleTime: 60 * 1000,
  });
}

// ==========================================
// 3. Orders Master Manifest
// ==========================================
export function useAdminOrders(params?: {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: adminKeys.orders(params),
    queryFn: () => adminApi.getOrders(params),
    staleTime: 15 * 1000,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: adminKeys.order(id),
    queryFn: () => adminApi.getOrder(id),
    enabled: Boolean(id),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateOrderStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
      queryClient.invalidateQueries({ queryKey: adminKeys.order(data.id) });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.cancelOrder(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
      queryClient.invalidateQueries({ queryKey: adminKeys.order(data.id) });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: adminKeys.inventory() });
    },
  });
}

export function useBulkUpdateOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderIds, status }: { orderIds: string[]; status: string }) =>
      adminApi.bulkUpdateOrderStatus(orderIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

// ==========================================
// 4. Products & Catalog
// ==========================================
export function useAdminProducts(params?: {
  category?: string;
  stock?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: () => adminApi.getProducts(params),
    staleTime: 30 * 1000,
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: adminKeys.product(id),
    queryFn: () => adminApi.getProduct(id),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminKeys.inventory() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updateProduct(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminKeys.product(updated.id) });
      queryClient.invalidateQueries({ queryKey: adminKeys.inventory() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminKeys.inventory() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

// ==========================================
// 5. Inventory Operations
// ==========================================
export function useAdminInventory(params?: {
  category?: string;
  stock?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: adminKeys.inventory(params),
    queryFn: () => adminApi.getInventory(params),
    staleTime: 15 * 1000,
  });
}

export function useUpdateInventoryStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, stock }: { variantId: string; stock: number }) =>
      adminApi.updateInventoryStock(variantId, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.inventory() });
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

export function useBatchUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id?: string; variant_id?: string; stock: number }>) =>
      adminApi.batchUpdateInventory(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.inventory() });
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

// ==========================================
// 6. Categories
// ==========================================
export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories(),
    queryFn: () => adminApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

// ==========================================
// 7. Customers Directory
// ==========================================
export function useAdminCustomers(params?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: adminKeys.customers(params),
    queryFn: () => adminApi.getCustomers(params),
    staleTime: 30 * 1000,
  });
}

export function useAdminCustomer(id: string) {
  return useQuery({
    queryKey: adminKeys.customer(id),
    queryFn: () => adminApi.getCustomer(id),
    enabled: Boolean(id),
  });
}

export function useToggleCustomerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.toggleCustomerStatus(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.customers() });
      queryClient.invalidateQueries({ queryKey: adminKeys.customer(updated.id) });
    },
  });
}

// ==========================================
// 8. Reviews & Comments Moderation
// 8. Reviews & Q&A Moderation
// ==========================================
export function useAdminReviews(params?: {
  status?: string;
  is_approved?: boolean;
  rating?: number;
  search?: string;
  product_id?: string;
}) {
  return useQuery({
    queryKey: adminKeys.reviews(params),
    queryFn: () => adminApi.getReviews(params),
    staleTime: 15 * 1000,
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      is_approved,
      rejection_reason,
    }: {
      id: string;
      status?: string;
      is_approved?: boolean;
      rejection_reason?: string;
    }) => adminApi.moderateReview(id, { status, is_approved, rejection_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reviews() });
    },
  });
}

export function useRespondToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, response_text }: { id: string; response_text: string }) =>
      adminApi.respondToReview(id, response_text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reviews() });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reviews() });
    },
  });
}

export function useAdminReviewReports(params?: { status?: string }) {
  return useQuery({
    queryKey: adminKeys.reviewReports(params),
    queryFn: () => adminApi.getReviewReports(params),
    staleTime: 15 * 1000,
  });
}

export function useResolveReviewReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.resolveReviewReport(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reviewReports() });
      queryClient.invalidateQueries({ queryKey: adminKeys.reviews() });
    },
  });
}

export function useAdminQuestions(params?: {
  status?: string;
  search?: string;
  product_id?: string;
}) {
  return useQuery({
    queryKey: adminKeys.questions(params),
    queryFn: () => adminApi.getQuestions(params),
    staleTime: 15 * 1000,
  });
}

export function useModerateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      is_approved,
      rejection_reason,
    }: {
      id: string;
      status?: string;
      is_approved?: boolean;
      rejection_reason?: string;
    }) => adminApi.moderateQuestion(id, { status, is_approved, rejection_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.questions() });
    },
  });
}

export function useAnswerQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) =>
      adminApi.answerQuestion(id, answer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.questions() });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.questions() });
    },
  });
}

export function useAdminComments(params?: { is_approved?: boolean; search?: string }) {
  return useQuery({
    queryKey: adminKeys.comments(params),
    queryFn: () => adminApi.getComments(params),
    staleTime: 15 * 1000,
  });
}

export function useModerateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_approved }: { id: string; is_approved: boolean }) =>
      adminApi.moderateComment(id, is_approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.comments() });
    },
  });
}

export function useReplyComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      adminApi.replyToComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.comments() });
    },
  });
}


// ==========================================
// 9. Payment Transactions
// ==========================================
export function useAdminPayments(params?: {
  status?: string;
  payment_method?: string;
  gateway?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: adminKeys.payments(params),
    queryFn: () => adminApi.getPayments(params),
    staleTime: 15 * 1000,
  });
}

export function useAdminPayment(id: string) {
  return useQuery({
    queryKey: adminKeys.payment(id),
    queryFn: () => adminApi.getPayment(id),
    enabled: Boolean(id),
  });
}

// ==========================================
// 10. Operational Notifications & Audit Logs
// ==========================================
export function useAdminNotifications() {
  return useQuery({
    queryKey: adminKeys.notifications(),
    queryFn: () => adminApi.getNotifications(),
    refetchInterval: 30 * 1000, // Poll every 30s
    staleTime: 10 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications() });
    },
  });
}

export function useAdminAuditLogs(params?: { action?: string; resource_type?: string }) {
  return useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => adminApi.getAuditLogs(params),
    staleTime: 15 * 1000,
  });
}

// ==========================================
// 11. System Governance & Settings
// ==========================================
export function useAdminSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: () => adminApi.getSettings(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminSystemSettingsData>) => adminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.settings() });
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() });
    },
  });
}

// ==========================================
// 12. Shipping Methods & Logistics
// ==========================================
export function useAdminShippingMethods() {
  return useQuery({
    queryKey: adminKeys.shippingMethods(),
    queryFn: () => adminApi.getShippingMethods(),
    staleTime: 30 * 1000,
  });
}

export function useUpdateShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updateShippingMethod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shippingMethods() });
    },
  });
}

export function useCreateShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.createShippingMethod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shippingMethods() });
    },
  });
}

export function useDeleteShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteShippingMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shippingMethods() });
    },
  });
}

export function useUpdateOrderShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: any }) =>
      adminApi.updateOrderShipment(orderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
      queryClient.invalidateQueries({ queryKey: adminKeys.order(variables.orderId) });
    },
  });
}

// ==========================================
// 14. Promotions & Campaigns
// ==========================================
export function useAdminPromotions() {
  return useQuery({
    queryKey: adminKeys.promotions(),
    queryFn: () => adminApi.getPromotions(),
  });
}

export function useAdminPromotion(id: string) {
  return useQuery({
    queryKey: adminKeys.promotion(id),
    queryFn: () => adminApi.getPromotion(id),
    enabled: Boolean(id),
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.createPromotion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.promotions() });
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updatePromotion(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.promotions() });
      queryClient.invalidateQueries({ queryKey: adminKeys.promotion(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.promotions() });
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });
}

export function useTogglePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.togglePromotion(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.promotions() });
      queryClient.invalidateQueries({ queryKey: adminKeys.promotion(id) });
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });
}

// ==========================================
// 15. Vouchers & Coupons
// ==========================================
export function useAdminCoupons() {
  return useQuery({
    queryKey: adminKeys.coupons(),
    queryFn: () => adminApi.getCoupons(),
  });
}

export function useAdminCoupon(id: string) {
  return useQuery({
    queryKey: adminKeys.coupon(id),
    queryFn: () => adminApi.getCoupon(id),
    enabled: Boolean(id),
  });
}

export function useAdminCouponUsages(id: string) {
  return useQuery({
    queryKey: adminKeys.couponUsages(id),
    queryFn: () => adminApi.getCouponUsages(id),
    enabled: Boolean(id),
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.coupons() });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updateCoupon(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.coupons() });
      queryClient.invalidateQueries({ queryKey: adminKeys.coupon(variables.id) });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.coupons() });
    },
  });
}

export function useToggleCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.toggleCoupon(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.coupons() });
      queryClient.invalidateQueries({ queryKey: adminKeys.coupon(id) });
    },
  });
}

// ==========================================
// 16. Promotion Telemetry & Reports
// ==========================================
export function useAdminPromotionReports(params?: {
  days?: number;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: adminKeys.promotionReports(params),
    queryFn: () => adminApi.getPromotionReports(params),
  });
}


