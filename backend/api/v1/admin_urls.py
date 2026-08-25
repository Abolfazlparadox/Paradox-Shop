from django.urls import path

from .admin_views import (
    AdminAnalyticsView,
    AdminAuditLogListView,
    AdminCategoryDetailView,
    AdminCategoryListView,
    AdminCommentListView,
    AdminCommentModerateView,
    AdminCommentReplyView,
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
    AdminReviewDeleteView,
    AdminReviewListView,
    AdminReviewModerateView,
    AdminSettingsView,
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
]
