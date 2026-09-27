from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models.survey import Survey, Question, Choice
# from .models.response import Response, Answer  # ← COMENTADO: Sistema unificado usa Comments
from .models.notification import Notification
from .models.user_profile import UserProfile
from .models.comment import Comment
from .models.report import Report
from .models.subscription import Subscription
from .models.password_reset import PasswordResetToken

class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1

class SurveyAdmin(admin.ModelAdmin):
    inlines = [QuestionInline]
    list_display = ('title', 'creator', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'description')

class QuestionAdmin(admin.ModelAdmin):
    inlines = [ChoiceInline]
    list_display = ('text', 'survey', 'type')
    list_filter = ('type', 'survey')

# ← COMENTADO: Sistema unificado usa Comments en lugar de Response
# class ResponseAdmin(admin.ModelAdmin):
#     list_display = ('survey', 'user', 'country', 'submitted_at')
#     list_filter = ('survey', 'country', 'submitted_at')
#     readonly_fields = ('submitted_at',)

# class AnswerAdmin(admin.ModelAdmin):
#     list_display = ('response', 'question', 'choice', 'text_answer')
#     list_filter = ('question__type',)

class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message_preview', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('user__username', 'message')
    readonly_fields = ('created_at',)
    
    def message_preview(self, obj):
        return obj.message[:50] + "..." if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Message'


