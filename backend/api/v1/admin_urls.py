from django.urls import path

from .admin_views import (
    AdminAnalyticsView,
    AdminAuditLogListView,
    AdminCategoryDetailView,
    AdminCategoryListView,
    AdminCommentListView,
    AdminCommentModerateView,
    AdminCommentReplyView,
    AdminCouponDetailView,
    AdminCouponListCreateView,
    AdminCouponToggleView,
    AdminCouponUsageListView,
    AdminCustomerDetailView,
    AdminCustomerListView,
    AdminCustomerToggleStatusView,
    AdminDashboardView,
    AdminInventoryBatchStockView,
    AdminInventoryListView,
    AdminInventoryStockUpdateView,
    AdminMeView,
    AdminNotificationListView,
    AdminNotificationReadAllView,
    AdminNotificationReadView,
    AdminOrderBulkStatusView,
    AdminOrderCancelView,
    AdminOrderDetailView,
    AdminOrderListView,
    AdminOrderStatusUpdateView,
    AdminPaymentDetailView,
    AdminPaymentListView,
    AdminProductDetailView,
    AdminProductListCreateView,
    AdminPromotionDetailView,
    AdminPromotionListCreateView,
    AdminPromotionReportsView,
    AdminPromotionToggleView,
    AdminReviewDeleteView,
    AdminReviewListView,
    AdminReviewModerateView,
    AdminSettingsView,
    AdminShippingMethodDetailView,
    AdminShippingMethodListView,
    AdminOrderShipmentUpdateView,
)

app_name = "admin"

urlpatterns = [
    # Clearance
    path("me/", AdminMeView.as_view(), name="me"),

    # Telemetry
    path("dashboard/", AdminDashboardView.as_view(), name="dashboard"),
    path("analytics/", AdminAnalyticsView.as_view(), name="analytics"),

    # Orders
    path("orders/", AdminOrderListView.as_view(), name="orders-list"),
    path("orders/bulk-status/", AdminOrderBulkStatusView.as_view(), name="orders-bulk-status"),
    path("orders/<uuid:pk>/", AdminOrderDetailView.as_view(), name="orders-detail"),
    path("orders/<uuid:pk>/status/", AdminOrderStatusUpdateView.as_view(), name="orders-status-update"),
    path("orders/<uuid:pk>/cancel/", AdminOrderCancelView.as_view(), name="orders-cancel"),
    path("orders/<uuid:pk>/shipment/", AdminOrderShipmentUpdateView.as_view(), name="orders-shipment-update"),

    # Shipping Methods & Logistics
    path("shipping/methods/", AdminShippingMethodListView.as_view(), name="shipping-methods-list"),
    path("shipping/methods/<uuid:pk>/", AdminShippingMethodDetailView.as_view(), name="shipping-methods-detail"),

    # Catalog & Inventory
    path("products/", AdminProductListCreateView.as_view(), name="products-list"),
    path("products/<uuid:pk>/", AdminProductDetailView.as_view(), name="products-detail"),
    path("inventory/", AdminInventoryListView.as_view(), name="inventory-list"),
    path("inventory/batch/", AdminInventoryBatchStockView.as_view(), name="inventory-batch"),
    path("inventory/<uuid:pk>/", AdminInventoryStockUpdateView.as_view(), name="inventory-stock-update"),

    # Categories
    path("categories/", AdminCategoryListView.as_view(), name="categories-list"),
    path("categories/<uuid:pk>/", AdminCategoryDetailView.as_view(), name="categories-detail"),

    # Customers
    path("customers/", AdminCustomerListView.as_view(), name="customers-list"),
    path("customers/<uuid:pk>/", AdminCustomerDetailView.as_view(), name="customers-detail"),
    path("customers/<uuid:pk>/toggle-status/", AdminCustomerToggleStatusView.as_view(), name="customers-toggle-status"),

    # Reviews & Q&A Moderation
    path("reviews/", AdminReviewListView.as_view(), name="reviews-list"),
    path("reviews/<uuid:pk>/moderate/", AdminReviewModerateView.as_view(), name="reviews-moderate"),
    path("reviews/<uuid:pk>/", AdminReviewDeleteView.as_view(), name="reviews-delete"),
    path("comments/", AdminCommentListView.as_view(), name="comments-list"),
    path("comments/<uuid:pk>/moderate/", AdminCommentModerateView.as_view(), name="comments-moderate"),
    path("comments/<uuid:pk>/reply/", AdminCommentReplyView.as_view(), name="comments-reply"),

    # Payments
    path("payments/", AdminPaymentListView.as_view(), name="payments-list"),
    path("payments/<uuid:pk>/", AdminPaymentDetailView.as_view(), name="payments-detail"),

    # Operational Notifications & Audit Logs
    path("notifications/", AdminNotificationListView.as_view(), name="notifications-list"),
    path("notifications/read-all/", AdminNotificationReadAllView.as_view(), name="notifications-read-all"),
    path("notifications/<uuid:pk>/read/", AdminNotificationReadView.as_view(), name="notifications-read"),
    path("activity/", AdminAuditLogListView.as_view(), name="activity-list"),

    # Settings
    path("settings/", AdminSettingsView.as_view(), name="settings"),

    # Promotions & Coupons
    path("promotions/", AdminPromotionListCreateView.as_view(), name="promotions-list"),
    path("promotions/reports/", AdminPromotionReportsView.as_view(), name="promotions-reports"),
    path("promotions/<uuid:pk>/", AdminPromotionDetailView.as_view(), name="promotions-detail"),
    path("promotions/<uuid:pk>/toggle/", AdminPromotionToggleView.as_view(), name="promotions-toggle"),
    path("coupons/", AdminCouponListCreateView.as_view(), name="coupons-list"),
    path("coupons/<uuid:pk>/", AdminCouponDetailView.as_view(), name="coupons-detail"),
    path("coupons/<uuid:pk>/toggle/", AdminCouponToggleView.as_view(), name="coupons-toggle"),
    path("coupons/<uuid:pk>/usages/", AdminCouponUsageListView.as_view(), name="coupons-usages"),
]
