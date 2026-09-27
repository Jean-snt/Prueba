from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django_countries.fields import CountryField
import random
import string
from datetime import datetime, timedelta
from django.utils import timezone


class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
        ('N', 'Prefiero no decir'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=100, verbose_name="Nombre")
    last_name = models.CharField(max_length=100, verbose_name="Apellidos")
    nickname = models.CharField(max_length=25, unique=True, null=True, blank=True, verbose_name="Apodo/Nickname")
    age = models.PositiveIntegerField(null=True, blank=True, verbose_name="Edad")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True, verbose_name="Género")
    country = CountryField(blank=True, null=True, verbose_name="País")
    phone_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="Número de celular")
    
    # Campos de verificación
    is_verified = models.BooleanField(default=False, verbose_name="Cuenta verificada")
    verification_code = models.CharField(max_length=6, blank=True, null=True, verbose_name="Código de verificación")
    verification_code_expires = models.DateTimeField(null=True, blank=True, verbose_name="Expiración del código")
    verification_attempts = models.PositiveIntegerField(default=0, verbose_name="Intentos de verificación")
    
    # Campo VIP
    is_vip = models.BooleanField(default=False, verbose_name="Usuario VIP")
    vip_upgraded_at = models.DateTimeField(null=True, blank=True, default=None, verbose_name="Fecha de upgrade VIP")
    
    # ✅ NUEVO: Campo de Karma
    karma = models.IntegerField(default=0, verbose_name="Puntos de Karma")
    
    # ✅ NUEVO: Cooldown de cambio de username
    last_username_change = models.DateTimeField(null=True, blank=True, verbose_name="Último cambio de username")
    
    # ✅ Imagen de perfil
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True, verbose_name="Foto de perfil")
    
    # ✅ NUEVO: Campos de moderación
    report_count = models.PositiveIntegerField(default=0, verbose_name="Cantidad de reportes recibidos")
    suspension_date = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de suspensión")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Perfil de Usuario"
        verbose_name_plural = "Perfiles de Usuario"

    def __str__(self):
        return f"{self.user.username} - {self.get_full_name()}"

    def get_full_name(self):
        """Retorna el nombre completo del usuario"""
        return f"{self.first_name} {self.last_name}".strip()

    def get_display_name(self):
        """Retorna el nombre para mostrar en encuestas (username)"""
        return self.user.username

    @property
    def is_complete(self):
        """Verifica si el perfil está completo"""
        return all([
            self.first_name,
            self.last_name,
            self.age,
            self.country,
        ])

    def generate_verification_code(self):
        """Genera un nuevo código de verificación de 6 dígitos"""
        self.verification_code = ''.join(random.choices(string.digits, k=6))
        self.verification_code_expires = timezone.now() + timedelta(minutes=15)  # Expira en 15 minutos
        self.verification_attempts = 0
        self.save()
        return self.verification_code

    def verify_code(self, code):
        """Verifica el código ingresado por el usuario"""
        if not self.verification_code:
            return False, "No hay código de verificación generado"
        
        if self.verification_code_expires and timezone.now() > self.verification_code_expires:
            return False, "El código de verificación ha expirado"
        
        if self.verification_attempts >= 3:
            return False, "Demasiados intentos fallidos. Solicita un nuevo código"
        
        if code != self.verification_code:
            self.verification_attempts += 1
            self.save()
            remaining_attempts = 3 - self.verification_attempts
            return False, f"Código incorrecto. Te quedan {remaining_attempts} intentos"
        
        # Código correcto
        self.is_verified = True
        self.user.is_active = True  # Activar la cuenta
        self.verification_code = None
        self.verification_code_expires = None
        self.verification_attempts = 0
        self.save()
        self.user.save()
        
        return True, "Cuenta verificada exitosamente"

    def is_verification_code_expired(self):
        """Verifica si el código de verificación ha expirado"""
        if not self.verification_code_expires:
            return True
        return timezone.now() > self.verification_code_expires

    def can_request_new_code(self):
        """Verifica si se puede solicitar un nuevo código"""
        # Permitir nuevo código si no hay código actual o si ha expirado
        return not self.verification_code or self.is_verification_code_expired()
    
    def update_vip_status(self):
        """Actualizar estado VIP basado en suscripción activa"""
        if hasattr(self.user, 'subscription'):
            subscription = self.user.subscription
            # Solo es VIP si la suscripción está activa (no pendiente)
            self.is_vip = subscription.is_active and subscription.status == 'active'
        else:
            self.is_vip = False
        
        self.save()
        return self.is_vip
    
    @property
    def vip_plan_info(self):
        """Información del plan VIP actual"""
        if hasattr(self.user, 'subscription') and self.user.subscription.is_active:
            sub = self.user.subscription
            return {
                'plan_type': sub.get_plan_type_display(),
                'days_remaining': sub.days_remaining,
                'price': float(sub.price),
                'end_date': sub.end_date
            }
        return None
    
    def increment_report_count(self):
        """Incrementa el contador de reportes y suspende si llega a 8"""
        self.report_count += 1
        
        # ✅ SUSPENSIÓN AUTOMÁTICA: Si llega a 8 reportes
        if self.report_count >= 8:
            self.user.is_active = False
            self.suspension_date = timezone.now()
            self.user.save()
        
        self.save()
        return self.report_count
    
    def check_and_lift_suspension(self):
        """Verifica si han pasado 3 días y levanta la suspensión"""
        if not self.user.is_active and self.suspension_date:
            days_suspended = (timezone.now() - self.suspension_date).days
            
            if days_suspended >= 3:
                # Levantar suspensión
                self.user.is_active = True
                self.report_count = 0  # Resetear contador
                self.suspension_date = None
                self.user.save()
                self.save()
                return True, "Suspensión levantada"
            else:
                days_remaining = 3 - days_suspended
                return False, f"Tu cuenta está suspendida. Quedan {days_remaining} días"
        
        return True, "Cuenta activa"
    
    @property
    def is_suspended(self):
        """Verifica si el usuario está suspendido"""
        return not self.user.is_active and self.suspension_date is not None


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Signal para crear automáticamente un perfil cuando se crea un usuario"""
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Signal para guardar el perfil cuando se guarda el usuario"""
    # Asegurar que el perfil existe antes de guardarlo
    if not hasattr(instance, 'profile'):
        UserProfile.objects.get_or_create(user=instance)
    else:
        instance.profile.save()