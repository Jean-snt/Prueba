# 📧 Email Service - Microservicio de Notificaciones

Microservicio independiente de notificaciones y emails para comunicación entre servicios, construido con Django + DRF + Celery + Redis.

## 🎯 Características

- ✅ **Envío de emails simulados** con logging detallado
- ✅ **Procesamiento asíncrono** con Celery y Redis
- ✅ **Comunicación entre microservicios** via HTTP
- ✅ **Logging estructurado** en formato JSON
- ✅ **Health checks** para monitoreo
- ✅ **Idempotencia** y reintentos automáticos
- ✅ **Documentación OpenAPI** completa
- ✅ **Dockerización** completa

## 🏗️ Arquitectura

```
┌─────────────────┐    HTTP     ┌─────────────────┐
│   Auth Service  │ ──────────► │  Email Service  │
│    (Puerto 8000)│             │  (Puerto 8002)  │
└─────────────────┘             └─────────────────┘
                                        │
┌─────────────────┐    HTTP             │
│   Blog Service  │ ──────────►         │
│    (Puerto 8001)│                     │
└─────────────────┘                     │
                                        ▼
                                ┌─────────────────┐
                                │     Redis       │
                                │   (Puerto 6379) │
                                └─────────────────┘
                                        │
                                        ▼
                                ┌─────────────────┐
                                │  PostgreSQL     │
                                │   (Puerto 5432) │
                                └─────────────────┘
```

## 🚀 Inicio Rápido

### Opción 1: Docker Compose (Recomendado)

```bash
# Clonar el repositorio
git clone <repository-url>
cd email-service

# Levantar todos los servicios
docker-compose up -d

# Verificar que todo esté funcionando
docker-compose ps
```

### Opción 2: Desarrollo Local

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
export DB_HOST=localhost
export DB_NAME=email_service
export DB_USER=postgres
export DB_PASSWORD=postgres
export REDIS_URL=redis://localhost:6379/0

# Ejecutar migraciones
python manage.py migrate

# Crear superusuario (opcional)
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver 0.0.0.0:8002

# En otra terminal, iniciar Celery worker
celery -A email_service worker --loglevel=info

# En otra terminal, iniciar Celery beat (opcional)
celery -A email_service beat --loglevel=info
```

## 📡 Endpoints de la API

### 1. Enviar Mensaje de Contacto

```bash
curl -X POST http://localhost:8002/api/contact/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos Rivas",
    "email": "carlos@mail.com",
    "message": "Me interesa una colaboración"
  }'
```

**Respuesta:**
```json
{
  "status": "queued"
}
```

### 2. Enviar Notificación Interna

```bash
curl -X POST http://localhost:8002/api/notify/ \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@mail.com",
    "subject": "Nuevo post publicado",
    "body": "Se ha publicado un nuevo artículo en el blog: Introducción a Django"
  }'
```

**Respuesta:**
```json
{
  "status": "sent",
  "notification_log_id": "123e4567-e89b-12d3-a456-426614174000",
  "processing_time_ms": 150
}
```

### 3. Health Check

```bash
curl http://localhost:8002/healthz/
```

**Respuesta:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": [
    {
      "service_name": "database",
      "is_healthy": true,
      "response_time_ms": 5,
      "error_message": null
    },
    {
      "service_name": "redis",
      "is_healthy": true,
      "response_time_ms": 2,
      "error_message": null
    }
  ],
  "uptime": "24h 15m 30s"
}
```

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_NAME` | Nombre de la base de datos | `email_service` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `postgres` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `REDIS_URL` | URL de Redis | `redis://localhost:6379/0` |

### Configuración de Email

El servicio está configurado para usar el backend de archivos de Django por defecto. Los emails se guardan en la carpeta `sent_emails/`.

Para usar SMTP real, modifica `settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'tu-email@gmail.com'
EMAIL_HOST_PASSWORD = 'tu-contraseña'
DEFAULT_FROM_EMAIL = 'tu-email@gmail.com'
```

