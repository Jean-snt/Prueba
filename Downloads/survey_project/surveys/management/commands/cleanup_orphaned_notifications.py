from django.core.management.base import BaseCommand
from surveys.models.notification import Notification


class Command(BaseCommand):
    help = 'Limpia notificaciones huérfanas (sin encuesta asociada)'

    def handle(self, *args, **options):
        # ✅ FIX 1: Eliminar notificaciones donde survey es NULL
        orphaned_count = Notification.objects.filter(survey__isnull=True).count()
        
        if orphaned_count > 0:
            self.stdout.write(self.style.WARNING(f'Encontradas {orphaned_count} notificaciones huérfanas'))
            deleted = Notification.objects.filter(survey__isnull=True).delete()
            self.stdout.write(self.style.SUCCESS(f'✅ Eliminadas {deleted[0]} notificaciones huérfanas'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ No se encontraron notificaciones huérfanas'))
