from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.categories.models import Category
from apps.orders.admin_selectors import AdminOrderSelector
from apps.orders.admin_serializers import (
    AdminOrderBulkStatusSerializer,
    AdminOrderDetailSerializer,
    AdminOrderListSerializer,
    AdminOrderStatusUpdateSerializer,
)
from apps.orders.admin_services import AdminOrderService
from apps.orders.models import Order
from apps.payments.admin_selectors import AdminPaymentSelector
from apps.payments.admin_serializers import (
    AdminPaymentDetailSerializer,
    AdminPaymentListSerializer,
)
from apps.products.admin_selectors import AdminProductSelector
from apps.products.admin_serializers import (
    AdminCategorySummarySerializer,
    AdminInventoryBatchStockSerializer,
    AdminInventoryStockUpdateSerializer,
    AdminInventoryVariantSerializer,
    AdminProductCreateUpdateSerializer,
    AdminProductDetailSerializer,
    AdminProductListSerializer,
)
from apps.products.admin_services import AdminProductService
from apps.products.models import Product, ProductComment, ProductVariant
from apps.reviews.admin_selectors import AdminReviewSelector
from apps.reviews.admin_serializers import (
    AdminCommentListSerializer,
    AdminCommentReplyCreateSerializer,
    AdminModerationActionSerializer,
    AdminReviewListSerializer,
)
from apps.reviews.admin_services import AdminReviewService
from apps.reviews.models import Review
from apps.users.admin_selectors import AdminUserSelector
from apps.users.admin_serializers import (
    AdminCustomerDetailSerializer,
    AdminCustomerListSerializer,
)
from apps.users.admin_services import AdminUserService
from common.admin_serializers import (
    AdminAnalyticsResponseSerializer,
    AdminAuditLogSerializer,
    AdminDashboardResponseSerializer,
    AdminMeSerializer,
    AdminNotificationSerializer,
    AdminSystemSettingSerializer,
)
from common.analytics_selectors import AnalyticsSelector
from common.models import AdminNotification, AuditLog, SystemSetting
from apps.shipping.models import Shipment, ShippingMethod
from apps.shipping.serializers import ShippingMethodSerializer, ShipmentSerializer
from apps.shipping.services import update_shipment_status
from apps.promotions.models import Coupon, Promotion
from apps.promotions.selectors import CouponSelector, PromotionSelector, PromotionReportSelector
from apps.promotions.serializers import (
    AdminCouponSerializer,
    AdminCouponUsageSerializer,
    AdminPromotionSerializer,
    AdminPromotionReportSerializer,
)
from apps.promotions.services import CouponService, PromotionService
from apps.promotions.permissions import IsPromotionAdmin
from common.permissions import IsStaffAdmin

User = get_user_model()


# ============================================================
# 1. Identity & Clearance
# ============================================================

@extend_schema(tags=["Admin - Clearance"], responses={200: AdminMeSerializer})
class AdminMeView(APIView):
    """Returns currently authenticated staff user profile and resolved effective permissions."""

    permission_classes = [IsStaffAdmin]

    def get(self, request):
        serializer = AdminMeSerializer(request.user)
        return Response(serializer.data)


# ============================================================
# 2. Intelligence & Telemetry (Dashboard & Analytics)
# ============================================================

@extend_schema(tags=["Admin - Telemetry"], responses={200: AdminDashboardResponseSerializer})
class AdminDashboardView(APIView):
    """Live aggregated dashboard metrics and charts."""

    permission_classes = [IsStaffAdmin]

    def get(self, request):
        summary = AnalyticsSelector.get_dashboard_summary()
        revenue_chart = AnalyticsSelector.get_revenue_time_series(days=30)
        channels = AnalyticsSelector.get_acquisition_channels()

        payload = {
            "kpis": summary["kpis"],
            "revenue_chart": revenue_chart,
            "acquisition_channels": channels,
            "status_distribution": summary["status_distribution"],
        }
        return Response(payload)


