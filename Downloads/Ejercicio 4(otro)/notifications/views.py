"""
Views for the notifications app.
"""
import time
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet
from rest_framework.views import APIView
from django.core.cache import cache
from django.db import connection
import redis

from .models import ContactMessage, NotificationLog, ServiceHealth
from .serializers import (
    ContactMessageCreateSerializer, ContactResponseSerializer,
    NotifySerializer, NotificationLogSerializer,
    HealthCheckResponseSerializer
)
from app.utils.mailer import EmailService
from app.utils.logger import structured_logger

logger = logging.getLogger('notifications')


class ContactViewSet(ViewSet):
    """
    ViewSet para manejar mensajes de contacto.
    """
    
    def create(self, request):
        """
        POST /api/contact/
        Crea un nuevo mensaje de contacto y lo procesa.
        """
        start_time = time.time()
        
        try:
            # Validar datos de entrada
            serializer = ContactMessageCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear mensaje de contacto
            with transaction.atomic():
                contact_message = ContactMessage.objects.create(
                    name=serializer.validated_data['name'],
                    email=serializer.validated_data['email'],
                    message=serializer.validated_data['message'],
                    status='pending'
                )
                
                # Procesar notificación de forma asíncrona
                try:
                    result = EmailService.send_contact_notification(contact_message)
                    
                    if result['success']:
                        contact_message.status = 'sent'
                        contact_message.processed_at = timezone.now()
                    else:
                        contact_message.status = 'failed'
                        contact_message.error_message = result.get('error', 'Error desconocido')
                    
                    contact_message.save()
                    
                except Exception as e:
                    logger.error(f"Error processing contact notification: {str(e)}")
                    contact_message.status = 'failed'
                    contact_message.error_message = str(e)
                    contact_message.save()
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Log del evento
            structured_logger.log_business_event(
                'contact_message_created',
                contact_message_id=str(contact_message.id),
                email=contact_message.email,
                processing_time_ms=processing_time,
                status=contact_message.status
            )
            
            return Response(
                ContactResponseSerializer({'status': 'queued'}).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(f"Error in contact creation: {str(e)}")
            
            return Response(
                {'error': 'Error interno del servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def list(self, request):
        """
        GET /api/contact/
        Lista mensajes de contacto (solo para administración).
        """
        try:
            contact_messages = ContactMessage.objects.all().order_by('-created_at')
            serializer = ContactMessageCreateSerializer(contact_messages, many=True)
            
            return Response({
                'results': serializer.data,
                'count': contact_messages.count()
            })
            
        except Exception as e:
            logger.error(f"Error listing contact messages: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotifyViewSet(ViewSet):
    """
    ViewSet para notificaciones internas.
    """
    
    def create(self, request):
        """
        POST /api/notify/
        Envía una notificación interna.
        """
        start_time = time.time()
        
        try:
            # Validar datos de entrada
            serializer = NotifySerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Enviar notificación
            result = EmailService.send_internal_notification(
                to_email=serializer.validated_data['to'],
                subject=serializer.validated_data['subject'],
                body=serializer.validated_data['body']
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Log del evento
            structured_logger.log_business_event(
                'internal_notification_sent',
                to_email=serializer.validated_data['to'],
                subject=serializer.validated_data['subject'],
                processing_time_ms=processing_time,
                success=result['success']
            )
            
            if result['success']:
                return Response({
                    'status': 'sent',
                    'notification_log_id': result['notification_log_id'],
                    'processing_time_ms': result['processing_time_ms']
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'status': 'failed',
                    'error': result.get('error', 'Error desconocido'),
                    'processing_time_ms': result['processing_time_ms']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(f"Error in internal notification: {str(e)}")
            
            return Response(
                {'error': 'Error interno del servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def list(self, request):
        """
        GET /api/notify/
        Lista logs de notificaciones (solo para administración).
        """
        try:
            notification_logs = NotificationLog.objects.all().order_by('-sent_at')
            serializer = NotificationLogSerializer(notification_logs, many=True)
            
            return Response({
                'results': serializer.data,
                'count': notification_logs.count()
            })
            
        except Exception as e:
            logger.error(f"Error listing notification logs: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class HealthCheckView(APIView):
    """
    Vista para verificación de salud del servicio.
    """
    
    def get(self, request):
        """
        GET /healthz/
        Verifica el estado de salud del servicio y sus dependencias.
        """
        start_time = timezone.now()
        health_status = {
            'status': 'healthy',
            'timestamp': start_time,
            'services': [],
            'uptime': self._get_uptime()
        }
        
        # Verificar base de datos
        db_healthy, db_response_time = self._check_database()
        health_status['services'].append({
            'service_name': 'database',
            'is_healthy': db_healthy,
            'response_time_ms': db_response_time,
            'error_message': None if db_healthy else 'Error de conexión a la base de datos'
        })
        
        # Verificar Redis
        redis_healthy, redis_response_time = self._check_redis()
        health_status['services'].append({
            'service_name': 'redis',
            'is_healthy': redis_healthy,
            'response_time_ms': redis_response_time,
            'error_message': None if redis_healthy else 'Error de conexión a Redis'
        })
        
        # Determinar estado general
        all_healthy = all(service['is_healthy'] for service in health_status['services'])
        health_status['status'] = 'healthy' if all_healthy else 'unhealthy'
        
        # Log del healthcheck
        structured_logger.log_health_check(
            service_name='email_service',
            is_healthy=all_healthy,
            response_time_ms=int((timezone.now() - start_time).total_seconds() * 1000)
        )
        
        # Guardar estado en la base de datos
        for service in health_status['services']:
            ServiceHealth.objects.create(
                service_name=service['service_name'],
                is_healthy=service['is_healthy'],
                response_time_ms=service['response_time_ms'],
                error_message=service['error_message']
            )
        
        status_code = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        
        return Response(health_status, status=status_code)
    
    def _check_database(self):
        """Verifica la conexión a la base de datos."""
        try:
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                response_time = int((time.time() - start_time) * 1000)
            return True, response_time
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return False, None
    
    def _check_redis(self):
        """Verifica la conexión a Redis."""
        try:
            start_time = time.time()
            r = redis.Redis.from_url('redis://localhost:6379/0')
            r.ping()
            response_time = int((time.time() - start_time) * 1000)
            return True, response_time
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return False, None
    
    def _get_uptime(self):
        """Obtiene el tiempo de actividad del servicio."""
        try:
            # En un entorno real, esto se obtendría del sistema
            # Por ahora, retornamos un valor simulado
            return "24h 15m 30s"
        except Exception:
            return "Unknown"


