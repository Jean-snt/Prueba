from django.db import models
from django.contrib.auth.models import User
from .survey import Survey


class VipFeedbackSubmission(models.Model):
    """
    Modelo para rastrear las sumisiones de feedback VIP (las 2 preguntas extra).
    Cada sumisión otorga +2 puntos al creador de la encuesta.
    """
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='vip_feedbacks')
    vip_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vip_feedbacks_given')
    question1_answer = models.TextField(max_length=500, help_text="Respuesta a la primera pregunta VIP")
    question2_answer = models.TextField(max_length=500, help_text="Respuesta a la segunda pregunta VIP")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('survey', 'vip_user')  # Un VIP solo puede enviar feedback una vez por encuesta
        verbose_name = 'VIP Feedback Submission'
        verbose_name_plural = 'VIP Feedback Submissions'
    
    def __str__(self):
        return f"VIP Feedback by {self.vip_user.username} on {self.survey.title}"
