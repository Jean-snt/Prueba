from django.db import models
from django.contrib.auth.models import User

class Survey(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_nsfw = models.BooleanField(default=False)  # ← NUEVO campo NSFW
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Nuevo campo para imagen
    image = models.ImageField(upload_to='survey_images/', blank=True, null=True)
    
    # CRÍTICO: Campo para almacenar género en momento de creación
    creator_gender = models.CharField(
        max_length=1, 
        choices=[('M', 'Masculino'), ('F', 'Femenino'), ('A', 'Anónimo')],
        default='A',
        help_text='Género del creador en el momento de crear la encuesta'
    )

    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='surveys')
    
    # ✅ NUEVO: Campo para identidad dinámica del creador
    creator_identity = models.JSONField(null=True, blank=True, verbose_name="Identidad del Creador")
    
    # ✅ NUEVO: Campo para persistir el username al momento de creación
    creator_display_name = models.CharField(max_length=150, blank=True, verbose_name="Nombre del Creador (Histórico)")
    
    # ✅ NUEVO: Campos para likes/dislikes
    likes_count = models.IntegerField(default=0)
    dislikes_count = models.IntegerField(default=0)
    liked_by = models.ManyToManyField(User, related_name='liked_surveys', blank=True)
    disliked_by = models.ManyToManyField(User, related_name='disliked_surveys', blank=True)
    
    # ✅ NUEVO: Campo para contador de vistas
    views_count = models.IntegerField(default=0, verbose_name="Contador de Vistas")
    
    # ✅ NUEVO: Campo para auto-destrucción VIP (FOMO)
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Expiración")

    def save(self, *args, **kwargs):
        """
        Override save para capturar el username del creador al momento de creación
        """
        # ✅ PERSISTENCIA HISTÓRICA: Guardar username SIEMPRE en creación
        if not self.pk and self.creator:  # Solo en creación nueva
            self.creator_display_name = self.creator.username
        
        # ✅ CLEANUP: Si por alguna razón creator_display_name está vacío, usar username actual
        if not self.creator_display_name and self.creator:
            self.creator_display_name = self.creator.username
        
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Question(models.Model):
    QUESTION_TYPES = [
        ('text', 'Texto libre'),
        ('radio', 'Opción única'),
        ('checkbox', 'Opción múltiple'),
        ('select', 'Lista desplegable'),
        ('scale', 'Escala 1-5'),
    ]

    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='questions')
    text = models.CharField(max_length=500)
    type = models.CharField(max_length=20, choices=QUESTION_TYPES)

    def __str__(self):
        return self.text


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.question.text} - {self.text}"
