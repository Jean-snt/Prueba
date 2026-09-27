# 📊 ANÁLISIS TÉCNICO EXHAUSTIVO - PROYECTO CUESTOM
## Informe Completo de Arquitectura, AWS y Calidad de Código

---

## 📋 ÍNDICE
1. [Reconocimiento Técnico Detallado](#1-reconocimiento-técnico-detallado)
2. [Arquitectura Cloud-Native con AWS](#2-arquitectura-cloud-native-con-aws)
3. [Auditoría de Calidad y Limpieza](#3-auditoría-de-calidad-y-limpieza)
4. [Plan de Acción Recomendado](#4-plan-de-acción-recomendado)

---

## 1. RECONOCIMIENTO TÉCNICO DETALLADO

### 1.1 Stack Tecnológico Completo

#### **Backend**
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Python | 3.12/3.14 | Lenguaje principal |
| Django | 4.2.26 | Framework web MVC |
| Django REST Framework | 3.14.0 | APIs RESTful |
| PostgreSQL | (cliente: psycopg2-binary 2.9.11) | Base de datos principal |
| SQLite | 3.x | Base de datos de respaldo |

#### **Frontend**
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.2.0 | Framework UI |
| React Router | 7.9.4 | Enrutamiento SPA |
| Material-UI (MUI) | 7.3.4 | Componentes UI |
| Axios | 1.13.2 | Cliente HTTP |
| Recharts | 3.3.0 | Gráficos y visualización |
| Zustand | 5.0.10 | Estado global |
| Emotion | 11.14.x | CSS-in-JS |

#### **Dependencias Críticas**
```
django-cors-headers==4.3.1      # CORS para React-Django
django-countries==7.5.1         # Selector de países
Pillow==12.1.0                  # Manejo de imágenes
bleach==6.1.0                   # Sanitización HTML (seguridad)
python-dotenv==1.0.1            # Variables de entorno
paypalrestsdk==1.13.3           # Integración PayPal
requests==2.31.0                # HTTP client Python
```

### 1.2 Arquitectura del Código

#### **Patrón Arquitectónico: Hexagonal (Ports & Adapters) + DDD**

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌──────────┬──────────┬──────────┬──────────┐             │
│  │Components│  Hooks   │ Context  │ Services │             │
│  └─────┬────┴────┬─────┴────┬─────┴────┬─────┘             │
│        │         │          │          │                   │
│        └─────────┴──────────┴──────────┘                   │
│                      │                                      │
│                  Axios HTTP                                 │
└──────────────────────┼─────────────────────────────────────┘
                       │
                  REST API (JSON)
                       │
┌──────────────────────┼─────────────────────────────────────┐
│               BACKEND (Django)                              │
│                      │                                      │
│  ┌───────────────────┴────────────────────────┐            │
│  │  INFRASTRUCTURE (infrastructure/)          │            │
│  │  ┌──────────────┬──────────────────────┐   │            │
│  │  │ Web (Views)  │ Persistence (ORM)    │   │            │
│  │  └──────┬───────┴──────────┬───────────┘   │            │
│  └─────────┼──────────────────┼───────────────┘            │
│            │                  │                             │
│  ┌─────────┴──────────────────┴───────────────┐            │
│  │  APPLICATION (application/)                 │            │
│  │  ┌──────────────┬──────────────────────┐   │            │
│  │  │ Use Cases    │ DTOs                 │   │            │
│  │  └──────┬───────┴──────────┬───────────┘   │            │
│  └─────────┼──────────────────┼───────────────┘            │
│            │                  │                             │
│  ┌─────────┴──────────────────┴───────────────┐            │
│  │  DOMAIN (domain/)                           │            │
│  │  ┌──────────────┬──────────────────────┐   │            │
│  │  │ Entities     │ Value Objects        │   │            │
│  │  │ Services     │ Repositories (IF)    │   │            │
│  │  └──────────────┴──────────────────────┘   │            │
│  └─────────────────────────────────────────────┘            │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │  DJANGO LAYER (surveys/)                     │           │
│  │  ┌──────────────┬──────────────────────┐    │           │
│  │  │ Models (ORM) │ Views (REST)         │    │           │
│  │  │ Signals      │ Admin                │    │           │
│  │  └──────────────┴──────────────────────┘    │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                       │
                  PostgreSQL
```

#### **Módulos Principales y sus Responsabilidades**

**A) Domain Layer (Lógica de Negocio Pura)**
```
domain/
├── entities/          # Entidades del dominio
│   ├── user.py       # User (id, username, email, gender, user_type)
│   └── survey.py     # Survey (id, title, description, creator_id, status)
├── value_objects/     # Objetos de valor inmutables
│   ├── email.py      # Email con validación regex
│   ├── gender.py     # Enum: MALE, FEMALE, OTHER, ANONYMOUS
│   ├── user_id.py    # ID tipado de usuario
│   └── survey_id.py  # ID tipado de encuesta
├── services/          # Servicios de dominio (lógica compleja)
│   ├── survey_service.py    # Validaciones de encuestas
│   └── user_service.py      # Validaciones de usuarios
├── repositories/      # Interfaces (contratos)
│   ├── survey_repository.py # ABC para persistencia
│   └── user_repository.py   # ABC para persistencia
└── exceptions/
    └── domain_exceptions.py # Excepciones del dominio
```

**B) Application Layer (Casos de Uso)**
```
application/
├── use_cases/         # Orquestación de operaciones
│   ├── survey_use_cases.py     # CRUD de encuestas
│   ├── user_use_cases.py       # Gestión de usuarios
│   └── response_use_cases.py   # Respuestas a encuestas
├── dto/              # Data Transfer Objects
│   ├── survey_dto.py # CreateSurveyRequest, SurveyResponse
│   └── user_dto.py   # CreateUserRequest, UserResponse
└── interfaces/       # Interfaces de repositorios
    ├── survey_repository_interface.py
    └── user_repository_interface.py
```

**C) Infrastructure Layer (Implementaciones Concretas)**
```
infrastructure/
├── container.py      # Dependency Injection Container
├── persistence/      # Implementaciones de repositorios
│   ├── django_survey_repository.py  # ORM Django
│   └── django_user_repository.py
└── web/             # Controladores HTTP
    ├── django_survey_controller.py
    └── django_user_controller.py
```

**D) Django Layer (Capa de Persistencia y API)**
```
surveys/
├── models/          # 13 modelos Django ORM
│   ├── survey.py           # Encuesta (title, description, likes, views)
│   ├── user_profile.py     # Perfil (age, gender, is_vip, karma)
│   ├── subscription.py     # Suscripciones VIP (monthly, quarterly, annual)
│   ├── response.py         # Respuestas de usuarios
│   ├── comment.py          # Comentarios anidados
│   ├── notification.py     # Sistema de notificaciones
│   ├── report.py           # Sistema de reportes
│   └── password_reset.py   # Recuperación de contraseña
├── views/           # APIs REST (50+ endpoints)
│   ├── api_views.py              # APIs principales
│   ├── auth_views.py             # Autenticación
│   ├── survey_views.py           # Vistas tradicionales Django
│   ├── response_views.py
│   ├── hexagonal_api_views.py    # APIs con arquitectura hexagonal
│   └── api_ranking_2026.py       # Rankings trimestrales
├── migrations/      # 41 migraciones de base de datos
├── admin.py         # Panel de administración
├── signals.py       # Eventos automáticos (notificaciones)
├── backends.py      # Backend de autenticación personalizado
└── middleware.py    # CORS debugging
```

**E) Frontend (React SPA)**
```
frontend/
├── src/
│   ├── components/        # 30+ componentes
│   │   ├── HomePage.js           # Landing page
│   │   ├── Dashboard.js          # Dashboard VIP (lazy)
│   │   ├── SurveyList.js         # Lista de encuestas
│   │   ├── SurveyDetail.js       # Detalle con likes/comentarios
│   │   ├── SurveyForm.js         # Crear encuesta (lazy)
│   │   ├── SurveyResults.js      # Gráficos (lazy)
│   │   ├── Login.js / Register.js
│   │   ├── VerifyAccount.js      # Verificación 2FA
│   │   ├── UserProfile.js        # Perfil (lazy)
│   │   ├── VipPage.js            # Planes VIP (lazy)
│   │   ├── CheckoutPage.js       # Pago PayPal (lazy)
│   │   ├── NotificationCenter.js # Notificaciones
│   │   └── CommentsSection.js    # Comentarios anidados
│   ├── hooks/
│   │   └── useNotifications.js   # Hook con polling (30s)
│   ├── context/
│   │   └── UserContext.js        # Estado global de autenticación
│   ├── services/
│   │   └── api.js                # Cliente Axios con interceptores
│   └── App.js                    # Router con lazy loading
├── public/
└── package.json
```

### 1.3 Funcionalidades Core del Sistema

#### **Sistema de Autenticación Completo**
- ✅ Registro con validación de edad (18+)
- ✅ Anti-spam: bloquea 30+ dominios de emails temporales
- ✅ Verificación 2FA con código de 6 dígitos (expira en 15 min)
- ✅ Login con username/email + password
- ✅ Token authentication (DRF)
- ✅ Backend personalizado: `EmailOrUsernameModelBackend`
- ✅ Recuperación de contraseña con tokens únicos

#### **Sistema de Encuestas Avanzado**
- ✅ CRUD completo de encuestas
- ✅ 5 tipos de preguntas: texto libre, opción única/múltiple, lista desplegable, escala 1-5
- ✅ Imágenes en encuestas (SOLO VIP)
- ✅ Marcado NSFW opcional
- ✅ Persistencia histórica del creador (username + género)
- ✅ Contador de vistas (incrementa automáticamente)
- ✅ Likes/dislikes con usuarios many-to-many
- ✅ Expiración programada (campo `expires_at` para FOMO)
- ✅ Filtros avanzados: país, edad, género, búsqueda, NSFW
- ✅ Rankings: histórico y trimestral 2026

#### **Sistema VIP y Monetización**
- ✅ 3 planes: Monthly ($9.99), Quarterly ($26.99), Annual ($89.99)
- ✅ Integración PayPal SDK (sandbox/live)
- ✅ AWS Lambda para procesamiento de pagos
- ✅ Pagos manuales: Yape/BCP con comprobante
- ✅ Aprobación manual por admin
- ✅ Sistema de Karma (puntos de recompensa)
- ✅ Dashboard exclusivo VIP
- ✅ Auto-expiración de suscripciones

#### **Sistema de Notificaciones**
- ✅ 5 tipos: comment, response, survey, general, vip_karma
- ✅ Signal automático: notifica al creador cuando hay nueva respuesta
- ✅ Polling cada 30 segundos en frontend
- ✅ Marcar como leída individual/masivo
- ✅ Eliminar individual/vaciar bandeja
- ✅ CASCADE delete con encuestas

#### **Sistema de Comentarios y Moderación**
- ✅ Comentarios anidados (respuestas a comentarios)
- ✅ Edición y eliminación por autor
- ✅ Sistema de reportes (ContentType genérico)
- ✅ Suspensión automática a 8 reportes (3 días)
- ✅ Sanitización HTML con bleach (seguridad XSS)

### 1.4 Base de Datos y Persistencia

#### **PostgreSQL (Producción)**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'cuestom_db',
        'USER': 'postgres',
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': 'localhost',
        'PORT': '5432'
    }
}
```

#### **Modelos Principales (13 modelos)**

| Modelo | Propósito | Relaciones Clave |
|--------|-----------|------------------|
| Survey | Encuestas | ForeignKey(User creator), M2M(liked_by, disliked_by) |
| Question | Preguntas | ForeignKey(Survey) |
| Choice | Opciones | ForeignKey(Question) |
| Response | Respuestas | ForeignKey(Survey, User) |
| Answer | Respuestas individuales | ForeignKey(Response, Question, Choice) |
| UserProfile | Perfil extendido | OneToOne(User), karma, is_vip |
| Subscription | Suscripciones VIP | OneToOne(User), estados: active/pending/expired |
| Notification | Notificaciones | ForeignKey(User recipient, Survey) |
| Comment | Comentarios | ForeignKey(Survey, User, parent_comment) |
| Report | Reportes | GenericForeignKey (Survey/Comment/User) |
| PasswordResetToken | Tokens de reset | ForeignKey(User) |
| SurveyView | Tracking de vistas | ForeignKey(Survey, User) |
| VipFeedbackSubmission | Feedback VIP | ForeignKey(User) |

#### **Migrations (41 aplicadas)**
- ✅ Esquema versionado desde 0001_initial hasta 0041
- ✅ Evolución incremental: verificación → VIP → karma → likes → expiración
- ✅ Respaldo disponible: `data_backup_total.json`

---

## 2. ARQUITECTURA CLOUD-NATIVE CON AWS

### 2.1 Propuesta de Infraestructura AWS

#### **🎯 OPCIÓN 1: Serverless (Recomendada para MVP y escalabilidad)**

```
┌────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
└──────────────────────┬─────────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │  CloudFront (CDN Global)   │ ← Caché de frontend
         │  + S3 (Static Frontend)    │ ← React build
         └─────────────┬──────────────┘
                       │
         ┌─────────────┴──────────────┐
         │  Route 53 (DNS)            │ ← cuestom.com
         │  + ACM (SSL Certificates)  │ ← HTTPS
         └─────────────┬──────────────┘
                       │
         ┌─────────────┴──────────────┐
         │  API Gateway (HTTP API)    │ ← REST API endpoints
         │  + Lambda Authorizer       │ ← Token validation
         └─────────────┬──────────────┘
                       │
      ┌────────────────┼────────────────┐
      │                │                │
┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
│ Lambda    │   │ Lambda    │   │ Lambda    │
│ (Django)  │   │ (Surveys) │   │ (Payment) │
│ Runtime:  │   │ Runtime:  │   │ Runtime:  │
│ Python    │   │ Python    │   │ Node.js   │
└─────┬─────┘   └─────┬─────┘   └─────┬─────┘
      │               │               │
      └───────────────┼───────────────┘
                      │
      ┌───────────────┴───────────────┐
      │                               │
┌─────┴─────┐            ┌────────────┴──────────┐
│ RDS       │            │ DynamoDB              │
│ PostgreSQL│            │ (Sessions/Tokens)     │
│ Multi-AZ  │            └───────────────────────┘
└─────┬─────┘
      │
┌─────┴─────────────────┐
│ S3 (Media Files)      │ ← Imágenes, comprobantes
│ + CloudFront CDN      │
└───────────────────────┘

┌───────────────────────────────────┐
│ SES (Email Service)               │ ← Verificación, notificaciones
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ EventBridge + Lambda              │ ← Cron jobs (expiración, suspensión)
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ CloudWatch Logs + X-Ray           │ ← Monitoring y debugging
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ Secrets Manager                   │ ← DB passwords, API keys
└───────────────────────────────────┘
```

**Ventajas:**
- ✅ Auto-escalado automático
- ✅ Pago por uso real (cost-effective para startups)
- ✅ Sin mantenimiento de servidores
- ✅ Alta disponibilidad nativa
- ✅ Global desde día 1 (CloudFront)

**Costo estimado mensual:**
- Lambda: ~$10-50 (1M requests)
- RDS t3.micro: ~$15
- S3: ~$5
- CloudFront: ~$10
- **Total: $40-100/mes** (tráfico bajo/medio)

---

#### **🎯 OPCIÓN 2: Contenedores (Recomendada para control total)**

```
┌────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
└──────────────────────┬─────────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │  Application Load Balancer │ ← ALB con SSL
         │  (ALB) + Route 53          │
         └─────────────┬──────────────┘
                       │
         ┌─────────────┴──────────────┐
         │  ECS Fargate (Cluster)     │
         │  ┌──────────────────────┐  │
         │  │ Service: Django API  │  │ ← 2-10 tasks (auto-scale)
         │  │ Image: ECR Registry  │  │
         │  └──────────────────────┘  │
         │  ┌──────────────────────┐  │
         │  │ Service: Celery      │  │ ← Async tasks
         │  │ (Background jobs)    │  │
         │  └──────────────────────┘  │
         └─────────────┬──────────────┘
                       │
      ┌────────────────┼────────────────┐
      │                │                │
┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
│ RDS       │   │ ElastiCache│   │ S3        │
│ PostgreSQL│   │ Redis      │   │ Media     │
│ Multi-AZ  │   │ (Cache)    │   │ Files     │
└───────────┘   └───────────┘   └───────────┘

┌───────────────────────────────────┐
│ CloudFront + S3                   │ ← Frontend React (build/)
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ SES (Email) + SNS (Push)          │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ CloudWatch + Container Insights   │
└───────────────────────────────────┘
```

**Ventajas:**
- ✅ Control total del runtime
- ✅ Mejor para aplicaciones Django complejas
- ✅ Fácil debugging
- ✅ Compatible con cualquier librería Python

**Costo estimado mensual:**
- Fargate (2 tasks 0.5 vCPU): ~$30-60
- RDS t3.small: ~$30
- ElastiCache t3.micro: ~$15
- S3 + CloudFront: ~$15
- **Total: $90-150/mes**

---

### 2.2 Servicios AWS Necesarios (Detallado)

#### **A) Compute**

| Servicio | Uso | Configuración Recomendada |
|----------|-----|---------------------------|
| **Lambda** | APIs Django, procesamiento de pagos | Runtime: Python 3.12, Memory: 512MB-1GB, Timeout: 30s |
| **ECS Fargate** | Contenedor Django (alternativa) | 0.5 vCPU, 1GB RAM por task, Auto-scaling 2-10 tasks |
| **ECR** | Registry de imágenes Docker | Repositorios: `cuestom-django`, `cuestom-celery` |
| **Elastic Beanstalk** | Deploy rápido Django (alternativa) | Python 3.12, Load Balanced, Auto-scaling |

#### **B) Base de Datos**

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **RDS PostgreSQL** | Base de datos principal | Instance: db.t3.micro/small, Multi-AZ: Sí, Backup: 7 días |
| **DynamoDB** | Sesiones, tokens, caché | On-demand pricing, TTL habilitado |
| **ElastiCache Redis** | Caché de queries, sesiones | node: cache.t3.micro, Encryption: Sí |

**Configuración RDS recomendada:**
```hcl
resource "aws_db_instance" "cuestom_db" {
  identifier              = "cuestom-postgres"
  engine                  = "postgres"
  engine_version          = "16.1"
  instance_class          = "db.t3.micro"   # Upgrade a t3.small en producción
  allocated_storage       = 20
  max_allocated_storage   = 100             # Auto-scaling storage
  storage_encrypted       = true
  multi_az                = true            # Alta disponibilidad
  backup_retention_period = 7
  db_name                 = "cuestom_db"
  username                = "cuestom_admin"
  password                = random_password.db_password.result
  
  # Security
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible     = false
  
  tags = {
    Name        = "Cuestom PostgreSQL"
    Environment = "production"
  }
}
```

#### **C) Storage**

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **S3** | Imágenes de encuestas, comprobantes de pago, backups | Bucket: `cuestom-media`, Versioning: Sí, Lifecycle: 90 días a Glacier |
| **S3** | Frontend React (build estático) | Bucket: `cuestom-frontend`, Static Website Hosting |
| **EFS** | Sistema de archivos compartido (opcional) | Lifecycle: 30 días a Infrequent Access |

**Estructura de buckets S3:**
```
cuestom-media/
├── survey-images/        # Imágenes de encuestas
├── profile-images/       # Fotos de perfil
├── payment-proofs/       # Comprobantes Yape/BCP
└── backups/             # Respaldos de BD

cuestom-frontend/
├── index.html
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── favicon.ico
```

#### **D) Networking y CDN**

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **CloudFront** | CDN global para frontend y media | Origins: S3 frontend + S3 media, Cache: TTL 1 día |
| **Route 53** | DNS y dominio | Hosted Zone: cuestom.com, Health Checks |
| **VPC** | Red privada | CIDR: 10.0.0.0/16, Subnets: public (2) + private (2) |
| **Application Load Balancer** | Balanceo de tráfico HTTP(S) | Target: ECS Fargate o Lambda, SSL: ACM |
| **API Gateway** | REST API para Lambda | HTTP API (payload 2.0), Authorizer: Lambda Token |

#### **E) Seguridad e IAM**

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **Secrets Manager** | Credenciales sensibles | Secrets: DB_PASSWORD, DJANGO_SECRET_KEY, PAYPAL_CLIENT_SECRET |
| **Systems Manager Parameter Store** | Variables de entorno | Parameters: EMAIL_HOST_USER, PAYPAL_MODE |
| **IAM Roles** | Permisos Lambda/ECS | Policies: S3 read/write, RDS connect, SES send |
| **ACM** | Certificados SSL/TLS | Wildcard: *.cuestom.com |
| **WAF** | Firewall de aplicación | Rules: Rate limiting, SQL injection, XSS |

**Ejemplo de IAM Role para Lambda:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::cuestom-media/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds-data:ExecuteStatement",
        "rds:DescribeDBInstances"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:cuestom/*"
    }
  ]
}
```

#### **F) Messaging y Notifications**

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **SES** | Email verificación, notificaciones | Domain: cuestom.com, DKIM/SPF configured |
| **SNS** | Push notifications | Topics: new-response, new-comment, vip-expiration |
| **SQS** | Cola de mensajes asíncronos | Queue: payment-processing, DLQ: Sí |
| **EventBridge** | Cron jobs y eventos | Rules: expirar suscripciones, levantar suspensiones |

**EventBridge Rules necesarias:**
```yaml
# Expirar suscripciones VIP
ExpirationCheckRule:
  Schedule: rate(1 hour)
  Target: Lambda (check_expired_subscriptions)

# Levantar suspensiones de usuarios (3 días)
SuspensionLiftRule:
  Schedule: rate(6 hours)
  Target: Lambda (lift_suspensions)

# Cleanup de notificaciones antiguas
NotificationCleanupRule:
  Schedule: cron(0 2 * * ? *)  # 2 AM diario
  Target: Lambda (cleanup_old_notifications)
```

#### **G) Monitoring y Logging**

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **CloudWatch Logs** | Logs de aplicación | Retention: 30 días, Metric Filters |
| **CloudWatch Metrics** | Métricas de aplicación | Custom: survey_created, payment_success |
| **X-Ray** | Distributed tracing | Enable en Lambda/ECS |
| **CloudWatch Alarms** | Alertas | Alarms: High CPU, DB connections, Error rate |

### 2.3 Ajustes de Código para Cloud-Native

#### **A) Variables de Entorno (12-Factor App)**

**Archivo: `settings.py`**
```python
import os
import boto3
from botocore.exceptions import ClientError

# ===== AWS SECRETS MANAGER INTEGRATION =====
def get_secret(secret_name):
    """Obtener secretos desde AWS Secrets Manager"""
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=os.getenv('AWS_REGION', 'us-east-1')
    )
    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
        return json.loads(get_secret_value_response['SecretString'])
    except ClientError as e:
        raise Exception(f"Error fetching secret {secret_name}: {e}")

# Cargar secretos de AWS en producción
if os.getenv('ENVIRONMENT') == 'production':
    secrets = get_secret('cuestom/django')
    SECRET_KEY = secrets['SECRET_KEY']
    DB_PASSWORD = secrets['DB_PASSWORD']
    EMAIL_HOST_PASSWORD = secrets['EMAIL_HOST_PASSWORD']
    PAYPAL_CLIENT_SECRET = secrets['PAYPAL_CLIENT_SECRET']
else:
    # Desarrollo: usar .env local
    from dotenv import load_dotenv
    load_dotenv()
    SECRET_KEY = os.getenv('SECRET_KEY')
    DB_PASSWORD = os.getenv('DB_PASSWORD')

# ===== CONFIGURACIÓN DE BASE DE DATOS =====
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'cuestom_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': DB_PASSWORD,
        'HOST': os.getenv('DB_HOST', 'localhost'),  # RDS endpoint en producción
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'connect_timeout': 5,
            'sslmode': 'require' if os.getenv('ENVIRONMENT') == 'production' else 'prefer',
        }
    }
}

# ===== CONFIGURACIÓN DE S3 PARA ARCHIVOS MEDIA =====
if os.getenv('ENVIRONMENT') == 'production':
    # Usar S3 en producción
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', 'cuestom-media')
    AWS_S3_REGION_NAME = os.getenv('AWS_REGION', 'us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',  # 1 día
    }
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
else:
    # Usar sistema de archivos local en desarrollo
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'

# ===== CONFIGURACIÓN DE EMAIL CON SES =====
if os.getenv('ENVIRONMENT') == 'production':
    EMAIL_BACKEND = 'django_ses.SESBackend'
    AWS_SES_REGION_NAME = os.getenv('AWS_REGION', 'us-east-1')
    AWS_SES_REGION_ENDPOINT = f'email.{AWS_SES_REGION_NAME}.amazonaws.com'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    # ... resto de configuración SMTP

# ===== LOGGING PARA CLOUDWATCH =====
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
        'cloudwatch': {
            'class': 'watchtower.CloudWatchLogHandler',
            'log_group': '/aws/django/cuestom',
            'stream_name': '{hostname}-{strftime:%Y-%m-%d}',
            'formatter': 'json',
        } if os.getenv('ENVIRONMENT') == 'production' else {
            'class': 'logging.NullHandler',
        }
    },
    'root': {
        'handlers': ['console', 'cloudwatch'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'cloudwatch'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# ===== CORS PARA CLOUDFRONT =====
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    os.getenv('FRONTEND_URL', 'https://cuestom.com'),  # CloudFront URL
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    os.getenv('FRONTEND_URL', 'https://cuestom.com'),
]

# ===== SEGURIDAD EN PRODUCCIÓN =====
if os.getenv('ENVIRONMENT') == 'production':
    DEBUG = False
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 año
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    X_FRAME_OPTIONS = 'DENY'
```

**Dependencias adicionales necesarias:**
```txt
# requirements.txt (AWS)
boto3==1.34.69
django-storages==1.14.2
django-ses==3.5.2
watchtower==3.0.1
python-json-logger==2.0.7
```

#### **B) Dockerfile para ECS/Lambda**

**Archivo: `Dockerfile`**
```dockerfile
# ===== STAGE 1: Builder =====
FROM python:3.12-slim as builder

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements y instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ===== STAGE 2: Runtime =====
FROM python:3.12-slim

WORKDIR /app

# Instalar solo runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias instaladas desde builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copiar código de la aplicación
COPY . .

# Crear usuario no-root
RUN useradd -m -u 1000 django && \
    chown -R django:django /app
USER django

# Exponer puerto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health/', timeout=2)"

# Comando de inicio
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "survey_project.wsgi:application"]
```

**Archivo: `docker-compose.yml` (para desarrollo local)**
```yaml
version: '3.8'

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: cuestom_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      - ENVIRONMENT=development
      - DB_HOST=db
      - REDIS_HOST=redis

  celery:
    build: .
    command: celery -A survey_project worker -l info
    volumes:
      - .:/app
    depends_on:
      - db
      - redis
    environment:
      - ENVIRONMENT=development
      - DB_HOST=db
      - REDIS_HOST=redis

volumes:
  postgres_data:
```

#### **C) Lambda Handler para Django**

**Archivo: `lambda_handler.py`**
```python
import json
import os
import sys
import django
from io import StringIO
from urllib.parse import urlencode

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from django.core.handlers.wsgi import WSGIHandler
from django.test import RequestFactory

def lambda_handler(event, context):
    """
    AWS Lambda handler para Django
    Compatible con API Gateway HTTP API (payload format 2.0)
    """
    # Parsear evento de API Gateway
    http_method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    path = event.get('rawPath', '/')
    query_string = event.get('rawQueryString', '')
    headers = event.get('headers', {})
    body = event.get('body', '')
    is_base64 = event.get('isBase64Encoded', False)

    # Decodificar body si está en base64
    if is_base64:
        import base64
        body = base64.b64decode(body).decode('utf-8')

    # Crear request Django
    factory = RequestFactory()
    
    if http_method == 'GET':
        request = factory.get(path, query_string, **headers)
    elif http_method == 'POST':
        request = factory.post(path, data=body, content_type=headers.get('content-type', 'application/json'), **headers)
    elif http_method == 'PUT':
        request = factory.put(path, data=body, content_type=headers.get('content-type', 'application/json'), **headers)
    elif http_method == 'DELETE':
        request = factory.delete(path, **headers)
    else:
        return {
            'statusCode': 405,
            'body': json.dumps({'error': 'Method not allowed'})
        }

    # Procesar request con WSGI handler
    wsgi_handler = WSGIHandler()
    response = wsgi_handler(request)

    # Construir respuesta para API Gateway
    return {
        'statusCode': response.status_code,
        'headers': dict(response.items()),
        'body': response.content.decode('utf-8'),
        'isBase64Encoded': False
    }
```

#### **D) Health Check Endpoint**

**Archivo: `surveys/views/health_views.py`**
```python
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import boto3
import os

def health_check(request):
    """
    Health check endpoint para ALB/Lambda
    Verifica: BD, caché, S3
    """
    checks = {
        'database': False,
        'cache': False,
        's3': False,
        'status': 'unhealthy'
    }

    # Check 1: Base de datos
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks['database'] = True
    except Exception as e:
        checks['database_error'] = str(e)

    # Check 2: Caché (Redis/DynamoDB)
    try:
        cache.set('health_check', 'ok', 10)
        checks['cache'] = cache.get('health_check') == 'ok'
    except Exception as e:
        checks['cache_error'] = str(e)

    # Check 3: S3 (solo en producción)
    if os.getenv('ENVIRONMENT') == 'production':
        try:
            s3 = boto3.client('s3')
            s3.head_bucket(Bucket=os.getenv('AWS_STORAGE_BUCKET_NAME'))
            checks['s3'] = True
        except Exception as e:
            checks['s3_error'] = str(e)
    else:
        checks['s3'] = True  # Skip en desarrollo

    # Determinar estado general
    if all([checks['database'], checks['cache'], checks['s3']]):
        checks['status'] = 'healthy'
        status_code = 200
    else:
        status_code = 503

    return JsonResponse(checks, status=status_code)
```

---

## 3. AUDITORÍA DE CALIDAD Y LIMPIEZA

### 3.1 Archivos Innecesarios Detectados

#### **🗑️ ARCHIVOS TEMPORALES Y CACHÉ (880 directorios)**

**Python Cache:**
```
__pycache__/                    # 880 directorios detectados
*.pyc                           # Bytecode compilado
*.pyo                           # Bytecode optimizado
*.py[cod]                       # Variantes de bytecode
```

**Node.js:**
```
frontend/node_modules/          # ~200MB+ de dependencias (debe estar en .gitignore)
frontend/build/                 # Build de producción (regenerable)
frontend/.eslintcache           # Caché de ESLint
```

**Archivos de Sistema:**
```
.DS_Store                       # macOS
Thumbs.db                       # Windows
desktop.ini                     # Windows
```

**IDEs:**
```
.vscode/                        # Configuración VS Code (puede ser útil, pero personal)
.idea/                          # IntelliJ/PyCharm
*.swp, *.swo, *~                # Vim
```

#### **📄 ARCHIVOS DE RESPALDO Y TEMPORALES**

```
db.sqlite3                      # Base de datos SQLite (ya usando PostgreSQL)
data_backup_total.json          # Respaldo manual (¿necesario?)
backup_sqlite/                  # Carpeta de respaldo vacía
clean_postgres.py               # Script de limpieza (temporal?)
create_postgres_db.py           # Script de setup (temporal?)
import_final.py                 # Script de migración (temporal?)
set_vip.py                      # Script de testing (temporal?)
```

#### **🔧 SCRIPTS Y CONFIGURACIONES**

```
iniciar_sistema_completo.bat    # Script Windows (específico de entorno)
lambda-procesar-pago-cuestom.js # ¿Debe estar en repositorio separado para Lambda?
CORRECCIONES_CRITICAS_APLICADAS.md # Documentación temporal
```

#### **📂 CARPETAS VACÍAS O INFRAUTILIZADAS**

```
.qodo/                          # Carpeta vacía (¿qué es?)
backup_sqlite/                  # Carpeta vacía
static/                         # ¿Hay archivos estáticos?
```

### 3.2 Problemas de Código Detectados

#### **❌ CÓDIGO DUPLICADO**

**A) Modelos duplicados entre Django y Domain:**
- `surveys/models/survey.py` (Django ORM)
- `domain/entities/survey.py` (Domain entity)

**Problema:** Duplicación de lógica de validación y estructura

**B) Repositorios no implementados:**
- `infrastructure/persistence/` contiene interfaces pero las implementaciones Django están comentadas

#### **⚠️ DEAD CODE (Código No Utilizado)**

**A) Endpoints hexagonales comentados:**
```python
# surveys/urls.py
# from .views.hexagonal_api_views import ...
# Los endpoints hexagonales están importados pero NO se usan en production
```

**B) Backend de autenticación dual:**
```python
AUTHENTICATION_BACKENDS = [
    'surveys.backends.EmailOrUsernameModelBackend',
    'django.contrib.auth.backends.ModelBackend',  # ← REDUNDANTE si el primero funciona
]
```

**C) Configuración de base de datos comentada:**
```python
# SQLite comentado (dead code)
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }
```

#### **🔐 PROBLEMAS DE SEGURIDAD**

**A) Credenciales hardcodeadas:**
```python
# survey_project/settings.py
SECRET_KEY = 'tu-secret-key'  # ← CRÍTICO: En producción debe venir de .env
```

**B) DEBUG=True en settings:**
```python
DEBUG = True  # ← PELIGROSO en producción
```

**C) ALLOWED_HOSTS vacío:**
```python
ALLOWED_HOSTS = []  # ← Debe incluir dominio en producción
```

**D) Falta validación de archivos subidos:**
```python
# surveys/models/subscription.py
payment_proof = models.FileField(upload_to='vouchers/', ...)
# ⚠️ No valida tipo de archivo ni tamaño
```

#### **🐛 MALAS PRÁCTICAS**

**A) Imports absolutos mezclados con relativos:**
```python
# Inconsistente
from application.use_cases.survey_use_cases import SurveyUseCases  # Absoluto
from .models import Survey  # Relativo
```

**B) Falta manejo de errores en Lambdas:**
```javascript
// lambda-procesar-pago-cuestom.js
// No hay try-catch en procesamiento de pago
```

**C) Hardcoded URLs en frontend:**
```javascript
// frontend/src/services/api.js
const API_BASE_URL = 'http://localhost:8000/encuestas/api';
// ⚠️ Debe venir de process.env.REACT_APP_API_URL
```

**D) Configuración de email con fallback silencioso:**
```python
if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
# ⚠️ En producción, debería fallar si no está configurado
```

**E) Signals sin manejo de errores:**
```python
# surveys/signals.py
@receiver(post_save, sender=Response)
def create_response_notification(sender, instance, created, **kwargs):
    # No hay try-except, si falla la notificación, falla el Response.save()
```

### 3.3 Optimizaciones Necesarias

#### **🚀 PERFORMANCE**

**A) N+1 Queries en APIs:**
```python
# surveys/views/api_views.py
# ⚠️ Falta select_related/prefetch_related
surveys = Survey.objects.all()  # ← Cada survey luego hace query por creator
```

**Solución:**
```python
surveys = Survey.objects.select_related('creator').prefetch_related('liked_by', 'disliked_by')
```

**B) Sin paginación en listas:**
```python
# ⚠️ Devuelve TODAS las encuestas sin límite
def api_surveys(request):
    surveys = Survey.objects.all()
```

**Solución:**
```python
from rest_framework.pagination import PageNumberPagination

class SurveyPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
```

**C) Falta de índices en BD:**
```python
# surveys/models/survey.py
class Survey(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    # ⚠️ No tiene db_index=True pero se usa frecuentemente en ORDER BY
```

**D) Sin compresión de imágenes:**
```python
# ⚠️ Las imágenes se suben sin compresión
image = models.ImageField(upload_to='survey_images/')
```

#### **📦 BUNDLE SIZE FRONTEND**

**Problemas detectados:**
- Material-UI 7.3.4 es muy pesado (~1MB)
- React 19.2 + React-DOM (~500KB)
- Sin code splitting efectivo (solo lazy loading básico)
- Recharts (~400KB) se carga aunque no se use

**Recomendaciones:**
1. Implementar tree-shaking correcto
2. Lazy load Recharts solo en SurveyResults
3. Considerar alternativas más ligeras que MUI (Mantine, Chakra UI)
4. Implementar Brotli compression en CloudFront

---

### 3.4 .gitignore Mejorado

**Archivo: `.gitignore` (VERSIÓN COMPLETA PARA AWS)**

```gitignore
# ============================================================================
# GITIGNORE OPTIMIZADO PARA PROYECTO CUESTOM
# Cloud-Native AWS + Django + React
# ============================================================================

# ===== CREDENCIALES Y SECRETOS (CRÍTICO - NUNCA SUBIR) =====
.env
.env.local
.env.development
.env.production
.env.staging
.env.test
*.pem
*.key
*.crt
secrets.json
DATABASE_CREDENTIALS.md
db_credentials.md
aws-credentials.json

# ===== BASE DE DATOS =====
*.sqlite3
db.sqlite3
*.db
backup_sqlite/
data_backup_total.json

# ===== PYTHON =====
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
pip-wheel-metadata/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST
*.log
*.pot
*.pyc
*.pyo
*.pyd
.pytest_cache/
.coverage
.tox/
.hypothesis/
htmlcov/

# ===== DJANGO =====
*.log
local_settings.py
media/
staticfiles/
static_root/
*.mo
.env

# ===== ENTORNO VIRTUAL =====
venv/
env/
ENV/
env.bak/
venv.bak/
.venv/
virtualenv/

# ===== NODE.JS / REACT =====
node_modules/
frontend/node_modules/
frontend/build/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnp
.pnp.js
.eslintcache

# ===== IDES Y EDITORES =====
.vscode/
.idea/
*.swp
*.swo
*.swn
*~
.project
.pydevproject
.settings/
*.sublime-project
*.sublime-workspace

# ===== SISTEMA OPERATIVO =====
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini
$RECYCLE.BIN/

# ===== AWS =====
.aws/
aws-config.json
terraform.tfstate
terraform.tfstate.backup
.terraform/
*.tfvars
cdk.out/
.serverless/

# ===== DOCKER =====
*.dockerfile.swp
docker-compose.override.yml
.dockerignore

# ===== TESTING =====
coverage/
.nyc_output/
test-results/
junit.xml
*.test.js.snap

# ===== LOGS =====
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
pip-log.txt
pip-delete-this-directory.txt

# ===== TEMPORALES Y BACKUP =====
*.bak
*.tmp
*.temp
*~
.cache/
.temp/
tmp/
temp/
backup/
*.backup

# ===== ARCHIVOS DE PROYECTO ESPECÍFICOS =====
clean_postgres.py
create_postgres_db.py
import_final.py
set_vip.py
iniciar_sistema_completo.bat
CORRECCIONES_CRITICAS_APLICADAS.md

# ===== JUPYTER NOTEBOOKS =====
.ipynb_checkpoints/
*.ipynb

# ===== CERTIFICADOS Y KEYS =====
*.pem
*.key
*.csr
*.crt
*.der
*.p12
*.pfx

# ===== MONITOREO Y PROFILING =====
.profiling/
*.prof
*.lprof
*.pyprof

# ============================================================================
# IMPORTANTE: 
# - .env contiene credenciales sensibles (DB, AWS, PayPal)
# - media/ contiene archivos de usuarios (subir a S3 en producción)
# - node_modules/ y __pycache__/ son regenerables
# ============================================================================

# ===== MANTENER EN GIT (! para no ignorar) =====
!.gitkeep
!.env.example
!README.md
!requirements.txt
!Dockerfile
!docker-compose.yml
```

---

## 4. PLAN DE ACCIÓN RECOMENDADO

### 4.1 Limpieza Inmediata (Urgente)

#### **Paso 1: Eliminar Archivos Temporales**

```powershell
# Eliminar todos los __pycache__
Get-ChildItem -Path . -Recurse -Force -Include __pycache__ | Remove-Item -Recurse -Force

# Eliminar archivos .pyc
Get-ChildItem -Path . -Recurse -Force -Include *.pyc,*.pyo | Remove-Item -Force

# Eliminar SQLite (ya usando PostgreSQL)
Remove-Item -Path "db.sqlite3" -Force

# Eliminar carpetas de respaldo vacías
Remove-Item -Path "backup_sqlite" -Recurse -Force -ErrorAction SilentlyContinue

# Limpiar build de React
Remove-Item -Path "frontend\build" -Recurse -Force -ErrorAction SilentlyContinue
```

#### **Paso 2: Mover Scripts Temporales a Carpeta `scripts/`**

```powershell
New-Item -ItemType Directory -Path "scripts" -Force
Move-Item -Path "clean_postgres.py" -Destination "scripts/"
Move-Item -Path "create_postgres_db.py" -Destination "scripts/"
Move-Item -Path "import_final.py" -Destination "scripts/"
Move-Item -Path "set_vip.py" -Destination "scripts/"
Move-Item -Path "iniciar_sistema_completo.bat" -Destination "scripts/"

# Actualizar .gitignore
Add-Content -Path ".gitignore" -Value "`nscripts/"
```

#### **Paso 3: Actualizar .gitignore**

```powershell
# Reemplazar .gitignore con la versión mejorada
# (Ver sección 3.4 arriba)
```

### 4.2 Correcciones de Seguridad (Crítico)

#### **A) Configuración de SECRET_KEY**

**Archivo: `survey_project/settings.py`**
```python
# ❌ ANTES (INSEGURO)
SECRET_KEY = 'tu-secret-key'

# ✅ DESPUÉS (SEGURO)
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY no está configurada en .env")
```

**Generar nueva SECRET_KEY:**
```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
# Copiar el resultado a .env como DJANGO_SECRET_KEY=
```

#### **B) Configuración de DEBUG y ALLOWED_HOSTS**

```python
# ✅ CONFIGURACIÓN SEGURA
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
]

# En producción, agregar desde .env
if os.getenv('ENVIRONMENT') == 'production':
    ALLOWED_HOSTS.extend([
        os.getenv('DOMAIN_NAME', 'cuestom.com'),
        f'*.{os.getenv("DOMAIN_NAME", "cuestom.com")}',
        os.getenv('ALB_DNS_NAME', ''),  # AWS ALB
    ])
```

#### **C) Validación de Archivos Subidos**

**Archivo: `surveys/models/subscription.py`**
```python
from django.core.validators import FileExtensionValidator

class Subscription(models.Model):
    payment_proof = models.FileField(
        upload_to='vouchers/',
        null=True,
        blank=True,
        validators=[
            FileExtensionValidator(
                allowed_extensions=['jpg', 'jpeg', 'png', 'pdf'],
                message='Solo se permiten imágenes (JPG, PNG) o PDF'
            )
        ],
        help_text='Comprobante de pago (máx 5MB)'
    )
    
    def clean(self):
        super().clean()
        if self.payment_proof:
            # Validar tamaño (5MB máximo)
            if self.payment_proof.size > 5 * 1024 * 1024:
                raise ValidationError('El archivo no puede superar 5MB')
```

#### **D) Hardcoded URLs en Frontend**

**Archivo: `frontend/src/services/api.js`**
```javascript
// ❌ ANTES
const API_BASE_URL = 'http://localhost:8000/encuestas/api';

// ✅ DESPUÉS
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/encuestas/api';
```

**Archivo: `frontend/.env.production`**
```env
REACT_APP_API_URL=https://api.cuestom.com/encuestas/api
```

### 4.3 Optimizaciones de Performance

#### **A) Agregar Índices en Base de Datos**

**Archivo: `surveys/models/survey.py`**
```python
class Survey(models.Model):
    title = models.CharField(max_length=255, db_index=True)  # ✅ Índice para búsqueda
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # ✅ Índice para ORDER BY
    is_active = models.BooleanField(default=True, db_index=True)  # ✅ Índice para filtros
    views_count = models.IntegerField(default=0, db_index=True)  # ✅ Índice para ranking
    
    class Meta:
        indexes = [
            models.Index(fields=['-created_at', 'is_active']),  # Índice compuesto
            models.Index(fields=['-likes_count']),              # Para ranking de likes
        ]
```

**Generar migración:**
```powershell
python manage.py makemigrations --name add_performance_indexes
python manage.py migrate
```

#### **B) Implementar Paginación**

**Archivo: `surveys/views/api_views.py`**
```python
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(['GET'])
def api_surveys(request):
    surveys = Survey.objects.select_related('creator').prefetch_related(
        'liked_by', 'disliked_by'
    ).filter(is_active=True).order_by('-created_at')
    
    # Aplicar paginación
    paginator = StandardResultsSetPagination()
    result_page = paginator.paginate_queryset(surveys, request)
    
    # Serializar
    data = [{
        'id': survey.id,
        'title': survey.title,
        # ...
    } for survey in result_page]
    
    return paginator.get_paginated_response(data)
```

#### **C) Compresión de Imágenes**

**Instalar Pillow-SIMD (más rápido):**
```powershell
pip uninstall Pillow
pip install Pillow-SIMD
```

**Crear señal para comprimir imágenes:**
```python
# surveys/signals.py
from django.db.models.signals import pre_save
from django.dispatch import receiver
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile

@receiver(pre_save, sender=Survey)
def compress_survey_image(sender, instance, **kwargs):
    if instance.image and hasattr(instance.image, 'file'):
        img = Image.open(instance.image)
        
        # Redimensionar si es muy grande
        max_size = (1200, 1200)
        img.thumbnail(max_size, Image.LANCZOS)
        
        # Comprimir
        output = BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        output.seek(0)
        
        # Reemplazar archivo
        instance.image = InMemoryUploadedFile(
            output,
            'ImageField',
            f"{instance.image.name.split('.')[0]}.jpg",
            'image/jpeg',
            output.tell(),
            None
        )
```

### 4.4 Preparación para AWS

#### **Paso 1: Instalar Dependencias AWS**

```powershell
# Agregar a requirements.txt
echo "boto3==1.34.69" >> requirements.txt
echo "django-storages==1.14.2" >> requirements.txt
echo "django-ses==3.5.2" >> requirements.txt
echo "watchtower==3.0.1" >> requirements.txt
echo "python-json-logger==2.0.7" >> requirements.txt
echo "gunicorn==21.2.0" >> requirements.txt

# Instalar
pip install -r requirements.txt
```

#### **Paso 2: Crear Dockerfile**

(Ver sección 2.3.B arriba)

#### **Paso 3: Configurar AWS CLI**

```powershell
# Instalar AWS CLI
winget install Amazon.AWSCLI

# Configurar credenciales
aws configure
# AWS Access Key ID: [TU_ACCESS_KEY]
# AWS Secret Access Key: [TU_SECRET_KEY]
# Default region name: us-east-1
# Default output format: json
```

#### **Paso 4: Crear S3 Buckets**

```powershell
# Bucket para media files
aws s3 mb s3://cuestom-media --region us-east-1

# Bucket para frontend
aws s3 mb s3://cuestom-frontend --region us-east-1

# Configurar CORS en bucket de media
aws s3api put-bucket-cors --bucket cuestom-media --cors-configuration file://cors-config.json
```

**Archivo: `cors-config.json`**
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://cuestom.com", "http://localhost:3000"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

#### **Paso 5: Crear RDS PostgreSQL**

```powershell
# Crear base de datos
aws rds create-db-instance `
  --db-instance-identifier cuestom-postgres `
  --db-instance-class db.t3.micro `
  --engine postgres `
  --engine-version 16.1 `
  --master-username cuestom_admin `
  --master-user-password [GENERAR_PASSWORD_FUERTE] `
  --allocated-storage 20 `
  --max-allocated-storage 100 `
  --storage-encrypted `
  --multi-az `
  --backup-retention-period 7 `
  --vpc-security-group-ids sg-XXXXXXXXX

# Esperar a que esté disponible
aws rds wait db-instance-available --db-instance-identifier cuestom-postgres

# Obtener endpoint
aws rds describe-db-instances --db-instance-identifier cuestom-postgres --query 'DBInstances[0].Endpoint.Address' --output text
```

#### **Paso 6: Guardar Secretos en Secrets Manager**

```powershell
# Crear secreto para Django
aws secretsmanager create-secret `
  --name cuestom/django `
  --description "Credenciales de Django" `
  --secret-string '{
    "SECRET_KEY": "django-insecure-GENERAR_AQUI",
    "DB_PASSWORD": "PASSWORD_RDS",
    "EMAIL_HOST_PASSWORD": "PASSWORD_EMAIL",
    "PAYPAL_CLIENT_SECRET": "SECRET_PAYPAL"
  }'

# Crear secreto para base de datos
aws secretsmanager create-secret `
  --name cuestom/rds `
  --description "Credenciales de RDS PostgreSQL" `
  --secret-string '{
    "username": "cuestom_admin",
    "password": "PASSWORD_RDS",
    "engine": "postgres",
    "host": "cuestom-postgres.XXXXXXXXX.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "dbname": "cuestom_db"
  }'
```

#### **Paso 7: Deploy Frontend a S3 + CloudFront**

```powershell
# Build de producción
cd frontend
npm run build

# Subir a S3
aws s3 sync build/ s3://cuestom-frontend --delete

# Crear distribución CloudFront (opcional, via consola AWS o Terraform)
# ...

# Invalidar caché de CloudFront después de deploy
aws cloudfront create-invalidation --distribution-id E1XXXXXXXXXX --paths "/*"
```

#### **Paso 8: Deploy Backend (Opción ECS Fargate)**

```powershell
# Build y push de imagen Docker
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin XXXXXXXXXX.dkr.ecr.us-east-1.amazonaws.com
docker build -t cuestom-django .
docker tag cuestom-django:latest XXXXXXXXXX.dkr.ecr.us-east-1.amazonaws.com/cuestom-django:latest
docker push XXXXXXXXXX.dkr.ecr.us-east-1.amazonaws.com/cuestom-django:latest

# Crear cluster ECS (via consola o Terraform)
# Crear task definition
# Crear service con ALB
# ...
```

---

## 5. RESUMEN EJECUTIVO

### 📊 Estado Actual del Proyecto

| Aspecto | Estado | Prioridad de Acción |
|---------|--------|---------------------|
| **Arquitectura** | ✅ Excelente (Hexagonal + DDD) | Mantener |
| **Stack Tecnológico** | ✅ Moderno (Django 4.2, React 19) | Actualizar dependencias menores |
| **Seguridad** | ⚠️ Riesgos críticos (SECRET_KEY, DEBUG) | 🔴 URGENTE |
| **Performance** | ⚠️ N+1 queries, sin paginación | 🟡 Alta |
| **Limpieza de Código** | ❌ 880 directorios cache, dead code | 🟡 Alta |
| **Cloud Readiness** | ❌ No preparado para AWS | 🟢 Media |
| **Documentación** | ✅ Buena (README, comentarios) | Mantener |

### 🎯 Roadmap de Migración a AWS

#### **Fase 1: Preparación (1-2 semanas)**
1. ✅ Limpieza de archivos temporales
2. ✅ Correcciones de seguridad críticas
3. ✅ Implementar variables de entorno con AWS Secrets Manager
4. ✅ Crear Dockerfile y docker-compose
5. ✅ Configurar S3 para media files

#### **Fase 2: Infraestructura (2-3 semanas)**
1. ✅ Configurar RDS PostgreSQL Multi-AZ
2. ✅ Configurar ElastiCache Redis
3. ✅ Configurar S3 + CloudFront para frontend
4. ✅ Configurar SES para emails
5. ✅ Configurar VPC y Security Groups

#### **Fase 3: Deploy Backend (2-3 semanas)**
1. ✅ Opción A: Lambda + API Gateway
   - Crear Lambda Layers para Django
   - Configurar API Gateway HTTP API
   - Implementar Lambda Authorizer

2. ✅ Opción B: ECS Fargate (Recomendada)
   - Crear ECR repositories
   - Build y push de imágenes Docker
   - Configurar ECS Cluster y Services
   - Configurar Application Load Balancer

#### **Fase 4: Monitoring y Optimización (1-2 semanas)**
1. ✅ Configurar CloudWatch Logs y Metrics
2. ✅ Implementar X-Ray para tracing
3. ✅ Configurar alarmas críticas
4. ✅ Optimizar queries con índices
5. ✅ Implementar CDN caching strategies

#### **Fase 5: CI/CD y Automatización (1-2 semanas)**
1. ✅ GitHub Actions para CI/CD
2. ✅ Terraform para Infrastructure as Code
3. ✅ Automated testing pipeline
4. ✅ Blue-Green deployments

### 💰 Estimación de Costos AWS

#### **Escenario 1: Startup (tráfico bajo - 10K usuarios/mes)**
| Servicio | Costo Mensual |
|----------|---------------|
| ECS Fargate (2 tasks) | $40 |
| RDS t3.micro Multi-AZ | $30 |
| ElastiCache t3.micro | $15 |
| S3 (100 GB) | $3 |
| CloudFront (1 TB transfer) | $85 |
| SES (10K emails) | $1 |
| CloudWatch + X-Ray | $10 |
| **TOTAL** | **~$184/mes** |

#### **Escenario 2: Growth (tráfico medio - 100K usuarios/mes)**
| Servicio | Costo Mensual |
|----------|---------------|
| ECS Fargate (5 tasks) | $100 |
| RDS t3.small Multi-AZ | $60 |
| ElastiCache t3.small | $30 |
| S3 (500 GB) | $12 |
| CloudFront (5 TB transfer) | $425 |
| SES (100K emails) | $10 |
| CloudWatch + X-Ray | $30 |
| **TOTAL** | **~$667/mes** |

#### **Escenario 3: Scale (tráfico alto - 1M usuarios/mes)**
| Servicio | Costo Mensual |
|----------|---------------|
| ECS Fargate (10-20 tasks auto-scale) | $250 |
| RDS t3.large Multi-AZ + Read Replica | $300 |
| ElastiCache r6g.large | $150 |
| S3 (2 TB) | $50 |
| CloudFront (20 TB transfer) | $1,700 |
| SES (1M emails) | $100 |
| CloudWatch + X-Ray | $100 |
| **TOTAL** | **~$2,650/mes** |

### 🔑 Recomendaciones Finales

#### **Prioridad CRÍTICA (Hacer HOY):**
1. 🔴 Cambiar SECRET_KEY y moverla a .env
2. 🔴 Configurar DEBUG=False en producción
3. 🔴 Actualizar .gitignore y limpiar caché
4. 🔴 Implementar validación de archivos subidos

#### **Prioridad ALTA (Esta Semana):**
1. 🟠 Agregar índices a base de datos
2. 🟠 Implementar paginación en APIs
3. 🟠 Configurar ALLOWED_HOSTS correctamente
4. 🟠 Eliminar dead code (hexagonal comentado)

#### **Prioridad MEDIA (Este Mes):**
1. 🟡 Configurar AWS Secrets Manager
2. 🟡 Crear Dockerfile optimizado
3. 🟡 Implementar compresión de imágenes
4. 🟡 Configurar CloudWatch logging

#### **Prioridad BAJA (Próximo Sprint):**
1. 🟢 Optimizar bundle size de frontend
2. 🟢 Implementar Terraform para IaC
3. 🟢 Configurar CI/CD con GitHub Actions
4. 🟢 Agregar tests automatizados

---

## 📞 Contacto y Soporte

Para implementar estas recomendaciones, considera:

1. **Equipo requerido:**
   - 1 DevOps Engineer (AWS)
   - 1 Backend Developer (Django)
   - 1 Frontend Developer (React)
   - 1 QA Engineer

2. **Tiempo estimado:**
   - Limpieza y seguridad: 1 semana
   - Migración completa a AWS: 8-12 semanas
   - Optimización y monitoring: 2-3 semanas
   - **Total: 3-4 meses** para producción estable

3. **Presupuesto inicial AWS:**
   - Desarrollo/Staging: ~$200/mes
   - Producción: $184-$2,650/mes (según tráfico)
   - **Reserva recomendada:** $5,000 primer año

---

## ✅ Conclusión

El proyecto **Cuestom** tiene una arquitectura sólida con Hexagonal + DDD, pero requiere correcciones críticas de seguridad y limpieza antes de producción. La migración a AWS es viable y recomendada usando **ECS Fargate** para mejor control. Con las optimizaciones propuestas, el sistema puede escalar de 10K a 1M usuarios con ajustes incrementales de infraestructura.

**Próximo paso:** Implementar las correcciones de prioridad CRÍTICA y crear un entorno de staging en AWS para testing.

---

**Generado el:** 2026-09-27  
**Versión del análisis:** 1.0  
**Proyecto:** Cuestom Survey Platform  
**Analista:** Kiro AI
