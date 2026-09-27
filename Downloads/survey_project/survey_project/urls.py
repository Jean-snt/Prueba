# survey_project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.http import HttpResponseRedirect
from django.conf import settings
from django.conf.urls.static import static
from surveys.views.health_views import health_check, readiness_check, liveness_check

def redirect_to_frontend(request):
    """Redirige a la aplicación React en el puerto 3000"""
    frontend_url = settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else 'http://localhost:3000'
    return HttpResponseRedirect(f'{frontend_url}/dashboard')

urlpatterns = [
    # Health checks para AWS App Runner / Load Balancer
    path('health/', health_check, name='health_check'),
    path('readiness/', readiness_check, name='readiness_check'),
    path('liveness/', liveness_check, name='liveness_check'),
    
    # Redirige la raíz / al dashboard de Cuestom en React
    path('', redirect_to_frontend),

    path('admin/', admin.site.urls),

    # Todas las URLs de la app surveys bajo /encuestas/
    path('encuestas/', include('surveys.urls', namespace='surveys')),

    # URLs de autenticación (login/logout) en /accounts/
    path('accounts/', include('django.contrib.auth.urls')),
]

# Servir archivos de medios en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
