from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

class Subscription(models.Model):
    """
    Modelo para manejar las suscripciones VIP de los usuarios
    """
    
    PLAN_CHOICES = [
        ('monthly', 'Mensual'),
        ('quarterly', 'Trimestral'),
        ('annual', 'Anual'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('pending', 'Pending Payment Review'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Payment Rejected'),
    ]
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='subscription',
        verbose_name='Usuario'
    )
    
    plan_type = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        default='monthly',
        verbose_name='Tipo de Plan'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='inactive',
        verbose_name='Estado'
    )
    
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Precio'
    )
    
    start_date = models.DateTimeField(
        default=timezone.now,
        verbose_name='Fecha de Inicio'
    )
    
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de Fin'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Actualización'
    )
    
    # Campos para pago manual
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('yape', 'Yape'),
            ('bcp', 'BCP'),
            ('paypal', 'PayPal'),
            ('online', 'Pago Online'),
        ],
        default='online',
        verbose_name='Método de Pago'
    )
    
    payment_proof = models.FileField(
        upload_to='vouchers/',
        null=True,
        blank=True,
        verbose_name='Comprobante de Pago'
    )
    
    transaction_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='ID de Transacción'
    )
    
    admin_notes = models.TextField(
        null=True,
        blank=True,
        verbose_name='Notas del Administrador'
    )
    
    class Meta:
        verbose_name = 'Suscripción'
        verbose_name_plural = 'Suscripciones'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.get_plan_type_display()} ({self.get_status_display()})"
    
    @property
    def is_active(self):
        """Verificar si la suscripción está activa y no ha expirado"""
        if self.status != 'active':
            return False
        
        if self.end_date and timezone.now() > self.end_date:
            # Auto-expirar suscripción
            self.status = 'expired'
            self.save()
            return False
        
        return True
    
    @property
    def days_remaining(self):
        """Días restantes de la suscripción"""
        if not self.end_date or self.status != 'active':
            return 0
        
        remaining = self.end_date - timezone.now()
        return max(0, remaining.days)
    
    def activate_subscription(self):
        """Activar suscripción y calcular fecha de fin"""
        self.status = 'active'
        self.start_date = timezone.now()
        
        # Calcular fecha de fin según el plan
        if self.plan_type == 'monthly':
            self.end_date = self.start_date + timedelta(days=30)
        elif self.plan_type == 'quarterly':
            self.end_date = self.start_date + timedelta(days=90)
        elif self.plan_type == 'annual':
            self.end_date = self.start_date + timedelta(days=365)
        
        self.save()
    
    def cancel_subscription(self):
        """Cancelar suscripción"""
        self.status = 'cancelled'
        self.save()
    
    @classmethod
    def get_plan_prices(cls):
        """Obtener precios de los planes en USD"""
        return {
            'monthly': 9.99,      # ✅ 1 Mes = $9.99 USD
            'quarterly': 26.99,   # ✅ 3 Meses = $26.99 USD
            'annual': 89.99,      # ✅ 12 Meses = $89.99 USD
        }
    
    @classmethod
    def create_subscription(cls, user, plan_type, payment_method='online', transaction_id=None):
        """Crear nueva suscripción para un usuario"""
        prices = cls.get_plan_prices()
        
        # Cancelar suscripción existente si la hay
        existing = cls.objects.filter(user=user).first()
        if existing:
            existing.cancel_subscription()
        
        # Determinar estado inicial según método de pago
        initial_status = 'pending' if payment_method in ['yape', 'bcp'] else 'inactive'
        
        # Crear nueva suscripción
        subscription = cls.objects.create(
            user=user,
            plan_type=plan_type,
            price=prices[plan_type],
            payment_method=payment_method,
            transaction_id=transaction_id,
            status=initial_status
        )
        
        return subscription
    
    def approve_payment(self):
        """Aprobar pago y activar suscripción"""
        if self.status == 'pending':
            self.activate_subscription()
            return True
        return False
    
    def reject_payment(self, reason=None):
        """Rechazar pago"""
        self.status = 'rejected'
        if reason:
            self.admin_notes = reason
        self.save()
    
    @property
    def is_pending_review(self):
        """Verificar si el pago está en revisión"""
        return self.status == 'pending'