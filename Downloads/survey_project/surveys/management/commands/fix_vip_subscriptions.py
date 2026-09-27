"""
Script para crear suscripciones para usuarios VIP que no tienen una
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from surveys.models import Subscription
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Crea suscripciones para usuarios VIP que no tienen una'

    def handle(self, *args, **options):
        # Obtener todos los usuarios VIP
        vip_users = User.objects.filter(profile__is_vip=True)
        
        self.stdout.write(f"🔍 Encontrados {vip_users.count()} usuarios VIP")
        
        fixed_count = 0
        for user in vip_users:
            # Verificar si ya tiene suscripción
            if not hasattr(user, 'subscription'):
                self.stdout.write(f"⚠️ Usuario {user.username} es VIP pero no tiene suscripción")
                
                # Crear suscripción mensual por defecto (30 días)
                subscription = Subscription.objects.create(
                    user=user,
                    plan_type='monthly',
                    status='active',
                    price=9.99,
                    start_date=timezone.now(),
                    end_date=timezone.now() + timedelta(days=30),
                    payment_method='online',
                    transaction_id=f'MANUAL_FIX_{user.id}'
                )
                
                self.stdout.write(self.style.SUCCESS(
                    f"✅ Suscripción creada para {user.username} - Vence: {subscription.end_date}"
                ))
                fixed_count += 1
            else:
                subscription = user.subscription
                if not subscription.end_date:
                    # Agregar fecha de vencimiento si no tiene
                    subscription.end_date = timezone.now() + timedelta(days=30)
                    subscription.save()
                    self.stdout.write(self.style.SUCCESS(
                        f"✅ Fecha de vencimiento agregada para {user.username}"
                    ))
                    fixed_count += 1
                else:
                    self.stdout.write(f"✓ {user.username} ya tiene suscripción válida")
        
        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 Proceso completado: {fixed_count} suscripciones corregidas"
        ))
