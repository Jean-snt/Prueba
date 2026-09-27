from django.db.models.signals import post_save
from django.dispatch import receiver
from .models.response import Response
from .models.notification import Notification


@receiver(post_save, sender=Response)
def create_response_notification(sender, instance, created, **kwargs):
    """
    Signal que se ejecuta cada vez que se crea una nueva respuesta.
    Genera una notificación para el creador de la encuesta.
    """
    if created and instance.survey.creator:
        # Solo crear notificación si la encuesta tiene un creador
        message = f"Nueva respuesta recibida en tu encuesta '{instance.survey.title}'"
        
        # Agregar información adicional si está disponible
        if instance.user:
            # Usar el username como identificador único
            display_name = instance.user.username
            if hasattr(instance.user, 'profile') and instance.user.profile.get_full_name():
                display_name = f"{instance.user.username} ({instance.user.profile.get_full_name()})"
            message += f" por {display_name}"
        
        if instance.country:
            message += f" desde {instance.country.name}"
        
        message += "."
        
        # Crear la notificación
        Notification.objects.create(
            user=instance.survey.creator,
            message=message
        )