@extend_schema(
    tags=["Admin - Telemetry"],
    parameters=[
        OpenApiParameter(name="days", description="Number of lookback days (default: 30)", required=False, type=int)
    ],
    responses={200: AdminAnalyticsResponseSerializer},
)
class AdminAnalyticsView(APIView):
    """Deep commerce, financial analytics, cohort matrix, and unit economics."""

    permission_classes = [IsStaffAdmin]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        summary = AnalyticsSelector.get_dashboard_summary()
        revenue_chart = AnalyticsSelector.get_revenue_time_series(days=days)
        channels = AnalyticsSelector.get_acquisition_channels()
        top_products = AnalyticsSelector.get_top_products(limit=5)
        cohorts = AnalyticsSelector.get_cohort_retention()

        payload = {
            "kpis": summary["kpis"],
            "revenue_chart": revenue_chart,
            "acquisition_channels": channels,
            "top_products": top_products,
            "cohorts": cohorts,
        }
        return Response(payload)


# ============================================================
# 3. Order Management
# ============================================================

@extend_schema(
    tags=["Admin - Orders"],
    parameters=[
        OpenApiParameter(name="status", description="Filter by status (pending, processing, shipped, delivered, cancelled, refunded)", required=False, type=str),
        OpenApiParameter(name="search", description="Search by order number, patron email, name, phone", required=False, type=str),
        OpenApiParameter(name="date_from", description="Created at start date (ISO)", required=False, type=str),
        OpenApiParameter(name="date_to", description="Created at end date (ISO)", required=False, type=str),
    ],
    responses={200: AdminOrderListSerializer(many=True)},
)
class AdminOrderListView(generics.ListAPIView):
    """Paginated, filterable order master manifest."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminOrderListSerializer

    def get_queryset(self):
        params = self.request.query_params
        return AdminOrderSelector.get_orders_queryset(
            status=params.get("status"),
            search=params.get("search"),
            date_from=params.get("date_from"),
            date_to=params.get("date_to"),
        )


@extend_schema(tags=["Admin - Orders"], responses={200: AdminOrderDetailSerializer})
class AdminOrderDetailView(generics.RetrieveAPIView):
    """Retrieves full order record with line item snapshots, address, and payment transactions."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminOrderDetailSerializer

    def get_object(self):
        return AdminOrderSelector.get_order_detail(self.kwargs["pk"])


@extend_schema(tags=["Admin - Orders"], request=AdminOrderStatusUpdateSerializer, responses={200: AdminOrderDetailSerializer})
class AdminOrderStatusUpdateView(APIView):
    """Transitions order status enforcing state machine integrity."""

    permission_classes = [IsStaffAdmin]

    def patch(self, request, pk):
        serializer = AdminOrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = AdminOrderSelector.get_order_detail(pk)
        updated = AdminOrderService.update_status(
            order=order,
            new_status=serializer.validated_data["status"],
            actor_user=request.user,
            request=request,
        )
        return Response(AdminOrderDetailSerializer(updated).data)


@extend_schema(tags=["Admin - Orders"], responses={200: AdminOrderDetailSerializer})
class AdminOrderCancelView(APIView):
    """Cancels order and atomically restores inventory stock."""

    permission_classes = [IsStaffAdmin]

    def post(self, request, pk):
        order = AdminOrderSelector.get_order_detail(pk)
        updated = AdminOrderService.cancel_order(
            order=order,
            actor_user=request.user,
            request=request,
        )
        return Response(AdminOrderDetailSerializer(updated).data)


@extend_schema(tags=["Admin - Orders"], request=AdminOrderBulkStatusSerializer)
class AdminOrderBulkStatusView(APIView):
    """Bulk updates status across multiple orders atomically."""

    permission_classes = [IsStaffAdmin]

    def post(self, request):
        serializer = AdminOrderBulkStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = AdminOrderService.bulk_update_status(
            order_ids=serializer.validated_data["order_ids"],
            new_status=serializer.validated_data["status"],
            actor_user=request.user,
            request=request,
        )
        return Response(result)


# ============================================================
# 4. Catalog & Artifact Administration
# ============================================================

