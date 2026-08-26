from django.urls import path

from .views import (
    CarrierWebhookView,
    OrderShipmentDetailView,
    ShipmentPublicTrackView,
    ShippingCalculateView,
    ShippingMethodsListView,
)

app_name = "shipping"

urlpatterns = [
    path("methods/", ShippingMethodsListView.as_view(), name="methods-list"),
    path("calculate/", ShippingCalculateView.as_view(), name="calculate"),
    path("orders/<uuid:order_id>/shipment/", OrderShipmentDetailView.as_view(), name="order-shipment"),
    path("track/<str:tracking_code>/", ShipmentPublicTrackView.as_view(), name="public-track"),
    path("webhook/carrier/", CarrierWebhookView.as_view(), name="carrier-webhook"),
]
