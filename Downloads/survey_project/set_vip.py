#!/usr/bin/env python
"""
Script de emergencia para activar VIP a un usuario
Uso: python set_vip.py
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

def activate_vip(username='jeancito', days=30):
    """
    Activa el estado VIP para un usuario específico
    
    Args:
        username: Nombre de usuario a activar
        days: Días de duración del VIP (default: 30)
    """
    try:
        # Buscar usuario
        user = User.objects.get(username=username)
        print(f"✅ Usuario encontrado: {user.username} (ID: {user.id})")
        
        # Obtener o crear perfil
        profile = user.profile
        print(f"📋 Perfil actual - VIP: {profile.is_vip}")
        
        # Activar VIP directamente
        profile.is_vip = True
        profile.save()
        
        print(f"🎉 ¡ÉXITO! {username.upper()} ES VIP AHORA")
        print(f"⭐ Estado VIP: ACTIVADO")
        
        # Intentar crear/actualizar suscripción si el modelo existe
        try:
            from surveys.models import Subscription
            
            # Buscar o crear suscripción
            subscription, created = Subscription.objects.get_or_create(
                user=user,
                defaults={
                    'plan_type': 'monthly',
                    'status': 'active',
                    'start_date': timezone.now(),
                    'end_date': timezone.now() + timedelta(days=days),
                    'price': 9.99,
                }
            )
            
            if not created:
                # Actualizar suscripción existente
                subscription.status = 'active'
                subscription.end_date = timezone.now() + timedelta(days=days)
                subscription.save()
            
            print(f"📅 Suscripción creada/actualizada - Expira: {subscription.end_date.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"⏰ Duración: {days} días")
            
        except ImportError:
            print("⚠️  Modelo Subscription no encontrado - Solo se activó is_vip en el perfil")
        
        return True
        
    except User.DoesNotExist:
        print(f"❌ ERROR: Usuario '{username}' no encontrado")
        print("💡 Usuarios disponibles:")
        for u in User.objects.all()[:10]:
            print(f"   - {u.username}")
        return False
        
    except Exception as e:
        print(f"🚨 ERROR INESPERADO: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 SCRIPT DE ACTIVACIÓN VIP - MODO EMERGENCIA")
    print("=" * 60)
    
    # Activar VIP para Jeancito
    success = activate_vip('jeancito', days=30)
    
    if success:
        print("\n✅ PROCESO COMPLETADO EXITOSAMENTE")
        print("🔄 Recarga el frontend para ver los cambios")
        print("💡 Cierra sesión y vuelve a iniciar para sincronizar")
    else:
        print("\n❌ PROCESO FALLÓ - Revisa los errores arriba")
    
    print("=" * 60)
