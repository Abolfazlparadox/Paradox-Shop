from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile, Address

class UserProfileInline(admin.StackedInline):
    """
    Inline admin for UserProfile to be displayed within the User admin page.
    """
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fk_name = 'user'

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom User Admin configuration.
    """
    inlines = (UserProfileInline,)
    
    # Fields to display in the main list view
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active', 'created_at')
    list_filter = ('is_staff', 'is_active', 'groups')
    
    # Fields for searching
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    
    # Fields for the user creation/editing form
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone_number')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'password2'),
        }),
    )
    
    # Since we use email as username, we don't need the username field
    readonly_fields = ('last_login', 'created_at', 'updated_at')

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Address model.
    """
    list_display = ('user', 'title', 'province', 'city', 'is_default')
    list_filter = ('province', 'is_default')
    search_fields = ('user__email', 'recipient_name', 'city', 'postal_code')
    ordering = ('-created_at',)