@extend_schema(
    tags=["Admin - Products"],
    parameters=[
        OpenApiParameter(name="category", description="Category slug/ID filter", required=False, type=str),
        OpenApiParameter(name="stock", description="Stock level filter (LOW / OUT)", required=False, type=str),
        OpenApiParameter(name="search", description="Search in name, slug, SKU", required=False, type=str),
    ],
    responses={200: AdminProductListSerializer(many=True), 201: AdminProductDetailSerializer},
)
class AdminProductListCreateView(generics.ListCreateAPIView):
    """Lists catalog items or registers a new Product artifact."""

    permission_classes = [IsStaffAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminProductCreateUpdateSerializer
        return AdminProductListSerializer

    def get_queryset(self):
        params = self.request.query_params
        return AdminProductSelector.get_products_queryset(
            category=params.get("category"),
            stock=params.get("stock"),
            search=params.get("search"),
        )

    def perform_create(self, serializer):
        product = AdminProductService.create_product(
            validated_data=serializer.validated_data,
            actor_user=self.request.user,
            request=self.request,
        )
        serializer.instance = product


@extend_schema(tags=["Admin - Products"], responses={200: AdminProductDetailSerializer})
class AdminProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Inspects, updates, or deletes a product artifact."""

    permission_classes = [IsStaffAdmin]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return AdminProductCreateUpdateSerializer
        return AdminProductDetailSerializer

    def get_object(self):
        return AdminProductSelector.get_product_detail(self.kwargs["pk"])

    def perform_update(self, serializer):
        product = AdminProductService.update_product(
            product=self.get_object(),
            validated_data=serializer.validated_data,
            actor_user=self.request.user,
            request=self.request,
        )
        serializer.instance = product

    def perform_destroy(self, instance):
        AdminProductService.delete_product(
            product=instance,
            actor_user=self.request.user,
            request=self.request,
        )


# ============================================================
# 5. Inventory Operations
# ============================================================

@extend_schema(
    tags=["Admin - Inventory"],
    parameters=[
        OpenApiParameter(name="category", description="Category filter", required=False, type=str),
        OpenApiParameter(name="stock", description="LOW (≤10) or OUT (0)", required=False, type=str),
        OpenApiParameter(name="search", description="Search SKU, name, product", required=False, type=str),
    ],
    responses={200: AdminInventoryVariantSerializer(many=True)},
)
class AdminInventoryListView(generics.ListAPIView):
    """Dedicated inventory view of all product variants and reserve levels."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminInventoryVariantSerializer

    def get_queryset(self):
        params = self.request.query_params
        return AdminProductSelector.get_inventory_queryset(
            category=params.get("category"),
            stock_filter=params.get("stock"),
            search=params.get("search"),
        )


@extend_schema(tags=["Admin - Inventory"], request=AdminInventoryStockUpdateSerializer, responses={200: AdminInventoryVariantSerializer})
class AdminInventoryStockUpdateView(APIView):
    """Updates inventory stock level for a specific ProductVariant SKU."""

    permission_classes = [IsStaffAdmin]

    def patch(self, request, pk):
        serializer = AdminInventoryStockUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        variant = get_object_or_404(ProductVariant, id=pk)
        updated = AdminProductService.update_variant_stock(
            variant=variant,
            new_stock=serializer.validated_data["stock"],
            actor_user=request.user,
            request=request,
        )
        return Response(AdminInventoryVariantSerializer(updated).data)


@extend_schema(tags=["Admin - Inventory"], request=AdminInventoryBatchStockSerializer)
class AdminInventoryBatchStockView(APIView):
    """Batch updates inventory levels across multiple SKUs atomically."""

    permission_classes = [IsStaffAdmin]

    def post(self, request):
        serializer = AdminInventoryBatchStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        results = AdminProductService.batch_update_stock(
            items=serializer.validated_data["items"],
            actor_user=request.user,
            request=request,
        )
        return Response(results)


# ============================================================
# 6. Category Administration
# ============================================================

@extend_schema(tags=["Admin - Categories"], responses={200: AdminCategorySummarySerializer(many=True)})
class AdminCategoryListView(generics.ListCreateAPIView):
    """Lists categories or registers a new category."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminCategorySummarySerializer
    queryset = Category.objects.all().order_by("name")


@extend_schema(tags=["Admin - Categories"], responses={200: AdminCategorySummarySerializer})
class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Inspects, updates, or deletes a category."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminCategorySummarySerializer
    queryset = Category.objects.all()


# ============================================================
# 7. Customer & Patron Directory
# ============================================================

@extend_schema(
    tags=["Admin - Customers"],
    parameters=[
        OpenApiParameter(name="status", description="Filter by status (ACTIVE / SUSPENDED)", required=False, type=str),
        OpenApiParameter(name="search", description="Search patron name, email, phone", required=False, type=str),
    ],
    responses={200: AdminCustomerListSerializer(many=True)},
)
class AdminCustomerListView(generics.ListAPIView):
    """Patron directory with computed lifetime value, orders count, and verification status."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminCustomerListSerializer

    def get_queryset(self):
        params = self.request.query_params
        return AdminUserSelector.get_customers_queryset(
            status=params.get("status"),
            search=params.get("search"),
        )


@extend_schema(tags=["Admin - Customers"], responses={200: AdminCustomerDetailSerializer})
class AdminCustomerDetailView(generics.RetrieveAPIView):
    """Comprehensive customer dossier with order history and address book."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminCustomerDetailSerializer

    def get_object(self):
        return AdminUserSelector.get_customer_detail(self.kwargs["pk"])


@extend_schema(tags=["Admin - Customers"], responses={200: AdminCustomerListSerializer})
class AdminCustomerToggleStatusView(APIView):
    """Toggles active/suspended clearance for a customer account."""

    permission_classes = [IsStaffAdmin]

    def post(self, request, pk):
        user = get_object_or_404(User, id=pk)
        updated = AdminUserService.toggle_status(user, actor_user=request.user, request=request)
        return Response(AdminCustomerListSerializer(updated).data)


# ============================================================
# 8. Review & Q&A Moderation
# ============================================================

@extend_schema(
    tags=["Admin - Moderation"],
    parameters=[
        OpenApiParameter(name="is_approved", description="Filter approved/pending (true/false)", required=False, type=bool),
        OpenApiParameter(name="rating", description="Filter by rating (1-5)", required=False, type=int),
        OpenApiParameter(name="search", description="Search review content, product, author", required=False, type=str),
    ],
    responses={200: AdminReviewListSerializer(many=True)},
)
class AdminReviewListView(generics.ListAPIView):
    """Product reviews moderation queue."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminReviewListSerializer

    def get_queryset(self):
        params = self.request.query_params
        is_approved = None
        if "is_approved" in params:
            is_approved = params.get("is_approved").lower() in ("true", "1", "yes")

        return AdminReviewSelector.get_reviews_queryset(
            is_approved=is_approved,
            rating=params.get("rating"),
            search=params.get("search"),
        )


@extend_schema(tags=["Admin - Moderation"], request=AdminModerationActionSerializer, responses={200: AdminReviewListSerializer})
class AdminReviewModerateView(APIView):
    """Approves or rejects a product review."""

    permission_classes = [IsStaffAdmin]

    def post(self, request, pk):
        serializer = AdminModerationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = get_object_or_404(Review, id=pk)
        updated = AdminReviewService.moderate_review(
            review=review,
            is_approved=serializer.validated_data["is_approved"],
            actor_user=request.user,
            request=request,
        )
        return Response(AdminReviewListSerializer(updated).data)


@extend_schema(tags=["Admin - Moderation"])
class AdminReviewDeleteView(generics.DestroyAPIView):
    """Deletes a product review permanently."""

    permission_classes = [IsStaffAdmin]
    queryset = Review.objects.all()

    def perform_destroy(self, instance):
        AdminReviewService.delete_review(instance, actor_user=self.request.user, request=self.request)


@extend_schema(
    tags=["Admin - Moderation"],
    parameters=[
        OpenApiParameter(name="is_approved", description="Filter approved/pending (true/false)", required=False, type=bool),
        OpenApiParameter(name="search", description="Search comment text, author", required=False, type=str),
    ],
    responses={200: AdminCommentListSerializer(many=True)},
)
class AdminCommentListView(generics.ListAPIView):
    """Threaded product inquiries and technical discussion queue."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminCommentListSerializer

    def get_queryset(self):
        params = self.request.query_params
        is_approved = None
        if "is_approved" in params:
            is_approved = params.get("is_approved").lower() in ("true", "1", "yes")

        return AdminReviewSelector.get_comments_queryset(
            is_approved=is_approved,
            search=params.get("search"),
        )


@extend_schema(tags=["Admin - Moderation"], request=AdminModerationActionSerializer, responses={200: AdminCommentListSerializer})
class AdminCommentModerateView(APIView):
    """Approves or dismisses a product inquiry comment."""

    permission_classes = [IsStaffAdmin]

    def post(self, request, pk):
        serializer = AdminModerationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = get_object_or_404(ProductComment, id=pk)
        updated = AdminReviewService.moderate_comment(
            comment=comment,
            is_approved=serializer.validated_data["is_approved"],
            actor_user=request.user,
            request=request,
        )
        return Response(AdminCommentListSerializer(updated).data)


@extend_schema(tags=["Admin - Moderation"], request=AdminCommentReplyCreateSerializer, responses={201: AdminCommentListSerializer})
class AdminCommentReplyView(APIView):
    """Publishes an official staff reply to a product comment."""

    permission_classes = [IsStaffAdmin]

    def post(self, request, pk):
        serializer = AdminCommentReplyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parent = get_object_or_404(ProductComment, id=pk)
        reply = AdminReviewService.reply_to_comment(
            parent_comment=parent,
            content=serializer.validated_data["content"],
            staff_user=request.user,
            request=request,
        )
        return Response(AdminCommentListSerializer(reply).data, status=status.HTTP_201_CREATED)


# ============================================================
# 9. Payment Transactions
# ============================================================

@extend_schema(
    tags=["Admin - Payments"],
    parameters=[
        OpenApiParameter(name="status", description="Payment status filter", required=False, type=str),
        OpenApiParameter(name="payment_method", description="Payment method filter", required=False, type=str),
        OpenApiParameter(name="gateway", description="Payment gateway filter", required=False, type=str),
        OpenApiParameter(name="search", description="Search transaction ID, order number", required=False, type=str),
    ],
    responses={200: AdminPaymentListSerializer(many=True)},
)
class AdminPaymentListView(generics.ListAPIView):
    """Payment transaction telemetry and settlement logs."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminPaymentListSerializer

    def get_queryset(self):
        params = self.request.query_params
        return AdminPaymentSelector.get_payments_queryset(
            status=params.get("status"),
            payment_method=params.get("payment_method"),
            gateway=params.get("gateway"),
            search=params.get("search"),
        )


@extend_schema(tags=["Admin - Payments"], responses={200: AdminPaymentDetailSerializer})
class AdminPaymentDetailView(generics.RetrieveAPIView):
    """Inspects detailed gateway response and raw payment payload."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminPaymentDetailSerializer

    def get_object(self):
        return AdminPaymentSelector.get_payment_detail(self.kwargs["pk"])


# ============================================================
# 10. Operational Notifications & Audit Logs
# ============================================================

@extend_schema(tags=["Admin - Notifications"], responses={200: AdminNotificationSerializer(many=True)})
class AdminNotificationListView(generics.ListAPIView):
    """Active operational alerts for administrators."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminNotificationSerializer
    queryset = AdminNotification.objects.all().order_by("-created_at")[:50]


@extend_schema(tags=["Admin - Notifications"], responses={200: AdminNotificationSerializer})
class AdminNotificationReadView(APIView):
    """Marks a single notification as read."""

    permission_classes = [IsStaffAdmin]

    def post(self, request, pk):
        notif = get_object_or_404(AdminNotification, id=pk)
        notif.is_read = True
        notif.save(update_fields=["is_read", "updated_at"])
        return Response(AdminNotificationSerializer(notif).data)


@extend_schema(tags=["Admin - Notifications"])
class AdminNotificationReadAllView(APIView):
    """Marks all notifications as read."""

    permission_classes = [IsStaffAdmin]

    def post(self, request):
        AdminNotification.objects.filter(is_read=False).update(is_read=True, updated_at=timezone.now())
        return Response({"detail": "All notifications marked as read."})


@extend_schema(tags=["Admin - Audit"], responses={200: AdminAuditLogSerializer(many=True)})
class AdminAuditLogListView(generics.ListAPIView):
    """Immutable audit trail of administrative operations."""

    permission_classes = [IsStaffAdmin]
    serializer_class = AdminAuditLogSerializer

    def get_queryset(self):
        qs = AuditLog.objects.all().order_by("-created_at")
        action = self.request.query_params.get("action")
        resource = self.request.query_params.get("resource_type")
        if action:
            qs = qs.filter(action__icontains=action)
        if resource:
            qs = qs.filter(resource_type__iexact=resource)
        return qs[:100]


# ============================================================
# 11. System Settings
# ============================================================

@extend_schema(tags=["Admin - Settings"], responses={200: AdminSystemSettingSerializer}, request=AdminSystemSettingSerializer)
class AdminSettingsView(APIView):
    """Retrieves or persists centralized store configuration and maintenance mode."""

    permission_classes = [IsStaffAdmin]

    def get(self, request):
        setting_obj = SystemSetting.objects.filter(key="store_config").first()
        data = setting_obj.value if setting_obj else {
            "store_name": "PARADOX SHOP ATELIER",
            "store_url": "https://shop.paradox.art",
            "currency": "TOMAN",
            "tax_rate": 9.0,
            "shipping_fee_base": 65000,
            "free_shipping_threshold": 5000000,
            "maintenance_mode": False,
            "webhook_url": "https://api.paradox.art/webhooks/ops",
        }
        if setting_obj:
            data["updated_at"] = setting_obj.updated_at
        return Response(data)

    def patch(self, request):
        serializer = AdminSystemSettingSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        setting_obj, _ = SystemSetting.objects.get_or_create(key="store_config")
        current_val = setting_obj.value or {}
        current_val.update(serializer.validated_data)
        setting_obj.value = current_val
        setting_obj.save()

        # Audit log
        from common.audit_services import record_audit_log
        record_audit_log(
            action="SETTINGS_UPDATE",
            resource_type="SETTINGS",
            resource_id="store_config",
            user=request.user,
            request=request,
            metadata={"updated_keys": list(serializer.validated_data.keys())},
        )

        return Response(setting_obj.value)


# ============================================================
# 12. Shipping Methods & Logistics Admin
# ============================================================

@extend_schema(tags=["Admin - Shipping"], responses={200: ShippingMethodSerializer(many=True)})
class AdminShippingMethodListView(generics.ListCreateAPIView):
    """Lists all shipping methods or provisions a new shipping rate tier."""

    permission_classes = [IsStaffAdmin]
    serializer_class = ShippingMethodSerializer
    queryset = ShippingMethod.objects.all().order_by("sort_order", "base_rate")
    pagination_class = None


@extend_schema(tags=["Admin - Shipping"], responses={200: ShippingMethodSerializer})
class AdminShippingMethodDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Inspects, reconfigures (rates, thresholds, delivery days), or removes a shipping method."""

    permission_classes = [IsStaffAdmin]
    serializer_class = ShippingMethodSerializer
    queryset = ShippingMethod.objects.all()


from rest_framework import serializers as drf_serializers


class AdminOrderShipmentUpdateSerializer(drf_serializers.Serializer):
    status = drf_serializers.ChoiceField(choices=Shipment.ShipmentStatus.choices, required=False)
    tracking_code = drf_serializers.CharField(max_length=100, required=False, allow_blank=True)
    carrier_name = drf_serializers.CharField(max_length=100, required=False, allow_blank=True)
    notes = drf_serializers.CharField(max_length=500, required=False, allow_blank=True)


@extend_schema(tags=["Admin - Shipping"], request=AdminOrderShipmentUpdateSerializer, responses={200: ShipmentSerializer})
class AdminOrderShipmentUpdateView(APIView):
    """Updates courier tracking, carrier details, or transitions shipment state for an order."""

    permission_classes = [IsStaffAdmin]

    def patch(self, request, pk):
        serializer = AdminOrderShipmentUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        order = get_object_or_404(Order, id=pk)
        shipment = getattr(order, "shipment", None)
        if not shipment:
            return Response({"detail": "No shipment associated with this order."}, status=status.HTTP_404_NOT_FOUND)

        data = serializer.validated_data
        if "carrier_name" in data:
            shipment.carrier_name = data["carrier_name"]
        if "tracking_code" in data:
            shipment.tracking_code = data["tracking_code"]
        if "notes" in data:
            shipment.notes = data["notes"]
        shipment.save()

        if "status" in data and data["status"] != shipment.status:
            shipment = update_shipment_status(shipment, data["status"], notes=data.get("notes"))

        return Response(ShipmentSerializer(shipment).data)


# ============================================================
# 10. Promotions & Coupons
# ============================================================

@extend_schema(
    tags=["Admin - Promotions"],
    responses={200: AdminPromotionSerializer(many=True)},
)
class AdminPromotionListCreateView(APIView):
    """List all promotions or create a new one."""

    permission_classes = [IsPromotionAdmin]

    def get(self, request):
        promotions = PromotionSelector.get_all_promotions()
        serializer = AdminPromotionSerializer(promotions, many=True)
        return Response(serializer.data)

    @extend_schema(request=AdminPromotionSerializer, responses={201: AdminPromotionSerializer})
    def post(self, request):
        serializer = AdminPromotionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        promotion = PromotionService.create_promotion(
            data=serializer.validated_data, request=request
        )
        return Response(
            AdminPromotionSerializer(promotion).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Admin - Promotions"])
class AdminPromotionDetailView(APIView):
    """Retrieve, update, or delete a promotion."""

    permission_classes = [IsPromotionAdmin]

    @extend_schema(responses={200: AdminPromotionSerializer})
    def get(self, request, pk):
        promotion = get_object_or_404(Promotion, pk=pk)
        return Response(AdminPromotionSerializer(promotion).data)

    @extend_schema(request=AdminPromotionSerializer, responses={200: AdminPromotionSerializer})
    def put(self, request, pk):
        promotion = get_object_or_404(Promotion, pk=pk)
        serializer = AdminPromotionSerializer(promotion, data=request.data)
        serializer.is_valid(raise_exception=True)
        promotion = PromotionService.update_promotion(
            promotion=promotion, data=serializer.validated_data, request=request
        )
        return Response(AdminPromotionSerializer(promotion).data)

    @extend_schema(request=AdminPromotionSerializer, responses={200: AdminPromotionSerializer})
    def patch(self, request, pk):
        promotion = get_object_or_404(Promotion, pk=pk)
        serializer = AdminPromotionSerializer(promotion, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        promotion = PromotionService.update_promotion(
            promotion=promotion, data=serializer.validated_data, request=request
        )
        return Response(AdminPromotionSerializer(promotion).data)

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        promotion = get_object_or_404(Promotion, pk=pk)
        promotion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Admin - Promotions"], responses={200: AdminPromotionSerializer})
class AdminPromotionToggleView(APIView):
    """Toggle a promotion's active status."""

    permission_classes = [IsPromotionAdmin]

    def post(self, request, pk):
        promotion = get_object_or_404(Promotion, pk=pk)
        promotion = PromotionService.toggle_activation(promotion=promotion, request=request)
        return Response(AdminPromotionSerializer(promotion).data)


@extend_schema(
    tags=["Admin - Coupons"],
    responses={200: AdminCouponSerializer(many=True)},
)
class AdminCouponListCreateView(APIView):
    """List all coupons or create a new one."""

    permission_classes = [IsPromotionAdmin]

    def get(self, request):
        coupons = CouponSelector.get_all_coupons()
        serializer = AdminCouponSerializer(coupons, many=True)
        return Response(serializer.data)

    @extend_schema(request=AdminCouponSerializer, responses={201: AdminCouponSerializer})
    def post(self, request):
        serializer = AdminCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coupon = CouponService.create_coupon(
            data=serializer.validated_data, request=request
        )
        return Response(
            AdminCouponSerializer(coupon).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Admin - Coupons"])
class AdminCouponDetailView(APIView):
    """Retrieve, update, or delete a coupon."""

    permission_classes = [IsPromotionAdmin]

    @extend_schema(responses={200: AdminCouponSerializer})
    def get(self, request, pk):
        coupon = get_object_or_404(Coupon, pk=pk)
        return Response(AdminCouponSerializer(coupon).data)

    @extend_schema(request=AdminCouponSerializer, responses={200: AdminCouponSerializer})
    def put(self, request, pk):
        coupon = get_object_or_404(Coupon, pk=pk)
        serializer = AdminCouponSerializer(coupon, data=request.data)
        serializer.is_valid(raise_exception=True)
        coupon = CouponService.update_coupon(
            coupon=coupon, data=serializer.validated_data, request=request
        )
        return Response(AdminCouponSerializer(coupon).data)

    @extend_schema(request=AdminCouponSerializer, responses={200: AdminCouponSerializer})
    def patch(self, request, pk):
        coupon = get_object_or_404(Coupon, pk=pk)
        serializer = AdminCouponSerializer(coupon, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        coupon = CouponService.update_coupon(
            coupon=coupon, data=serializer.validated_data, request=request
        )
        return Response(AdminCouponSerializer(coupon).data)

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        coupon = get_object_or_404(Coupon, pk=pk)
        coupon.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Admin - Coupons"], responses={200: AdminCouponSerializer})
class AdminCouponToggleView(APIView):
    """Toggle a coupon's active status."""

    permission_classes = [IsPromotionAdmin]

    def post(self, request, pk):
        coupon = get_object_or_404(Coupon, pk=pk)
        coupon = CouponService.toggle_activation(coupon=coupon, request=request)
        return Response(AdminCouponSerializer(coupon).data)


@extend_schema(
    tags=["Admin - Coupons"],
    responses={200: AdminCouponUsageSerializer(many=True)},
)
class AdminCouponUsageListView(APIView):
    """List usage records for a specific coupon."""

    permission_classes = [IsPromotionAdmin]

    def get(self, request, pk):
        coupon = get_object_or_404(Coupon, pk=pk)
        usages = CouponSelector.get_coupon_usages(coupon)
        serializer = AdminCouponUsageSerializer(usages, many=True)
        return Response(serializer.data)


@extend_schema(
    tags=["Admin - Promotions"],
    responses={200: AdminPromotionReportSerializer},
)
class AdminPromotionReportsView(APIView):
    """Aggregated reporting data and telemetry for promotions and vouchers."""

    permission_classes = [IsPromotionAdmin]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        days = request.query_params.get("days")

        parsed_start = None
        parsed_end = None

        if days:
            try:
                days_int = int(days)
                parsed_start = timezone.now() - timezone.timedelta(days=days_int)
            except (ValueError, TypeError):
                pass
        elif start_date:
            try:
                parsed_start = timezone.datetime.fromisoformat(start_date)
            except (ValueError, TypeError):
                pass

        if end_date:
            try:
                parsed_end = timezone.datetime.fromisoformat(end_date)
            except (ValueError, TypeError):
                pass

        reports = PromotionReportSelector.get_promotion_reports(
            start_date=parsed_start, end_date=parsed_end
        )
        serializer = AdminPromotionReportSerializer(reports)
        return Response(serializer.data)

