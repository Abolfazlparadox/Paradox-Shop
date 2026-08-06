from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Payment model.
    """
    list_display = ('order', 'amount', 'status', 'payment_method', 'transaction_id', 'created_at')
    list_filter = ('status', 'payment_method', 'gateway')
    search_fields = ('transaction_id', 'order__order_number')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'gateway_response')
