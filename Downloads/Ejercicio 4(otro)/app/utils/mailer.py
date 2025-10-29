"""
Utilidades para el envío de emails.
"""
import time
import logging
from typing import Dict, Any, Optional
from django.core.mail import send_mail, EmailMessage
from django.conf import settings
from django.utils import timezone
from notifications.models import NotificationLog

logger = logging.getLogger('notifications')


class EmailService:
    """
    Servicio para el envío de emails con logging y métricas.
    """
    
    @staticmethod
    def send_contact_notification(contact_message) -> Dict[str, Any]:
        """
        Envía notificación de contacto.
        
        Args:
            contact_message: Instancia de ContactMessage
            
        Returns:
            Dict con el resultado del envío
        """
        start_time = time.time()
        
        try:
            subject = f"Nuevo mensaje de contacto de {contact_message.name}"
            body = f"""
Hola,

Has recibido un nuevo mensaje de contacto:

Nombre: {contact_message.name}
Email: {contact_message.email}
Fecha: {contact_message.created_at.strftime('%Y-%m-%d %H:%M:%S')}

Mensaje:
{contact_message.message}

---
Este mensaje fue enviado desde el formulario de contacto.
            """.strip()
            
            # Simular envío de email (en producción usar SMTP real)
            result = EmailService._simulate_email_send(
                to_email="admin@empresa.com",  # Email del administrador
                subject=subject,
                body=body
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Crear log de notificación
            notification_log = NotificationLog.objects.create(
                contact_message=contact_message,
                to_email="admin@empresa.com",
                subject=subject,
                body=body,
                notification_type='contact',
                status='sent' if result['success'] else 'failed',
                response_data=result,
                processing_time_ms=processing_time
            )
            
            logger.info(
                f"Contact notification sent",
                extra={
                    'contact_message_id': str(contact_message.id),
                    'notification_log_id': str(notification_log.id),
                    'processing_time_ms': processing_time,
                    'status': notification_log.status
                }
            )
            
            return {
                'success': result['success'],
                'notification_log_id': str(notification_log.id),
                'processing_time_ms': processing_time
            }
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(
                f"Error sending contact notification: {str(e)}",
                extra={
                    'contact_message_id': str(contact_message.id),
                    'error': str(e),
                    'processing_time_ms': processing_time
                }
            )
            
            return {
                'success': False,
                'error': str(e),
                'processing_time_ms': processing_time
            }
    
    @staticmethod
    def send_internal_notification(to_email: str, subject: str, body: str) -> Dict[str, Any]:
        """
        Envía notificación interna.
        
        Args:
            to_email: Email destinatario
            subject: Asunto del email
            body: Cuerpo del mensaje
            
        Returns:
            Dict con el resultado del envío
        """
        start_time = time.time()
        
        try:
            # Simular envío de email
            result = EmailService._simulate_email_send(
                to_email=to_email,
                subject=subject,
                body=body
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Crear log de notificación
            notification_log = NotificationLog.objects.create(
                to_email=to_email,
                subject=subject,
                body=body,
                notification_type='internal',
                status='sent' if result['success'] else 'failed',
                response_data=result,
                processing_time_ms=processing_time
            )
            
            logger.info(
                f"Internal notification sent",
                extra={
                    'notification_log_id': str(notification_log.id),
                    'to_email': to_email,
                    'subject': subject,
                    'processing_time_ms': processing_time,
                    'status': notification_log.status
                }
            )
            
            return {
                'success': result['success'],
                'notification_log_id': str(notification_log.id),
                'processing_time_ms': processing_time
            }
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(
                f"Error sending internal notification: {str(e)}",
                extra={
                    'to_email': to_email,
                    'subject': subject,
                    'error': str(e),
                    'processing_time_ms': processing_time
                }
            )
            
            return {
                'success': False,
                'error': str(e),
                'processing_time_ms': processing_time
            }
    
    @staticmethod
    def _simulate_email_send(to_email: str, subject: str, body: str) -> Dict[str, Any]:
        """
        Simula el envío de un email.
        
        En producción, esto se reemplazaría con el envío real via SMTP.
        """
        try:
            # Usar el backend de Django para simular envío
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@empresa.com',
                recipient_list=[to_email],
                fail_silently=False
            )
            
            # Simular delay de red
            time.sleep(0.1)
            
            return {
                'success': True,
                'message_id': f"sim_{int(time.time())}",
                'sent_at': timezone.now().isoformat(),
                'backend': 'simulated'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'sent_at': timezone.now().isoformat(),
                'backend': 'simulated'
            }


def send_email(to_email: str, subject: str, body: str, notification_type: str = 'internal') -> Dict[str, Any]:
    """
    Función de conveniencia para enviar emails.
    
    Args:
        to_email: Email destinatario
        subject: Asunto del email
        body: Cuerpo del mensaje
        notification_type: Tipo de notificación
        
    Returns:
        Dict con el resultado del envío
    """
    if notification_type == 'contact':
        # Para notificaciones de contacto, necesitamos un ContactMessage
        raise ValueError("Para notificaciones de contacto, use EmailService.send_contact_notification()")
    
    return EmailService.send_internal_notification(to_email, subject, body)