class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_full_name', 'age', 'country', 'phone_number', 'is_verified', 'is_complete')
    list_filter = ('country', 'age', 'is_verified', 'created_at')
    search_fields = ('user__username', 'first_name', 'last_name', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'verification_code_expires')
    
    fieldsets = (
        ('Información Personal', {
            'fields': ('user', 'first_name', 'last_name', 'age', 'country', 'phone_number')
        }),
        ('Verificación', {
            'fields': ('is_verified', 'verification_code', 'verification_code_expires', 'verification_attempts'),
            'classes': ('collapse',)
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'Nombre completo'
    
    def is_complete(self, obj):
        return obj.is_complete
    is_complete.boolean = True
    is_complete.short_description = 'Perfil completo'
    
    def is_verified(self, obj):
        return obj.is_verified
    is_verified.boolean = True
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'survey', 'content_preview', 'is_reply', 'created_at', 'is_edited')
    list_filter = ('survey', 'is_edited', 'created_at')
    search_fields = ('author__username', 'content', 'survey__title')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Información del Comentario', {
            'fields': ('survey', 'author', 'parent', 'content')
        }),
        ('Estado', {
            'fields': ('is_edited',)
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Contenido'
    
    def is_reply(self, obj):
        return obj.is_reply
    is_reply.boolean = True
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'reporter_info', 'content_type_display', 'content_preview', 
        'reason_display', 'status_display', 'created_at', 'reviewed_by'
    )
    list_filter = ('status', 'reason', 'content_type', 'created_at')
    search_fields = ('reporter__username', 'description', 'admin_notes')
    readonly_fields = ('reporter', 'content_type', 'object_id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Información del Reporte', {
            'fields': ('reporter', 'content_type', 'object_id', 'reason', 'description')
        }),
        ('Contenido Reportado', {
            'fields': ('content_preview_admin',),
            'classes': ('collapse',)
        }),
        ('Estado y Revisión', {
            'fields': ('status', 'reviewed_by', 'reviewed_at', 'admin_notes')
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_reviewed', 'resolve_reports', 'dismiss_reports']
    
    def reporter_info(self, obj):
        return format_html(
            '<strong>{}</strong><br><small>{}</small>',
            obj.reporter.username,
            obj.reporter.email
        )
    reporter_info.short_description = 'Reportado por'
    
    def content_type_display(self, obj):
        icons = {
            'survey': '📊',
            'comment': '💬',
        }
        icon = icons.get(obj.content_type.model, '❓')
        return f"{icon} {obj.content_type_name}"
    content_type_display.short_description = 'Tipo'
    
    def content_preview(self, obj):
        preview = obj.reported_content_preview
        if len(preview) > 50:
            preview = preview[:50] + "..."
        return preview
    content_preview.short_description = 'Contenido'
    
    def content_preview_admin(self, obj):
        if not obj.content_object:
            return "❌ Contenido eliminado"
        
        if obj.content_type.model == 'survey':
            survey = obj.content_object
            admin_url = reverse('admin:surveys_survey_change', args=[survey.id])
            return format_html(
                '<div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">'
                '<h4>📊 Encuesta: <a href="{}" target="_blank">{}</a></h4>'
                '<p><strong>Descripción:</strong> {}</p>'
                '<p><strong>Creador:</strong> {}</p>'
                '<p><strong>Estado:</strong> {}</p>'
                '</div>',
                admin_url, survey.title, 
                survey.description or "Sin descripción",
                survey.creator.username if survey.creator else "Sin creador",
                "Activa" if survey.is_active else "Inactiva"
            )
        elif obj.content_type.model == 'comment':
            comment = obj.content_object
            admin_url = reverse('admin:surveys_comment_change', args=[comment.id])
            return format_html(
                '<div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">'
                '<h4>💬 Comentario: <a href="{}" target="_blank">Ver en admin</a></h4>'
                '<p><strong>Autor:</strong> {}</p>'
                '<p><strong>Encuesta:</strong> {}</p>'
                '<div style="background: #f5f5f5; padding: 8px; border-radius: 3px; margin-top: 8px;">'
                '<strong>Contenido:</strong><br>{}'
                '</div>'
                '</div>',
                admin_url,
                comment.author.username,
                comment.survey.title,
                comment.content
            )
        
        return "Contenido no disponible"
    content_preview_admin.short_description = 'Vista previa del contenido'
    
    def reason_display(self, obj):
        return obj.get_reason_display_with_icon()
    reason_display.short_description = 'Motivo'
    
    def status_display(self, obj):
        status_info = obj.get_status_display_with_color()
        colors = {
            'orange': '#ff9800',
            'blue': '#2196f3',
            'green': '#4caf50',
            'gray': '#9e9e9e',
        }
        color = colors.get(status_info['color'], '#9e9e9e')
        return format_html(
            '<span style="color: {}; font-weight: bold;">● {}</span>',
            color, status_info['status']
        )
    status_display.short_description = 'Estado'
    
    def mark_as_reviewed(self, request, queryset):
        updated = 0
        for report in queryset:
            if report.status == 'pending':
                report.mark_as_reviewed(request.user, "Marcado como revisado desde admin")
                updated += 1
        
        self.message_user(request, f'{updated} reporte(s) marcado(s) como revisado(s).')
    mark_as_reviewed.short_description = "Marcar como revisado"
    
    def resolve_reports(self, request, queryset):
        updated = 0
        for report in queryset:
            if report.status in ['pending', 'reviewed']:
                report.resolve(request.user, "Resuelto desde admin")
                updated += 1
        
        self.message_user(request, f'{updated} reporte(s) resuelto(s).')
    resolve_reports.short_description = "Resolver reportes"
    
    def dismiss_reports(self, request, queryset):
        updated = 0
        for report in queryset:
            if report.status in ['pending', 'reviewed']:
                report.dismiss(request.user, "Desestimado desde admin")
                updated += 1
        
        self.message_user(request, f'{updated} reporte(s) desestimado(s).')
    dismiss_reports.short_description = "Desestimar reportes"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'reporter', 'reviewed_by', 'content_type'
        )


class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        'user_info', 'plan_display', 'price', 'payment_method_display', 
        'status_display', 'payment_proof_display', 'created_at', 'days_remaining_display'
    )
    list_filter = ('plan_type', 'status', 'payment_method', 'created_at')
    search_fields = ('user__username', 'user__email', 'transaction_id')
    readonly_fields = ('created_at', 'updated_at', 'start_date', 'payment_proof_preview')
    
    fieldsets = (
        ('Información del Usuario', {
            'fields': ('user',)
        }),
        ('Plan y Pago', {
            'fields': ('plan_type', 'price', 'payment_method', 'transaction_id')
        }),
        ('Comprobante de Pago', {
            'fields': ('payment_proof', 'payment_proof_preview'),
            'classes': ('collapse',)
        }),
        ('Estado y Fechas', {
            'fields': ('status', 'start_date', 'end_date', 'created_at', 'updated_at')
        }),
        ('Notas del Administrador', {
            'fields': ('admin_notes',),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['approve_payments', 'reject_payments', 'activate_subscriptions']
    
    def user_info(self, obj):
        return format_html(
            '<strong>{}</strong><br><small>{}</small>',
            obj.user.username,
            obj.user.email
        )
    user_info.short_description = 'Usuario'
    
    def plan_display(self, obj):
        icons = {
            'monthly': '⭐',
            'quarterly': '💎',
            'annual': '🏆',
        }
        icon = icons.get(obj.plan_type, '⭐')
        return f"{icon} {obj.get_plan_type_display()}"
    plan_display.short_description = 'Plan'
    
    def payment_method_display(self, obj):
        icons = {
            'yape': '📱',
            'bcp': '🏦',
            'online': '💳',
        }
        icon = icons.get(obj.payment_method, '💳')
        return f"{icon} {obj.get_payment_method_display()}"
    payment_method_display.short_description = 'Método de Pago'
    
    def status_display(self, obj):
        colors = {
            'active': 'green',
            'pending': 'orange',
            'inactive': 'gray',
            'expired': 'red',
            'cancelled': 'gray',
            'rejected': 'red',
        }
        icons = {
            'active': '✅',
            'pending': '⏳',
            'inactive': '⚪',
            'expired': '❌',
            'cancelled': '🚫',
            'rejected': '❌',
        }
        color = colors.get(obj.status, 'gray')
        icon = icons.get(obj.status, '⚪')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            color, icon, obj.get_status_display()
        )
    status_display.short_description = 'Estado'
    
    def payment_proof_display(self, obj):
        if obj.payment_proof:
            return format_html(
                '<a href="{}" target="_blank">📄 Ver comprobante</a>',
                obj.payment_proof.url
            )
        return "❌ Sin comprobante"
    payment_proof_display.short_description = 'Comprobante'
    
    def payment_proof_preview(self, obj):
        if obj.payment_proof:
            file_url = obj.payment_proof.url
            file_name = obj.payment_proof.name.split('/')[-1]
            file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
            
            if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                # Es una imagen, mostrar preview
                return format_html(
                    '<div style="max-width: 300px;">'
                    '<img src="{}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">'
                    '<br><a href="{}" target="_blank">Ver en tamaño completo</a>'
                    '</div>',
                    file_url, file_url
                )
            else:
                # Es otro tipo de archivo, mostrar enlace
                return format_html(
                    '<div style="padding: 10px; border: 1px solid #ddd; border-radius: 5px;">'
                    '<p><strong>Archivo:</strong> {}</p>'
                    '<a href="{}" target="_blank" style="color: #007cba;">📄 Descargar archivo</a>'
                    '</div>',
                    file_name, file_url
                )
        return "No hay comprobante subido"
    payment_proof_preview.short_description = 'Vista previa del comprobante'
    
    def days_remaining_display(self, obj):
        if obj.status == 'active' and obj.end_date:
            days = obj.days_remaining
            if days > 7:
                color = 'green'
            elif days > 3:
                color = 'orange'
            else:
                color = 'red'
            return format_html(
                '<span style="color: {}; font-weight: bold;">{} días</span>',
                color, days
            )
        return "N/A"
    days_remaining_display.short_description = 'Días restantes'
    
    def approve_payments(self, request, queryset):
        updated = 0
        for subscription in queryset:
            if subscription.status == 'pending':
                subscription.approve_payment()
                subscription.user.profile.update_vip_status()
                updated += 1
        
        self.message_user(request, f'{updated} pago(s) aprobado(s) y suscripción(es) activada(s).')
    approve_payments.short_description = "Aprobar pagos pendientes"
    
    def reject_payments(self, request, queryset):
        updated = 0
        for subscription in queryset:
            if subscription.status == 'pending':
                subscription.reject_payment("Pago rechazado desde admin")
                subscription.user.profile.update_vip_status()
                updated += 1
        
        self.message_user(request, f'{updated} pago(s) rechazado(s).')
    reject_payments.short_description = "Rechazar pagos pendientes"
    
    def activate_subscriptions(self, request, queryset):
        updated = 0
        for subscription in queryset:
            if subscription.status == 'inactive':
                subscription.activate_subscription()
                subscription.user.profile.update_vip_status()
                updated += 1
        
        self.message_user(request, f'{updated} suscripción(es) activada(s).')
    activate_subscriptions.short_description = "Activar suscripciones"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = (
        'user_info', 'code', 'created_at', 'expires_at', 
        'attempts', 'is_blocked', 'is_expired_display', 'is_used', 'ip_address'
    )
    list_filter = ('is_used', 'is_blocked', 'created_at')
    search_fields = ('user__username', 'user__email', 'code', 'ip_address')
    readonly_fields = ('created_at', 'expires_at', 'is_expired_display', 'time_until_unblock_display')
    
    fieldsets = (
        ('Información del Token', {
            'fields': ('user', 'code', 'is_used')
        }),
        ('Seguridad y Bloqueo', {
            'fields': ('attempts', 'is_blocked', 'blocked_at', 'time_until_unblock_display')
        }),
        ('Fechas', {
            'fields': ('created_at', 'expires_at', 'is_expired_display')
        }),
        ('Información Adicional', {
            'fields': ('ip_address',),
            'classes': ('collapse',)
        }),
    )
    
    def user_info(self, obj):
        return format_html(
            '<strong>{}</strong><br><small>{}</small>',
            obj.user.username,
            obj.user.email
        )
    user_info.short_description = 'Usuario'
    
    def is_expired_display(self, obj):
        if obj.is_expired:
            return format_html(
                '<span style="color: red; font-weight: bold;">❌ Expirado</span>'
            )
        else:
            return format_html(
                '<span style="color: green; font-weight: bold;">✅ Válido</span>'
            )
    is_expired_display.short_description = 'Estado'
    
    def time_until_unblock_display(self, obj):
        if obj.is_blocked:
            seconds = obj.time_until_unblock
            if seconds > 0:
                minutes = seconds // 60
                secs = seconds % 60
                return f"{minutes}m {secs}s restantes"
            else:
                return "Desbloqueado automáticamente"
        return "No bloqueado"
    time_until_unblock_display.short_description = 'Tiempo hasta desbloqueo'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


admin.site.register(Survey, SurveyAdmin)
admin.site.register(Question, QuestionAdmin)
# admin.site.register(Response, ResponseAdmin)  # ← COMENTADO: Sistema unificado
# admin.site.register(Answer, AnswerAdmin)      # ← COMENTADO: Sistema unificado
admin.site.register(Notification, NotificationAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(Comment, CommentAdmin)
admin.site.register(Report, ReportAdmin)
admin.site.register(Subscription, SubscriptionAdmin)
admin.site.register(PasswordResetToken, PasswordResetTokenAdmin)