## 📊 Monitoreo

### Logs Estructurados

Los logs se guardan en formato JSON en `logs/email_service.log`:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "logger": "notifications",
  "message": "Contact notification sent",
  "module": "mailer",
  "function": "send_contact_notification",
  "line": 45,
  "contact_message_id": "123e4567-e89b-12d3-a456-426614174000",
  "processing_time_ms": 150,
  "status": "sent"
}
```

### Flower (Monitoreo de Celery)

Accede a http://localhost:5555 para monitorear las tareas de Celery.

### Health Checks

- **Endpoint:** `GET /healthz/`
- **Verificaciones:** Base de datos, Redis
- **Respuesta:** Estado general y tiempo de respuesta

## 🐳 Docker

### Comandos Útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f email-service

# Reiniciar un servicio
docker-compose restart email-service

# Ejecutar comandos en el contenedor
docker-compose exec email-service python manage.py shell

# Limpiar volúmenes
docker-compose down -v
```

### Estructura de Volúmenes

- `postgres_data/` - Datos de PostgreSQL
- `logs/` - Logs de la aplicación
- `sent_emails/` - Emails enviados (simulados)

## 🔄 Procesamiento Asíncrono

### Colas de Celery

- **`emails`** - Procesamiento de emails
- **`maintenance`** - Tareas de mantenimiento

### Tareas Disponibles

```python
# Procesar mensaje de contacto
from notifications.tasks import process_contact_message
process_contact_message.delay(contact_message_id)

# Enviar notificación interna
from notifications.tasks import send_internal_notification_async
send_internal_notification_async.delay("user@mail.com", "Asunto", "Mensaje")

# Limpiar logs antiguos
from notifications.tasks import cleanup_old_notification_logs
cleanup_old_notification_logs.delay(days=30)
```

## 🧪 Testing

```bash
# Ejecutar tests
python manage.py test

# Con cobertura
pytest --cov=notifications

# Tests específicos
python manage.py test notifications.tests.test_views
```

## 📚 Documentación API

La documentación completa de la API está disponible en:
- **OpenAPI Spec:** `openapi.yaml`
- **Swagger UI:** http://localhost:8002/swagger/ (si está habilitado)

## 🔒 Seguridad

- ✅ Validación de entrada en todos los endpoints
- ✅ Sanitización de datos
- ✅ Rate limiting en tareas de Celery
- ✅ Logging de eventos de seguridad
- ✅ Headers CORS configurados

## 🚨 Troubleshooting

### Problemas Comunes

1. **Error de conexión a PostgreSQL**
   ```bash
   # Verificar que PostgreSQL esté corriendo
   docker-compose ps db
   
   # Ver logs de la base de datos
   docker-compose logs db
   ```

2. **Error de conexión a Redis**
   ```bash
   # Verificar que Redis esté corriendo
   docker-compose ps redis
   
   # Probar conexión
   redis-cli ping
   ```

3. **Tareas de Celery no se procesan**
   ```bash
   # Verificar que el worker esté corriendo
   docker-compose ps celery-worker
   
   # Ver logs del worker
   docker-compose logs celery-worker
   ```

4. **Emails no se envían**
   - Verificar configuración de email en `settings.py`
   - Revisar logs en `logs/email_service.log`
   - Verificar permisos de la carpeta `sent_emails/`

## 📈 Métricas y Observabilidad

### Métricas Disponibles

- Tiempo de procesamiento de emails
- Número de emails enviados/fallidos
- Estado de servicios dependientes
- Uptime del servicio

### Logs Importantes

- `contact_message_created` - Nuevo mensaje de contacto
- `email_sent` - Email enviado exitosamente
- `health_check` - Verificación de salud
- `error` - Errores del sistema

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Email: admin@empresa.com
- Issues: [GitHub Issues](https://github.com/empresa/email-service/issues)

---

**Desarrollado con ❤️ para el Día 4 del Bootcamp de Microservicios**


