"""
Tests para las views del servicio de emails.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from notifications.models import ContactMessage, NotificationLog


class ContactViewSetTestCase(APITestCase):
    """Tests para el ContactViewSet."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.contact_url = reverse('contact-list')
        self.valid_data = {
            'name': 'Carlos Rivas',
            'email': 'carlos@mail.com',
            'message': 'Me interesa una colaboración'
        }
    
    def test_create_contact_message_success(self):
        """Test: Crear mensaje de contacto exitosamente."""
        response = self.client.post(self.contact_url, self.valid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'queued')
        
        # Verificar que se creó en la base de datos
        self.assertEqual(ContactMessage.objects.count(), 1)
        contact_message = ContactMessage.objects.first()
        self.assertEqual(contact_message.name, 'Carlos Rivas')
        self.assertEqual(contact_message.email, 'carlos@mail.com')
        self.assertEqual(contact_message.message, 'Me interesa una colaboración')
    
    def test_create_contact_message_invalid_data(self):
        """Test: Crear mensaje de contacto con datos inválidos."""
        invalid_data = {
            'name': '',  # Nombre vacío
            'email': 'invalid-email',  # Email inválido
            'message': ''  # Mensaje vacío
        }
        
        response = self.client.post(self.contact_url, invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)
        self.assertIn('name', response.data['errors'])
        self.assertIn('email', response.data['errors'])
        self.assertIn('message', response.data['errors'])
    
    def test_create_contact_message_missing_fields(self):
        """Test: Crear mensaje de contacto con campos faltantes."""
        incomplete_data = {
            'name': 'Carlos Rivas'
            # Faltan email y message
        }
        
        response = self.client.post(self.contact_url, incomplete_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)
    
    def test_list_contact_messages(self):
        """Test: Listar mensajes de contacto."""
        # Crear algunos mensajes de prueba
        ContactMessage.objects.create(
            name='Usuario 1',
            email='user1@mail.com',
            message='Mensaje 1'
        )
        ContactMessage.objects.create(
            name='Usuario 2',
            email='user2@mail.com',
            message='Mensaje 2'
        )
        
        response = self.client.get(self.contact_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['count'], 2)


class NotifyViewSetTestCase(APITestCase):
    """Tests para el NotifyViewSet."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.notify_url = reverse('notify-list')
        self.valid_data = {
            'to': 'user@mail.com',
            'subject': 'Nuevo post publicado',
            'body': 'Se ha publicado un nuevo artículo en el blog...'
        }
    
    def test_send_internal_notification_success(self):
        """Test: Enviar notificación interna exitosamente."""
        response = self.client.post(self.notify_url, self.valid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'sent')
        self.assertIn('notification_log_id', response.data)
        self.assertIn('processing_time_ms', response.data)
        
        # Verificar que se creó el log de notificación
        self.assertEqual(NotificationLog.objects.count(), 1)
        notification_log = NotificationLog.objects.first()
        self.assertEqual(notification_log.to_email, 'user@mail.com')
        self.assertEqual(notification_log.subject, 'Nuevo post publicado')
        self.assertEqual(notification_log.notification_type, 'internal')
    
    def test_send_internal_notification_invalid_data(self):
        """Test: Enviar notificación interna con datos inválidos."""
        invalid_data = {
            'to': 'invalid-email',  # Email inválido
            'subject': '',  # Asunto vacío
            'body': ''  # Cuerpo vacío
        }
        
        response = self.client.post(self.notify_url, invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)
    
    def test_list_notification_logs(self):
        """Test: Listar logs de notificaciones."""
        # Crear algunos logs de prueba
        NotificationLog.objects.create(
            to_email='user1@mail.com',
            subject='Asunto 1',
            body='Cuerpo 1',
            notification_type='internal'
        )
        NotificationLog.objects.create(
            to_email='user2@mail.com',
            subject='Asunto 2',
            body='Cuerpo 2',
            notification_type='contact'
        )
        
        response = self.client.get(self.notify_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['count'], 2)


class HealthCheckViewTestCase(APITestCase):
    """Tests para el HealthCheckView."""
    
    def test_health_check_success(self):
        """Test: Health check exitoso."""
        response = self.client.get('/healthz/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)
        self.assertIn('timestamp', response.data)
        self.assertIn('services', response.data)
        self.assertIn('uptime', response.data)
        
        # Verificar estructura de servicios
        services = response.data['services']
        service_names = [service['service_name'] for service in services]
        self.assertIn('database', service_names)
        self.assertIn('redis', service_names)
    
    def test_health_check_response_structure(self):
        """Test: Estructura de respuesta del health check."""
        response = self.client.get('/healthz/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verificar estructura de cada servicio
        for service in response.data['services']:
            self.assertIn('service_name', service)
            self.assertIn('is_healthy', service)
            self.assertIn('last_check', service)
            self.assertIn('response_time_ms', service)
            self.assertIn('error_message', service)


