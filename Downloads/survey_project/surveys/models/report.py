from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from .survey import Survey
from .comment import Comment


class Report(models.Model):
    REASON_CHOICES = [
        ('inappropriate', 'Contenido Inapropiado'),
        ('spam', 'Spam'),
        ('harassment', 'Acoso'),
        ('other', 'Otro'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('reviewed', 'Revisado'),
        ('resolved', 'Resuelto'),
        ('dismissed', 'Desestimado'),
    ]

    # Usuario que reporta
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_made')
    
    # Contenido reportado (puede ser Survey o Comment)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Detalles del reporte
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True, null=True, max_length=500, 
                                 verbose_name="Descripción adicional")
    
    # Estado y seguimiento
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='reports_reviewed')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True, null=True, max_length=1000,
                                 verbose_name="Notas del administrador")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Reporte"
        verbose_name_plural = "Reportes"
        # Evitar reportes duplicados del mismo usuario al mismo contenido
        unique_together = ['reporter', 'content_type', 'object_id']

    def __str__(self):
        content_name = str(self.content_object)[:50] if self.content_object else "Contenido eliminado"
        return f"Reporte de {self.reporter.username}: {content_name}"

    @property
    def content_type_name(self):
        """Retorna el nombre del tipo de contenido reportado"""
        if self.content_type.model == 'survey':
            return 'Encuesta'
        elif self.content_type.model == 'comment':
            return 'Comentario'
        return self.content_type.name

    @property
    def reported_content_preview(self):
        """Retorna una vista previa del contenido reportado"""
        if not self.content_object:
            return "Contenido eliminado"
        
        if isinstance(self.content_object, Survey):
            return f"Encuesta: {self.content_object.title}"
        elif isinstance(self.content_object, Comment):
            preview = self.content_object.content[:100]
            return f"Comentario: {preview}{'...' if len(self.content_object.content) > 100 else ''}"
        
        return str(self.content_object)

    @property
    def reporter_display_name(self):
        """Retorna el nombre para mostrar del usuario que reporta"""
        if hasattr(self.reporter, 'profile'):
            full_name = self.reporter.profile.get_full_name()
            if full_name:
                return f"{self.reporter.username} ({full_name})"
        return self.reporter.username

    def get_reason_display_with_icon(self):
        """Retorna el motivo con un icono"""
        icons = {
            'inappropriate': '🚫',
            'spam': '📧',
            'harassment': '⚠️',
            'other': '❓',
        }
        return f"{icons.get(self.reason, '❓')} {self.get_reason_display()}"

    def get_status_display_with_color(self):
        """Retorna el estado con información de color para el admin"""
        colors = {
            'pending': 'orange',
            'reviewed': 'blue',
            'resolved': 'green',
            'dismissed': 'gray',
        }
        return {
            'status': self.get_status_display(),
            'color': colors.get(self.status, 'gray')
        }

    def mark_as_reviewed(self, admin_user, notes=None):
        """Marca el reporte como revisado"""
        self.status = 'reviewed'
        self.reviewed_by = admin_user
        self.reviewed_at = models.timezone.now()
        if notes:
            self.admin_notes = notes
        self.save()

    def resolve(self, admin_user, notes=None):
        """Resuelve el reporte"""
        self.status = 'resolved'
        self.reviewed_by = admin_user
        self.reviewed_at = models.timezone.now()
        if notes:
            self.admin_notes = notes
        self.save()

    def dismiss(self, admin_user, notes=None):
        """Desestima el reporte"""
        self.status = 'dismissed'
        self.reviewed_by = admin_user
        self.reviewed_at = models.timezone.now()
        if notes:
            self.admin_notes = notes
        self.save()

    def can_be_reviewed_by(self, user):
        """Verifica si el usuario puede revisar este reporte"""
        return user.is_staff or user.is_superuser

    def get_related_reports(self):
        """Obtiene otros reportes del mismo contenido"""
        return Report.objects.filter(
            content_type=self.content_type,
            object_id=self.object_id
        ).exclude(id=self.id)