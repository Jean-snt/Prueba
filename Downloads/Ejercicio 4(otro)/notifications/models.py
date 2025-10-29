"""
Models for the notifications app.
"""
import uuid
from django.db import models
from django.utils import timezone


class ContactMessage(models.Model):
    """
    Modelo para almacenar mensajes de contacto recibidos.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nombre")
    email = models.EmailField(verbose_name="Email")
    message = models.TextField(verbose_name="Mensaje")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de procesamiento")
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pendiente'),
            ('processing', 'Procesando'),
            ('sent', 'Enviado'),
            ('failed', 'Fallido'),
        ],
        default='pending',
        verbose_name="Estado"
    )
    retry_count = models.IntegerField(default=0, verbose_name="Número de reintentos")
    error_message = models.TextField(blank=True, null=True, verbose_name="Mensaje de error")

    class Meta:
        verbose_name = "Mensaje de Contacto"
        verbose_name_plural = "Mensajes de Contacto"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.email} ({self.status})"


class NotificationLog(models.Model):
    """
    Modelo para registrar logs de notificaciones enviadas.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact_message = models.ForeignKey(
        ContactMessage,
        on_delete=models.CASCADE,
        related_name='notification_logs',
        null=True,
        blank=True,
        verbose_name="Mensaje de contacto relacionado"
    )
    to_email = models.EmailField(verbose_name="Email destinatario")
    subject = models.CharField(max_length=255, verbose_name="Asunto")
    body = models.TextField(verbose_name="Cuerpo del mensaje")
    notification_type = models.CharField(
        max_length=50,
        choices=[
            ('contact', 'Contacto'),
            ('internal', 'Interna'),
            ('system', 'Sistema'),
        ],
        verbose_name="Tipo de notificación"
    )
    sent_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de envío")
    status = models.CharField(
        max_length=20,
        choices=[
            ('sent', 'Enviado'),
            ('failed', 'Fallido'),
            ('pending', 'Pendiente'),
        ],
        default='sent',
        verbose_name="Estado"
    )
    response_data = models.JSONField(null=True, blank=True, verbose_name="Datos de respuesta")
    processing_time_ms = models.IntegerField(null=True, blank=True, verbose_name="Tiempo de procesamiento (ms)")

    class Meta:
        verbose_name = "Log de Notificación"
        verbose_name_plural = "Logs de Notificaciones"
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.to_email} - {self.subject} ({self.status})"


class ServiceHealth(models.Model):
    """
    Modelo para registrar el estado de salud de los servicios dependientes.
    """
    service_name = models.CharField(max_length=100, verbose_name="Nombre del servicio")
    is_healthy = models.BooleanField(verbose_name="¿Está saludable?")
    last_check = models.DateTimeField(auto_now=True, verbose_name="Última verificación")
    response_time_ms = models.IntegerField(null=True, blank=True, verbose_name="Tiempo de respuesta (ms)")
    error_message = models.TextField(blank=True, null=True, verbose_name="Mensaje de error")

    class Meta:
        verbose_name = "Salud del Servicio"
        verbose_name_plural = "Salud de Servicios"
        ordering = ['-last_check']

    def __str__(self):
        status = "✅" if self.is_healthy else "❌"
        return f"{status} {self.service_name} - {self.last_check.strftime('%Y-%m-%d %H:%M:%S')}"

