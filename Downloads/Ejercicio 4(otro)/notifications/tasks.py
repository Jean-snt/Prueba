"""
Tareas de Celery para procesamiento asíncrono.
"""
import time
import logging
from celery import shared_task
from django.utils import timezone
from django.db import transaction

from .models import ContactMessage, NotificationLog
from app.utils.mailer import EmailService
from app.utils.logger import structured_logger

logger = logging.getLogger('notifications')


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def process_contact_message(self, contact_message_id):
    """
    Procesa un mensaje de contacto de forma asíncrona.
    
    Args:
        contact_message_id: ID del ContactMessage a procesar
        
    Returns:
        Dict con el resultado del procesamiento
    """
    try:
        # Obtener el mensaje de contacto
        contact_message = ContactMessage.objects.get(id=contact_message_id)
        
        # Actualizar estado a procesando
        contact_message.status = 'processing'
        contact_message.save()
        
        # Enviar notificación
        result = EmailService.send_contact_notification(contact_message)
        
        # Actualizar estado según el resultado
        if result['success']:
            contact_message.status = 'sent'
            contact_message.processed_at = timezone.now()
        else:
            contact_message.status = 'failed'
            contact_message.error_message = result.get('error', 'Error desconocido')
        
        contact_message.save()
        
        # Log del evento
        structured_logger.log_business_event(
            'contact_message_processed_async',
            contact_message_id=str(contact_message.id),
            email=contact_message.email,
            success=result['success'],
            retry_count=self.request.retries
        )
        
        return {
            'success': result['success'],
            'contact_message_id': str(contact_message.id),
            'status': contact_message.status,
            'processing_time_ms': result.get('processing_time_ms', 0)
        }
        
    except ContactMessage.DoesNotExist:
        logger.error(f"ContactMessage {contact_message_id} not found")
        return {'success': False, 'error': 'ContactMessage not found'}
        
    except Exception as exc:
        # Reintentar la tarea
        logger.error(f"Error processing contact message {contact_message_id}: {str(exc)}")
        
        # Actualizar contador de reintentos
        try:
            contact_message = ContactMessage.objects.get(id=contact_message_id)
            contact_message.retry_count = self.request.retries + 1
            contact_message.save()
        except ContactMessage.DoesNotExist:
            pass
        
        # Reintentar con backoff exponencial
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def send_internal_notification_async(self, to_email, subject, body):
    """
    Envía una notificación interna de forma asíncrona.
    
    Args:
        to_email: Email destinatario
        subject: Asunto del email
        body: Cuerpo del mensaje
        
    Returns:
        Dict con el resultado del envío
    """
    try:
        # Enviar notificación
        result = EmailService.send_internal_notification(to_email, subject, body)
        
        # Log del evento
        structured_logger.log_business_event(
            'internal_notification_sent_async',
            to_email=to_email,
            subject=subject,
            success=result['success'],
            retry_count=self.request.retries
        )
        
        return result
        
    except Exception as exc:
        # Reintentar la tarea
        logger.error(f"Error sending internal notification to {to_email}: {str(exc)}")
        
        # Reintentar con backoff exponencial
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries))


@shared_task
def cleanup_old_notification_logs(days=30):
    """
    Limpia logs de notificaciones antiguos.
    
    Args:
        days: Número de días para mantener los logs (default: 30)
    """
    try:
        from datetime import timedelta
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Eliminar logs antiguos
        deleted_count = NotificationLog.objects.filter(
            sent_at__lt=cutoff_date
        ).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old notification logs")
        
        return {
            'success': True,
            'deleted_count': deleted_count,
            'cutoff_date': cutoff_date.isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Error cleaning up notification logs: {str(exc)}")
        return {
            'success': False,
            'error': str(exc)
        }


@shared_task
def send_bulk_notifications(notification_data_list):
    """
    Envía múltiples notificaciones de forma asíncrona.
    
    Args:
        notification_data_list: Lista de diccionarios con datos de notificaciones
        
    Returns:
        Dict con el resultado del procesamiento
    """
    try:
        results = []
        success_count = 0
        error_count = 0
        
        for notification_data in notification_data_list:
            try:
                result = EmailService.send_internal_notification(
                    to_email=notification_data['to_email'],
                    subject=notification_data['subject'],
                    body=notification_data['body']
                )
                
                results.append({
                    'to_email': notification_data['to_email'],
                    'success': result['success'],
                    'notification_log_id': result.get('notification_log_id'),
                    'error': result.get('error')
                })
                
                if result['success']:
                    success_count += 1
                else:
                    error_count += 1
                    
            except Exception as e:
                results.append({
                    'to_email': notification_data.get('to_email', 'unknown'),
                    'success': False,
                    'error': str(e)
                })
                error_count += 1
        
        # Log del evento
        structured_logger.log_business_event(
            'bulk_notifications_sent',
            total_count=len(notification_data_list),
            success_count=success_count,
            error_count=error_count
        )
        
        return {
            'success': True,
            'total_count': len(notification_data_list),
            'success_count': success_count,
            'error_count': error_count,
            'results': results
        }
        
    except Exception as exc:
        logger.error(f"Error sending bulk notifications: {str(exc)}")
        return {
            'success': False,
            'error': str(exc)
        }


