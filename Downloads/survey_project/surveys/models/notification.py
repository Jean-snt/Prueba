from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # ✅ FIX 3: Campo con CASCADE para eliminar notificaciones huérfanas
    survey = models.ForeignKey(
        'Survey', 
        on_delete=models.CASCADE,  # ✅ Eliminar notificación si se elimina la encuesta
        null=True, 
        blank=True,
        related_name='notifications',
        help_text="Encuesta relacionada (se elimina en cascada)"
    )
    notification_type = models.CharField(
        max_length=50, 
        default='general',
        choices=[
            ('comment', 'Comentario'),
            ('response', 'Respuesta'),
            ('survey', 'Encuesta'),
            ('general', 'General'),
            ('vip_karma', 'Karma VIP'),  # ✅ Agregado tipo VIP
        ],
        help_text="Tipo de notificación"
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:50]}..."

    def mark_as_read(self):
        """Marca la notificación como leída"""
        self.is_read = True
        self.save()