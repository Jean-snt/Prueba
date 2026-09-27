from django.core.management.base import BaseCommand
from django.utils import timezone
from surveys.models import Survey


class Command(BaseCommand):
    help = 'Elimina encuestas temporales que han expirado (con CASCADE automático)'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Buscar encuestas con expires_at definido y que ya hayan expirado
        expired_surveys = Survey.objects.filter(
            expires_at__isnull=False,
            expires_at__lt=now
        )
        
        count = expired_surveys.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('✅ No hay encuestas expiradas para eliminar')
            )
            return
        
        # Mostrar información de las encuestas que se van a eliminar
        self.stdout.write(
            self.style.WARNING(f'⚠️  Se encontraron {count} encuestas expiradas:')
        )
        
        total_questions = 0
        total_responses = 0
        total_comments = 0
        
        for survey in expired_surveys:
            questions_count = survey.questions.count()
            responses_count = survey.response_set.count()
            comments_count = survey.comments.count()
            
            total_questions += questions_count
            total_responses += responses_count
            total_comments += comments_count
            
            self.stdout.write(
                f'  📊 ID: {survey.id}, Título: "{survey.title}"'
            )
            self.stdout.write(
                f'     Creada: {survey.created_at.strftime("%Y-%m-%d %H:%M")}, '
                f'Expira: {survey.expires_at.strftime("%Y-%m-%d %H:%M")}'
            )
            self.stdout.write(
                f'     Relaciones: {questions_count} preguntas, '
                f'{responses_count} respuestas, {comments_count} comentarios'
            )
        
        self.stdout.write('')
        self.stdout.write(
            self.style.WARNING(
                f'📦 Total de registros relacionados que se eliminarán (CASCADE):'
            )
        )
        self.stdout.write(f'   - {total_questions} preguntas')
        self.stdout.write(f'   - {total_responses} respuestas')
        self.stdout.write(f'   - {total_comments} comentarios')
        self.stdout.write('')
        
        # Eliminar las encuestas expiradas (CASCADE automático)
        deleted_count, deleted_details = expired_surveys.delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Se eliminaron {deleted_count} encuestas expiradas correctamente'
            )
        )
        
        # Mostrar detalles de lo eliminado
        if deleted_details:
            self.stdout.write(
                self.style.SUCCESS('📋 Detalles de eliminación CASCADE:')
            )
            for model, count in deleted_details.items():
                if count > 0:
                    self.stdout.write(f'   - {model}: {count} registros')

