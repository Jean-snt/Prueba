"""
Health Check Views para AWS App Runner y monitoreo
"""

from django.http import JsonResponse
from django.db import connection
from django.conf import settings
import os


def health_check(request):
    """
    Health check endpoint para AWS App Runner / Load Balancer
    Verifica: Base de datos y estado general del sistema
    
    Returns:
        200: Sistema saludable
        503: Sistema no disponible
    """
    checks = {
        'status': 'healthy',
        'environment': os.getenv('ENVIRONMENT', 'unknown'),
        'database': False,
        'errors': []
    }
    
    # Check 1: Base de datos
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        checks['database'] = True
    except Exception as e:
        checks['database'] = False
        checks['errors'].append(f'Database error: {str(e)}')
        checks['status'] = 'unhealthy'
    
    # Determinar código de estado HTTP
    status_code = 200 if checks['status'] == 'healthy' else 503
    
    return JsonResponse(checks, status=status_code)


def readiness_check(request):
    """
    Readiness check - verifica que la aplicación está lista para recibir tráfico
    """
    checks = {
        'ready': True,
        'checks': {
            'database': False,
            'migrations': False,
        }
    }
    
    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks['checks']['database'] = True
    except Exception:
        checks['checks']['database'] = False
        checks['ready'] = False
    
    # Check migrations (verificar que tabla existe)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM django_migrations")
        checks['checks']['migrations'] = True
    except Exception:
        checks['checks']['migrations'] = False
        checks['ready'] = False
    
    status_code = 200 if checks['ready'] else 503
    return JsonResponse(checks, status=status_code)


def liveness_check(request):
    """
    Liveness check - verifica que el contenedor está vivo (no bloqueado)
    """
    return JsonResponse({
        'alive': True,
        'timestamp': connection.cursor().execute("SELECT NOW()").fetchone()[0] if connection else None
    })
