from django.db import models
from django.contrib.auth.models import User
from .survey import Survey
from django.utils import timezone


class Comment(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)  # ← PERMITIR NULL para usuarios anónimos
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField(max_length=1000, verbose_name="Contenido")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)
    # ✅ NUEVO: Campo para identidad dinámica
    dynamic_identity = models.JSONField(null=True, blank=True, verbose_name="Identidad Dinámica")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Comentario"
        verbose_name_plural = "Comentarios"

    def __str__(self):
        author_name = self.author.username if self.author else "Usuario anónimo"
        return f"Comentario de {author_name} en '{self.survey.title}'"

    @property
    def is_reply(self):
        """Verifica si es una respuesta a otro comentario"""
        return self.parent is not None

    @property
    def replies_count(self):
        """✅ FIX 3: Cuenta RECURSIVAMENTE todas las respuestas (hijos + nietos + ...)"""
        def count_all_replies(comment):
            count = comment.replies.count()  # Contar hijos directos
            for reply in comment.replies.all():
                count += count_all_replies(reply)  # Sumar nietos recursivamente
            return count
        
        return count_all_replies(self)

    def get_thread_comments(self):
        """Obtiene todos los comentarios del hilo (respuestas) ordenados cronológicamente"""
        return self.replies.all().order_by('created_at')

    def get_author_display_name(self):
        """Retorna el nombre para mostrar del autor (username o identidad dinámica)"""
        # ✅ NUEVO: Usar identidad dinámica si está disponible
        if self.dynamic_identity and not self.dynamic_identity.get('showRealName', True):
            return "Usuario anónimo"
        return self.author.username if self.author else "Usuario anónimo"

    def get_author_country(self):
        """Retorna el país del autor si está disponible"""
        if self.author and hasattr(self.author, 'profile') and self.author.profile.country:
            return self.author.profile.country
        return None

    def get_author_full_name(self):
        """Retorna el nombre completo del autor si está disponible"""
        # ✅ NUEVO: Usar identidad dinámica si está disponible
        if self.dynamic_identity and not self.dynamic_identity.get('showRealName', True):
            return ""
        if self.author and hasattr(self.author, 'profile'):
            return self.author.profile.get_full_name()
        return ""

    def get_dynamic_gender(self):
        """Retorna el género de la identidad dinámica o del perfil"""
        if self.dynamic_identity and self.dynamic_identity.get('gender'):
            return self.dynamic_identity['gender']
        if self.author and hasattr(self.author, 'profile'):
            return self.author.profile.gender
        return None

    def get_dynamic_age(self):
        """Retorna la edad de la identidad dinámica o del perfil"""
        if self.dynamic_identity and self.dynamic_identity.get('age'):
            try:
                return int(self.dynamic_identity['age'])
            except (ValueError, TypeError):
                pass
        if self.author and hasattr(self.author, 'profile'):
            return self.author.profile.age
        return None

    def can_edit(self, user):
        """Verifica si el usuario puede editar este comentario"""
        return self.author and self.author == user

    def can_delete(self, user):
        """Verifica si el usuario puede eliminar este comentario"""
        return (self.author and self.author == user) or self.survey.creator == user

    def get_time_since_created(self):
        """Retorna el tiempo transcurrido desde la creación"""
        now = timezone.now()
        diff = now - self.created_at
        
        if diff.days > 0:
            return f"hace {diff.days} día{'s' if diff.days != 1 else ''}"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"hace {hours} hora{'s' if hours != 1 else ''}"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"hace {minutes} minuto{'s' if minutes != 1 else ''}"
        else:
            return "hace unos segundos"