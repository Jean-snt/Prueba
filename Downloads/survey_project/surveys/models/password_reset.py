from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import random
import string


class PasswordResetToken(models.Model):
    """
    Modelo para manejar tokens de recuperación de contraseña con seguridad avanzada
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='password_reset_tokens',
        verbose_name='Usuario'
    )
    
    code = models.CharField(
        max_length=6,
        verbose_name='Código de Recuperación'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    expires_at = models.DateTimeField(
        verbose_name='Fecha de Expiración'
    )
    
    attempts = models.PositiveIntegerField(
        default=0,
        verbose_name='Intentos Fallidos'
    )
    
    is_blocked = models.BooleanField(
        default=False,
        verbose_name='Bloqueado por Intentos'
    )
    
    blocked_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de Bloqueo'
    )
    
    is_used = models.BooleanField(
        default=False,
        verbose_name='Token Usado'
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Dirección IP'
    )
    
    class Meta:
        verbose_name = 'Token de Recuperación'
        verbose_name_plural = 'Tokens de Recuperación'
        ordering = ['-created_at']
    
    def __str__(self):
        status = 'Usado' if self.is_used else ('Bloqueado' if self.is_blocked else 'Activo')
        return f"{self.user.username} - {self.code} ({status})"
    
    @classmethod
    def generate_token(cls, user, ip_address=None):
        """
        Genera un nuevo token de recuperación para un usuario
        """
        # Invalidar tokens anteriores del usuario
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Generar código de 6 dígitos
        code = ''.join(random.choices(string.digits, k=6))
        
        # Crear nuevo token con expiración de 15 minutos
        reset_token = cls.objects.create(
            user=user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=15),
            ip_address=ip_address,
            attempts=0,
            is_blocked=False
        )
        
        return reset_token
    
    @property
    def is_expired(self):
        """Verificar si el token ha expirado"""
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        """Verificar si el token es válido (no usado, no expirado, no bloqueado)"""
        return not self.is_used and not self.is_expired and not self.is_currently_blocked
    
    @property
    def is_currently_blocked(self):
        """Verificar si el token está actualmente bloqueado"""
        if not self.is_blocked:
            return False
        
        # Si está bloqueado, verificar si han pasado 5 minutos
        if self.blocked_at:
            unblock_time = self.blocked_at + timedelta(minutes=5)
            if timezone.now() >= unblock_time:
                # Desbloquear automáticamente
                self.is_blocked = False
                self.attempts = 0
                self.blocked_at = None
                self.save()
                return False
        
        return True
    
    @property
    def time_until_unblock(self):
        """Tiempo restante hasta desbloqueo en segundos"""
        if not self.is_blocked or not self.blocked_at:
            return 0
        
        unblock_time = self.blocked_at + timedelta(minutes=5)
        remaining = unblock_time - timezone.now()
        
        return max(0, int(remaining.total_seconds()))
    
    def add_failed_attempt(self):
        """Agregar intento fallido y bloquear si es necesario"""
        self.attempts += 1
        
        if self.attempts >= 3:
            self.is_blocked = True
            self.blocked_at = timezone.now()
        
        self.save()
        return self.is_blocked
    
    def use_token(self):
        """Marcar el token como usado"""
        self.is_used = True
        self.save()
    
    @classmethod
    def verify_token(cls, user, code):
        """
        Verificar un token de recuperación con lógica de bloqueo
        """
        try:
            reset_token = cls.objects.get(
                user=user,
                code=code,
                is_used=False
            )
            
            if reset_token.is_expired:
                return False, "El código de recuperación ha expirado", None
            
            if reset_token.is_currently_blocked:
                time_remaining = reset_token.time_until_unblock
                minutes = time_remaining // 60
                seconds = time_remaining % 60
                return False, f"Código bloqueado por intentos fallidos. Inténtalo en {minutes}m {seconds}s", reset_token
            
            return True, "Código válido", reset_token
            
        except cls.DoesNotExist:
            # Buscar si existe un token para este usuario (para contar intentos)
            try:
                any_token = cls.objects.filter(user=user, is_used=False).first()
                if any_token:
                    blocked = any_token.add_failed_attempt()
                    if blocked:
                        return False, "Código incorrecto. Token bloqueado por 5 minutos debido a múltiples intentos fallidos.", any_token
                    else:
                        remaining_attempts = 3 - any_token.attempts
                        return False, f"Código incorrecto. Te quedan {remaining_attempts} intentos.", any_token
                else:
                    return False, "Código de recuperación inválido", None
            except:
                return False, "Código de recuperación inválido", None
    
    @classmethod
    def cleanup_expired_tokens(cls):
        """
        Limpiar tokens expirados (para ejecutar periódicamente)
        """
        expired_count = cls.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()[0]
        
        return expired_count