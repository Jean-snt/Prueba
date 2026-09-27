"""
Comando Django para limpiar encuestas de usuarios inactivos.

Uso:
    python manage.py cleanup_inactive_users

Descripción:
    Marca como inactivas las encuestas de usuarios que no han iniciado sesión
    en los últimos 90 días.

Automatización (Linux/Mac - Cron):
    # Ejecutar cada día a las 3 AM
    0 3 * * * cd /path/to/project && python manage.py cleanup_inactive_users

Automatización (Windows - Task Scheduler):
    1. Abrir "Programador de tareas"
    2. Crear tarea básica
    3. Trigger: Diario a las 3:00 AM
    4. Acción: Iniciar programa
    5. Programa: python.exe
    6. Argumentos: manage.py cleanup_inactive_users
    7. Directorio: C:\\path\\to\\project
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from surveys.models.survey import Survey


class Command(BaseCommand):
    help = 'Marca encuestas de usuarios inactivos (>90 días) como inactivas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Número de días de inactividad (default: 90)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simular sin hacer cambios reales'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        # Fecha límite: X días atrás
        cutoff_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(self.style.WARNING(
            f'\n{"="*60}'
        ))
        self.stdout.write(self.style.WARNING(
            f'🧹 LIMPIEZA DE USUARIOS INACTIVOS'
        ))
        self.stdout.write(self.style.WARNING(
            f'{"="*60}\n'
        ))
        
        if dry_run:
            self.stdout.write(self.style.NOTICE(
                '⚠️  MODO SIMULACIÓN - No se harán cambios reales\n'
            ))
        
        self.stdout.write(
            f'📅 Fecha límite: {cutoff_date.strftime("%Y-%m-%d %H:%M:%S")}'
        )
        self.stdout.write(
            f'⏰ Días de inactividad: {days}\n'
        )
        
        # Encontrar usuarios inactivos
        inactive_users = User.objects.filter(
            last_login__lt=cutoff_date,
            is_active=True
        ).exclude(
            is_staff=True  # No afectar a administradores
        )
        
        total_users = inactive_users.count()
        self.stdout.write(
            f'👥 Usuarios inactivos encontrados: {total_users}\n'
        )
        
        if total_users == 0:
            self.stdout.write(self.style.SUCCESS(
                '✅ No hay usuarios inactivos para procesar\n'
            ))
            return
        
        # Procesar cada usuario
        total_surveys_affected = 0
        users_processed = 0
        
        for user in inactive_users:
            # Obtener encuestas activas del usuario
            active_surveys = Survey.objects.filter(
                creator=user,
                is_active=True
            )
            
            survey_count = active_surveys.count()
            
            if survey_count > 0:
                users_processed += 1
                total_surveys_affected += survey_count
                
                # Calcular días de inactividad
                days_inactive = (timezone.now() - user.last_login).days if user.last_login else 999
                
                self.stdout.write(
                    f'\n📊 Usuario: {user.username} (ID: {user.id})'
                )
                self.stdout.write(
                    f'   └─ Último acceso: {user.last_login.strftime("%Y-%m-%d") if user.last_login else "Nunca"}'
                )
                self.stdout.write(
                    f'   └─ Días inactivo: {days_inactive}'
                )
                self.stdout.write(
                    f'   └─ Encuestas activas: {survey_count}'
                )
                
                if not dry_run:
                    # Marcar encuestas como inactivas
                    updated = active_surveys.update(is_active=False)
                    
                    self.stdout.write(self.style.SUCCESS(
                        f'   └─ ✅ {updated} encuestas marcadas como inactivas'
                    ))
                else:
                    self.stdout.write(self.style.NOTICE(
                        f'   └─ 🔍 {survey_count} encuestas serían marcadas como inactivas'
                    ))
        
        # Resumen final
        self.stdout.write(self.style.WARNING(
            f'\n{"="*60}'
        ))
        self.stdout.write(self.style.WARNING(
            '📊 RESUMEN DE LIMPIEZA'
        ))
        self.stdout.write(self.style.WARNING(
            f'{"="*60}\n'
        ))
        
        self.stdout.write(
            f'👥 Usuarios procesados: {users_processed}/{total_users}'
        )
        self.stdout.write(
            f'📋 Encuestas afectadas: {total_surveys_affected}'
        )
        
        if dry_run:
            self.stdout.write(self.style.NOTICE(
                f'\n⚠️  SIMULACIÓN COMPLETADA - Ejecuta sin --dry-run para aplicar cambios\n'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'\n✅ LIMPIEZA COMPLETADA EXITOSAMENTE\n'
            ))
        
        # Recomendaciones
        if not dry_run and total_surveys_affected > 0:
            self.stdout.write(self.style.WARNING(
                '💡 RECOMENDACIONES:'
            ))
            self.stdout.write(
                '   • Considera enviar emails a usuarios inactivos antes de desactivar'
            )
            self.stdout.write(
                '   • Programa este comando para ejecutarse automáticamente'
            )
            self.stdout.write(
                '   • Revisa logs regularmente para detectar patrones\n'
            )
