# 🎯 CUESTOM - Plataforma de Encuestas Moderna

**Plataforma de encuestas con arquitectura hexagonal, sistema VIP, y despliegue cloud-native en AWS**

[![Django](https://img.shields.io/badge/Django-4.2.26-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.2.0-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-Ready-orange.svg)](https://aws.amazon.com/)

---

## 📋 CARACTERÍSTICAS PRINCIPALES

### Backend (Django + DDD)
- ✅ **Arquitectura Hexagonal** (Ports & Adapters)
- ✅ **Domain-Driven Design** implementado
- ✅ **50+ Endpoints REST** con Django REST Framework
- ✅ **Sistema VIP** con 3 planes de suscripción
- ✅ **Autenticación Token-based** con 2FA
- ✅ **Notificaciones en tiempo real**
- ✅ **Sistema de comentarios anidados**
- ✅ **Moderación automática** (suspensión a 8 reportes)
- ✅ **Integración PayPal** para pagos
- ✅ **AWS RDS PostgreSQL** con SSL

### Frontend (React 19)
- ✅ **Material-UI** para componentes
- ✅ **Lazy Loading** para optimización
- ✅ **Context API + Zustand** para estado global
- ✅ **Recharts** para visualizaciones
- ✅ **Responsive Design**

---

## 🚀 INICIO RÁPIDO

### Requisitos
- Python 3.12+
- Node.js 18+
- PostgreSQL 16+
- Docker & Docker Compose (opcional)

### Instalación Local

#### 1. Clonar Repositorio
```bash
git clone https://github.com/Jean-snt/Cuestom-.git
cd Cuestom-
```

#### 2. Configurar Backend
```bash
# Crear entorno virtual
python -m venv venv
.\venv\Scripts\activate  # Linux/Mac: source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar archivo de entorno
copy .env.example .env  # Linux/Mac: cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
python migrate.py

# Crear superusuario (opcional)
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

#### 3. Configurar Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar desarrollo
npm start
```

### Instalación con Docker

```bash
# Iniciar todos los servicios (backend + PostgreSQL)
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

**URLs:**
- Backend: http://localhost:8000
- Admin: http://localhost:8000/admin
- API: http://localhost:8000/encuestas/api/surveys/
- Frontend: http://localhost:3000

---

## 🗄️ CONFIGURACIÓN DE BASE DE DATOS

### Opción 1: PostgreSQL Local

```bash
# Crear base de datos
createdb cuestom_db

# Configurar .env
DATABASE_URL=postgresql://postgres:tu-password@localhost:5432/cuestom_db
```

### Opción 2: AWS RDS PostgreSQL (Producción)

```bash
# Configurar DATABASE_URL en .env
DATABASE_URL=postgresql://postgres:PASSWORD@database-1.c41o6yqueege.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require

# Ejecutar migraciones
python migrate.py
```

Ver [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) para detalles completos.

---

## 📂 ESTRUCTURA DEL PROYECTO

```
survey_project/
├── domain/                    # Capa de dominio (lógica pura)
│   ├── entities/             # User, Survey
│   ├── value_objects/        # Email, Gender, UserId
│   ├── services/             # SurveyService, UserService
│   └── repositories/         # Interfaces abstractas
├── application/              # Capa de aplicación (casos de uso)
│   ├── use_cases/           # SurveyUseCases, UserUseCases
│   └── dto/                 # Data Transfer Objects
├── infrastructure/          # Capa de infraestructura
│   ├── persistence/        # Implementaciones ORM
│   └── web/                # Controladores HTTP
├── surveys/                # Capa de Django
│   ├── models/            # 13 modelos Django
│   ├── views/             # APIs REST
│   ├── migrations/        # 41 migraciones
│   └── templates/         # Plantillas HTML
├── frontend/              # Frontend React
│   ├── src/
│   │   ├── components/  # 30+ componentes
│   │   ├── hooks/       # useNotifications
│   │   └── context/     # UserContext
│   └── public/
├── Dockerfile            # Imagen Docker optimizada
├── docker-compose.yml   # Orquestación local
├── apprunner.yaml       # Config AWS App Runner
├── Makefile             # Comandos útiles
└── requirements.txt     # Dependencias Python
```

---

## 🔧 COMANDOS ÚTILES

### Makefile
```bash
make help              # Ver todos los comandos
make install           # Instalar dependencias
make migrate           # Ejecutar migraciones
make run               # Servidor desarrollo
make test              # Ejecutar tests
make docker-up         # Iniciar con Docker
make docker-logs       # Ver logs Docker
make clean             # Limpiar temporales
```

### Django Management
```bash
python manage.py runserver          # Servidor desarrollo
python manage.py createsuperuser    # Crear admin
python manage.py shell              # Shell Django
python manage.py test               # Ejecutar tests
python manage.py collectstatic      # Colectar estáticos
```

### Docker
```bash
docker-compose up -d                          # Iniciar servicios
docker-compose exec web python manage.py shell  # Shell Django
docker-compose logs -f web                     # Ver logs backend
docker-compose down -v                         # Detener y limpiar
```

---

## 🌐 DESPLIEGUE EN AWS

### AWS RDS PostgreSQL (Configurado)
```
Endpoint: database-1.c41o6yqueege.us-east-1.rds.amazonaws.com
Puerto: 5432
Base de Datos: postgres
```

### AWS App Runner

1. **Build imagen Docker:**
```bash
docker build -t cuestom-backend:latest .
```

2. **Push a ECR** (o usar GitHub directamente)

3. **Configurar en AWS Console:**
   - Service name: cuestom-backend
   - Source: GitHub (Jean-snt/Cuestom-)
   - Build: Usar `apprunner.yaml`
   - Environment: Agregar todas las variables de `.env.production`
   - Health check: `/health/`

Ver guía completa: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📊 API ENDPOINTS

### Autenticación
```
POST   /encuestas/api/auth/register/         # Registro
POST   /encuestas/api/auth/login/            # Login
POST   /encuestas/api/auth/verify/           # Verificar código 2FA
GET    /encuestas/api/auth/profile/          # Perfil usuario
```

### Encuestas
```
GET    /encuestas/api/surveys/               # Listar encuestas
POST   /encuestas/api/surveys/create/        # Crear encuesta
GET    /encuestas/api/surveys/{id}/          # Detalle
POST   /encuestas/api/surveys/{id}/submit/   # Responder
DELETE /encuestas/api/surveys/{id}/delete/   # Eliminar
POST   /encuestas/api/surveys/{id}/like/     # Like/Unlike
```

### Notificaciones
```
GET    /encuestas/api/notifications/                    # Listar
POST   /encuestas/api/notifications/{id}/read/         # Marcar leída
POST   /encuestas/api/notifications/mark-all-read/     # Marcar todas
DELETE /encuestas/api/notifications/delete-all/        # Eliminar todas
```

### Suscripciones VIP
```
GET    /encuestas/api/subscriptions/plans/             # Planes disponibles
GET    /encuestas/api/subscriptions/user/              # Suscripción actual
POST   /encuestas/api/subscriptions/create/            # Crear suscripción
POST   /encuestas/api/subscriptions/paypal-verify/     # Verificar pago
```

Ver documentación completa de la API: http://localhost:8000/encuestas/api/

---

## 🧪 TESTING

```bash
# Tests de Django
python manage.py test

# Tests con cobertura
coverage run --source='.' manage.py test
coverage report
coverage html

# Tests del frontend
cd frontend
npm test
```

---

## 🔐 SEGURIDAD

### Variables de Entorno Críticas
- ✅ `DJANGO_SECRET_KEY` - Nueva en cada entorno
- ✅ `DATABASE_URL` - Con `sslmode=require` en producción
- ✅ `DEBUG=False` - Siempre en producción
- ✅ `ALLOWED_HOSTS` - Lista explícita de dominios
- ✅ SSL/TLS habilitado para RDS

### Buenas Prácticas Implementadas
- Token-based authentication
- CORS configurado correctamente
- CSRF protection habilitado
- SQL injection prevention (ORM)
- XSS protection (bleach)
- Validación de archivos subidos
- Rate limiting (pendiente: django-ratelimit)

---

## 📈 MONITOREO

### Health Checks
```bash
# Health check general
curl http://localhost:8000/health/

# Readiness check
curl http://localhost:8000/readiness/

# Liveness check
curl http://localhost:8000/liveness/
```

### Logs
```bash
# Ver logs de Django
tail -f logs/django.log

# Ver logs de Docker
docker-compose logs -f web

# Ver logs de AWS (CloudWatch)
aws logs tail /aws/apprunner/cuestom-backend --follow
```

---

## 🛠️ TECNOLOGÍAS

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Python | 3.12 | Lenguaje principal |
| Django | 4.2.26 | Framework web |
| Django REST Framework | 3.14.0 | APIs REST |
| PostgreSQL | 16 | Base de datos |
| Gunicorn | 21.2.0 | WSGI server |
| psycopg2 | 2.9.11 | Driver PostgreSQL |
| dj-database-url | 2.1.0 | Parseo DATABASE_URL |
| Pillow | 12.1.0 | Imágenes |
| bleach | 6.1.0 | Sanitización HTML |

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19.2.0 | Framework UI |
| Material-UI | 7.3.4 | Componentes |
| React Router | 7.9.4 | Routing |
| Axios | 1.13.2 | HTTP client |
| Recharts | 3.3.0 | Gráficos |
| Zustand | 5.0.10 | Estado global |

### DevOps
| Tecnología | Uso |
|------------|-----|
| Docker | Containerización |
| Docker Compose | Orquestación local |
| AWS RDS | Base de datos PostgreSQL |
| AWS App Runner | Deploy containerizado |
| AWS ECR | Registry de imágenes |
| GitHub Actions | CI/CD (pendiente) |

---

## 📝 CHANGELOG

### v1.0.0 (2026-09-27)
- ✅ Configuración completa de AWS RDS PostgreSQL
- ✅ Dockerfile optimizado multi-stage
- ✅ Docker Compose para desarrollo local
- ✅ AWS App Runner configuration (apprunner.yaml)
- ✅ Health checks implementados
- ✅ Soporte para DATABASE_URL con SSL
- ✅ Scripts de migración automatizados
- ✅ Makefile con comandos útiles
- ✅ Guía completa de despliegue
- ✅ CORS configurado para producción
- ✅ Seguridad mejorada (SECRET_KEY, DEBUG, HTTPS)

---

## 👥 EQUIPO

- **Backend Development:** Jean (GitHub: @Jean-snt)
- **Architecture:** Hexagonal + DDD
- **DevOps:** AWS RDS + App Runner
- **Frontend:** React 19 + Material-UI

---

## 📄 LICENCIA

Este proyecto es privado. © 2026 Cuestom. Todos los derechos reservados.

---

## 🤝 CONTRIBUCIÓN

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'feat: Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

### Convenciones de Commits
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato, sin cambios de código
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Mantenimiento

---

## 📞 SOPORTE

- **Email:** soportecuestom@gmail.com
- **GitHub Issues:** https://github.com/Jean-snt/Cuestom-/issues
- **Documentación:** Ver carpeta `docs/`

---

## 🔗 LINKS ÚTILES

- [Guía de Despliegue AWS](DEPLOYMENT_GUIDE.md)
- [Análisis Técnico Completo](ANALISIS_TECNICO_Y_AWS.md)
- [Resumen Ejecutivo](RESUMEN_EJECUTIVO.md)
- [Django Documentation](https://docs.djangoproject.com/en/4.2/)
- [React Documentation](https://react.dev/)
- [AWS App Runner](https://docs.aws.amazon.com/apprunner/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/16/)

---

**⭐ Si te gusta este proyecto, dale una estrella en GitHub!**

---

Última actualización: 2026-09-27
