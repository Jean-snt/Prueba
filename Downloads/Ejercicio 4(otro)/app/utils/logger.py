"""
Utilidades de logging estructurado.
"""
import logging
import json
import time
from typing import Dict, Any, Optional
from django.conf import settings


class StructuredLogger:
    """
    Logger estructurado para el servicio de emails.
    """
    
    def __init__(self, name: str = 'notifications'):
        self.logger = logging.getLogger(name)
    
    def log_request(self, method: str, path: str, user_ip: str = None, 
                   user_agent: str = None, **kwargs) -> None:
        """
        Log de una petición HTTP entrante.
        """
        self.logger.info(
            "HTTP Request",
            extra={
                'event_type': 'http_request',
                'method': method,
                'path': path,
                'user_ip': user_ip,
                'user_agent': user_agent,
                **kwargs
            }
        )
    
    def log_response(self, method: str, path: str, status_code: int, 
                    processing_time_ms: int, **kwargs) -> None:
        """
        Log de una respuesta HTTP.
        """
        self.logger.info(
            "HTTP Response",
            extra={
                'event_type': 'http_response',
                'method': method,
                'path': path,
                'status_code': status_code,
                'processing_time_ms': processing_time_ms,
                **kwargs
            }
        )
    
    def log_email_sent(self, to_email: str, subject: str, notification_type: str,
                      processing_time_ms: int, success: bool = True, **kwargs) -> None:
        """
        Log de envío de email.
        """
        level = logging.INFO if success else logging.ERROR
        message = "Email sent successfully" if success else "Email sending failed"
        
        self.logger.log(
            level,
            message,
            extra={
                'event_type': 'email_sent',
                'to_email': to_email,
                'subject': subject,
                'notification_type': notification_type,
                'processing_time_ms': processing_time_ms,
                'success': success,
                **kwargs
            }
        )
    
    def log_health_check(self, service_name: str, is_healthy: bool, 
                        response_time_ms: int = None, error: str = None) -> None:
        """
        Log de verificación de salud de servicio.
        """
        level = logging.INFO if is_healthy else logging.WARNING
        
        self.logger.log(
            level,
            f"Health check for {service_name}",
            extra={
                'event_type': 'health_check',
                'service_name': service_name,
                'is_healthy': is_healthy,
                'response_time_ms': response_time_ms,
                'error': error
            }
        )
    
    def log_error(self, error: Exception, context: Dict[str, Any] = None) -> None:
        """
        Log de error con contexto.
        """
        self.logger.error(
            f"Error occurred: {str(error)}",
            extra={
                'event_type': 'error',
                'error_type': type(error).__name__,
                'error_message': str(error),
                'context': context or {}
            },
            exc_info=True
        )
    
    def log_business_event(self, event_type: str, **kwargs) -> None:
        """
        Log de evento de negocio.
        """
        self.logger.info(
            f"Business event: {event_type}",
            extra={
                'event_type': 'business_event',
                'business_event_type': event_type,
                **kwargs
            }
        )


# Instancia global del logger estructurado
structured_logger = StructuredLogger()


class RequestLoggingMiddleware:
    """
    Middleware para logging automático de requests y responses.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = structured_logger
    
    def __call__(self, request):
        # Log de request
        start_time = time.time()
        
        self.logger.log_request(
            method=request.method,
            path=request.path,
            user_ip=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            query_params=dict(request.GET),
            content_type=request.content_type
        )
        
        # Procesar request
        response = self.get_response(request)
        
        # Log de response
        processing_time = int((time.time() - start_time) * 1000)
        
        self.logger.log_response(
            method=request.method,
            path=request.path,
            status_code=response.status_code,
            processing_time_ms=processing_time,
            content_type=response.get('Content-Type', ''),
            content_length=response.get('Content-Length', '')
        )
        
        return response
    
    def _get_client_ip(self, request):
        """
        Obtiene la IP real del cliente.
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


