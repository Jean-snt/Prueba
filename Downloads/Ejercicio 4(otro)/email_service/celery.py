"""
Configuración de Celery para el servicio de emails.
"""
import os
from celery import Celery

# Configurar Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_service.settings')

app = Celery('email_service')

# Configurar Celery usando las settings de Django
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-descubrir tareas en todas las apps
app.autodiscover_tasks()

# Configuración adicional
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutos
    task_soft_time_limit=25 * 60,  # 25 minutos
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Configuración de colas
app.conf.task_routes = {
    'notifications.tasks.process_contact_message': {'queue': 'emails'},
    'notifications.tasks.send_internal_notification_async': {'queue': 'emails'},
    'notifications.tasks.cleanup_old_notification_logs': {'queue': 'maintenance'},
    'notifications.tasks.send_bulk_notifications': {'queue': 'emails'},
}

# Configuración de reintentos
app.conf.task_annotations = {
    'notifications.tasks.process_contact_message': {
        'rate_limit': '10/m',  # Máximo 10 tareas por minuto
    },
    'notifications.tasks.send_internal_notification_async': {
        'rate_limit': '20/m',  # Máximo 20 tareas por minuto
    },
}

@app.task(bind=True)
def debug_task(self):
    """Tarea de debug para verificar que Celery funciona."""
    print(f'Request: {self.request!r}')
    return 'Celery is working!'


