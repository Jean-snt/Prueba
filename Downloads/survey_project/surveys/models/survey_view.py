from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from .survey import Survey


class SurveyView(models.Model):
    """
    Modelo para rastrear las visualizaciones de encuestas por usuario
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='survey_views',
        verbose_name='Usuario'
    )
    
    survey = models.ForeignKey(
        Survey,
        on_delete=models.CASCADE,
        related_name='views',
        verbose_name='Encuesta'
    )
    
    viewed_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Fecha de Visualización',
        db_index=True
    )
    
    class Meta:
        verbose_name = 'Visualización de Encuesta'
        verbose_name_plural = 'Visualizaciones de Encuestas'
        ordering = ['-viewed_at']
        indexes = [
            models.Index(fields=['user', 'viewed_at']),
            models.Index(fields=['survey', 'viewed_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} vio {self.survey.title} el {self.viewed_at}"
