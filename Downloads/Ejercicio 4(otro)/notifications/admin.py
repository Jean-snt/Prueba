"""
Admin configuration for notifications app.
"""
from django.contrib import admin
from .models import ContactMessage, NotificationLog, ServiceHealth


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'status', 'created_at', 'retry_count']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'email', 'message']
    readonly_fields = ['id', 'created_at', 'processed_at']
    ordering = ['-created_at']


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['to_email', 'subject', 'notification_type', 'status', 'sent_at']
    list_filter = ['status', 'notification_type', 'sent_at']
    search_fields = ['to_email', 'subject', 'body']
    readonly_fields = ['id', 'sent_at']
    ordering = ['-sent_at']


@admin.register(ServiceHealth)
class ServiceHealthAdmin(admin.ModelAdmin):
    list_display = ['service_name', 'is_healthy', 'last_check', 'response_time_ms']
    list_filter = ['is_healthy', 'service_name']
    readonly_fields = ['last_check']
    ordering = ['-last_check']


