"""
Serializers for the notifications app.
"""
from rest_framework import serializers
from .models import ContactMessage, NotificationLog, ServiceHealth


class ContactMessageSerializer(serializers.ModelSerializer):
    """
    Serializer para mensajes de contacto.
    """
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'message', 'created_at', 'status']
        read_only_fields = ['id', 'created_at', 'status']

    def validate_name(self, value):
        """Validar que el nombre no esté vacío."""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre es requerido.")
        return value.strip()

    def validate_email(self, value):
        """Validar formato de email."""
        if not value or not value.strip():
            raise serializers.ValidationError("El email es requerido.")
        return value.strip().lower()

    def validate_message(self, value):
        """Validar que el mensaje no esté vacío."""
        if not value or not value.strip():
            raise serializers.ValidationError("El mensaje es requerido.")
        return value.strip()


class ContactMessageCreateSerializer(serializers.Serializer):
    """
    Serializer para crear mensajes de contacto (endpoint público).
    """
    name = serializers.CharField(max_length=255, help_text="Nombre completo")
    email = serializers.EmailField(help_text="Dirección de email")
    message = serializers.CharField(help_text="Mensaje de contacto")

    def validate_name(self, value):
        """Validar que el nombre no esté vacío."""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre es requerido.")
        return value.strip()

    def validate_email(self, value):
        """Validar formato de email."""
        if not value or not value.strip():
            raise serializers.ValidationError("El email es requerido.")
        return value.strip().lower()

    def validate_message(self, value):
        """Validar que el mensaje no esté vacío."""
        if not value or not value.strip():
            raise serializers.ValidationError("El mensaje es requerido.")
        return value.strip()


class ContactResponseSerializer(serializers.Serializer):
    """
    Serializer para respuesta del endpoint de contacto.
    """
    status = serializers.CharField(default="queued", help_text="Estado del procesamiento")


class NotifySerializer(serializers.Serializer):
    """
    Serializer para notificaciones internas.
    """
    to = serializers.EmailField(help_text="Email destinatario")
    subject = serializers.CharField(max_length=255, help_text="Asunto del email")
    body = serializers.CharField(help_text="Cuerpo del mensaje")

    def validate_to(self, value):
        """Validar formato de email."""
        if not value or not value.strip():
            raise serializers.ValidationError("El email destinatario es requerido.")
        return value.strip().lower()

    def validate_subject(self, value):
        """Validar que el asunto no esté vacío."""
        if not value or not value.strip():
            raise serializers.ValidationError("El asunto es requerido.")
        return value.strip()

    def validate_body(self, value):
        """Validar que el cuerpo no esté vacío."""
        if not value or not value.strip():
            raise serializers.ValidationError("El cuerpo del mensaje es requerido.")
        return value.strip()


class NotificationLogSerializer(serializers.ModelSerializer):
    """
    Serializer para logs de notificaciones.
    """
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'to_email', 'subject', 'notification_type', 
            'sent_at', 'status', 'processing_time_ms'
        ]
        read_only_fields = ['id', 'sent_at']


class ServiceHealthSerializer(serializers.ModelSerializer):
    """
    Serializer para estado de salud de servicios.
    """
    class Meta:
        model = ServiceHealth
        fields = [
            'service_name', 'is_healthy', 'last_check', 
            'response_time_ms', 'error_message'
        ]
        read_only_fields = ['last_check']


class HealthCheckResponseSerializer(serializers.Serializer):
    """
    Serializer para respuesta del healthcheck.
    """
    status = serializers.CharField(help_text="Estado general del servicio")
    timestamp = serializers.DateTimeField(help_text="Timestamp de la verificación")
    services = ServiceHealthSerializer(many=True, help_text="Estado de servicios dependientes")
    uptime = serializers.CharField(help_text="Tiempo de actividad del servicio")


