"""
URL configuration for email_service project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from notifications.views import ContactViewSet, NotifyViewSet, HealthCheckView

# Create router for API endpoints
router = routers.DefaultRouter()
router.register(r'contact', ContactViewSet, basename='contact')
router.register(r'notify', NotifyViewSet, basename='notify')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('healthz/', HealthCheckView.as_view(), name='health_check'),
]

