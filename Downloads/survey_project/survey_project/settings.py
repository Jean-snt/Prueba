import os
import dj_database_url
from pathlib import Path
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# ============================================================================
# CONFIGURACIÓN DE SEGURIDAD
# ============================================================================

# ENVIRONMENT: development, staging, production
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# SECRET_KEY: CRÍTICO - NUNCA debe tener valor por defecto en producción
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if ENVIRONMENT == 'production':
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY must be set in production environment. "
            "Generate one with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
        )
    else:
        # Solo permitir fallback en desarrollo
        SECRET_KEY = 'django-insecure-LOCAL-DEV-ONLY-DO-NOT-USE-IN-PRODUCTION'
        print("⚠️  WARNING: Using default SECRET_KEY for development only!")

# DEBUG: Basado en ENVIRONMENT, NO en variable DEBUG
DEBUG = (ENVIRONMENT == 'development')

# Validación adicional: si DEBUG está explícitamente en False, respetarlo
if os.getenv('DEBUG', '').lower() == 'false':
    DEBUG = False

# ALLOWED_HOSTS: Configuración dinámica según entorno
if ENVIRONMENT == 'production':
    # En producción, ALLOWED_HOSTS debe venir obligatoriamente de variable de entorno
    allowed_hosts_str = os.getenv('ALLOWED_HOSTS', '')
    if not allowed_hosts_str:
        raise ImproperlyConfigured(
            "ALLOWED_HOSTS must be set in production environment. "
            "Example: ALLOWED_HOSTS=cuestom.com,www.cuestom.com,*.execute-api.us-east-1.amazonaws.com,*.awsapprunner.com"
        )
    
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(',') if host.strip()]
    
    # Agregar patrones comunes de AWS si no están
    aws_patterns = ['*.amazonaws.com', '*.awsapprunner.com', '*.cloudfront.net']
    for pattern in aws_patterns:
        if not any(pattern in host for host in ALLOWED_HOSTS):
            ALLOWED_HOSTS.append(pattern)
    
    # Configuraciones de seguridad ESTRICTAS para producción
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000  # 1 año
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # Para ALB/CloudFront
    
    print(f"✓ Producción: ALLOWED_HOSTS configurados: {len(ALLOWED_HOSTS)} hosts")
else:
    # Desarrollo: permitir localhost
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', '.ngrok.io']  # ngrok para testing
    print(f"⚠️  Desarrollo: ALLOWED_HOSTS abiertos para localhost")
# ============================================================================
# CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS Y MEDIA
# ============================================================================

ROOT_URLCONF = 'survey_project.urls'

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_DIRS = [
    BASE_DIR / "static",
]

# WhiteNoise para servir estáticos en producción
if ENVIRONMENT == 'production':
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# MEDIA FILES - S3 en producción, local en desarrollo
if ENVIRONMENT == 'production' and os.getenv('AWS_STORAGE_BUCKET_NAME'):
    # Usar S3 para archivos media en producción
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',  # 1 día
    }
    AWS_QUERYSTRING_AUTH = False  # No incluir firma en URLs públicas
    
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
    
    # Credenciales AWS (preferir IAM Roles en producción)
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID', None)
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', None)
    
    print(f"✓ Media files: AWS S3 bucket '{AWS_STORAGE_BUCKET_NAME}'")
else:
    # Usar sistema de archivos local
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'
    print(f"⚠️  Media files: Local storage at {MEDIA_ROOT}")

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',  # ← Django REST Framework
    'rest_framework.authtoken',  # ← Para autenticación por tokens
    'corsheaders',  # ← Agregado para CORS
    'django_countries',

    # Tu app local
    'surveys',
]

# Configuración de sesiones
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # True en producción con HTTPS
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# ============================================================================
# CONFIGURACIÓN DE CORS (Cross-Origin Resource Sharing)
# ============================================================================

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# Configuración dinámica según entorno
if ENVIRONMENT == 'production':
    # En producción, leer orígenes desde variables de entorno
    frontend_url = os.getenv('FRONTEND_URL', os.getenv('REACT_APP_API_URL', ''))
    
    if not frontend_url:
        print("⚠️  WARNING: FRONTEND_URL not configured, CORS may not work!")
        CORS_ALLOWED_ORIGINS = []
    else:
        CORS_ALLOWED_ORIGINS = [frontend_url]
        
        # Agregar variantes automáticamente
        if frontend_url.startswith('https://'):
            base_domain = frontend_url.replace('https://', '').replace('https://www.', '')
            CORS_ALLOWED_ORIGINS.extend([
                f'https://{base_domain}',
                f'https://www.{base_domain}',
            ])
        
        # Agregar CloudFront si existe
        cloudfront_url = os.getenv('CLOUDFRONT_URL', '')
        if cloudfront_url:
            CORS_ALLOWED_ORIGINS.append(cloudfront_url)
    
    print(f"✓ CORS configurado para: {CORS_ALLOWED_ORIGINS}")
else:
    # Desarrollo: localhost en diferentes puertos
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    print(f"⚠️  CORS desarrollo: {CORS_ALLOWED_ORIGINS}")

# Headers permitidos
CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Métodos HTTP permitidos
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# ✅ CSRF Trusted Origins - Configuración dinámica
if ENVIRONMENT == 'production':
    frontend_url = os.getenv('FRONTEND_URL', os.getenv('REACT_APP_API_URL', ''))
    backend_url = os.getenv('BACKEND_URL', '')
    
    CSRF_TRUSTED_ORIGINS = []
    
    if frontend_url:
        CSRF_TRUSTED_ORIGINS.append(frontend_url)
        # Agregar variantes
        if 'www.' not in frontend_url:
            CSRF_TRUSTED_ORIGINS.append(frontend_url.replace('https://', 'https://www.'))
    
    if backend_url:
        CSRF_TRUSTED_ORIGINS.append(backend_url)
    
    # Agregar CloudFront
    cloudfront_url = os.getenv('CLOUDFRONT_URL', '')
    if cloudfront_url:
        CSRF_TRUSTED_ORIGINS.append(cloudfront_url)
    
    if not CSRF_TRUSTED_ORIGINS:
        print("⚠️  WARNING: CSRF_TRUSTED_ORIGINS empty in production!")
    else:
        print(f"✓ CSRF trusted origins: {CSRF_TRUSTED_ORIGINS}")
else:
    # Desarrollo
    CSRF_TRUSTED_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Configuración de autenticación personalizada
AUTHENTICATION_BACKENDS = [
    'surveys.backends.EmailOrUsernameModelBackend',
    'django.contrib.auth.backends.ModelBackend',  # Mantener el backend por defecto como fallback
]

# ============================================================================
# CONFIGURACIÓN DE DJANGO REST FRAMEWORK
# ============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',  # Para el admin
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}

# ============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# ============================================================================

# Prioridad: DATABASE_URL > Variables individuales
DATABASE_URL = os.getenv('DATABASE_URL', None)

if DATABASE_URL:
    # Usar DATABASE_URL (preferido para AWS RDS y despliegues cloud)
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,  # Conexiones persistentes (10 min)
            ssl_require=True if ENVIRONMENT == 'production' else False
        )
    }
    
    # Configuración adicional para AWS RDS con SSL
    if ENVIRONMENT == 'production':
        DATABASES['default']['OPTIONS'] = {
            'sslmode': 'require',
            'connect_timeout': 10,
        }
    
    print(f"✓ Base de datos configurada desde DATABASE_URL")
else:
    # Fallback: configuración tradicional con variables individuales
    _db_password = os.getenv('DB_PASSWORD', '').strip()
    _db_host = os.getenv('DB_HOST', 'localhost')
    _db_port = os.getenv('DB_PORT', '5432')
    _db_name = os.getenv('DB_NAME', 'cuestom_db')
    _db_user = os.getenv('DB_USER', 'postgres')
    
    if not _db_password:
        raise ImproperlyConfigured(
            "DATABASE_URL or DB_PASSWORD not found in environment variables. "
            "Please ensure .env file exists with database configuration."
        )
    
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': _db_name,
            'USER': _db_user,
            'PASSWORD': _db_password,
            'HOST': _db_host,
            'PORT': _db_port,
            'OPTIONS': {
                'connect_timeout': 10,
                'sslmode': 'require' if ENVIRONMENT == 'production' else 'prefer',
            },
            'CONN_MAX_AGE': 600,  # Conexiones persistentes (10 min)
        }
    }
    
    print(f"✓ Base de datos configurada: {_db_user}@{_db_host}:{_db_port}/{_db_name}")
LOGIN_REDIRECT_URL = '/encuestas/'
LOGOUT_REDIRECT_URL = '/accounts/login'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ← CORS al principio de todo
    'surveys.middleware.CorsDebugMiddleware',  # ← DEBUG CORS: logging + OPTIONS handler
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',            # ← obligatorio
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',         # ← obligatorio
    'django.contrib.messages.middleware.MessageMiddleware',            # ← obligatorio
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',   # ← obligatorio
        'DIRS': [ BASE_DIR / 'templates' ],                            # opcional: carpeta global de plantillas
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ============================================================================
# CONFIGURACIÓN DE ZONA HORARIA
# ============================================================================

# Zona horaria del proyecto (Perú)
TIME_ZONE = 'America/Lima'

# Usar zonas horarias aware (con información de timezone)
USE_TZ = True

# Internacionalización
LANGUAGE_CODE = 'es-pe'
USE_I18N = True
USE_L10N = True

# ============================================================================
# CONFIGURACIÓN DE EMAIL
# ============================================================================

# Cargar variables de entorno para email
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

# Configuración SMTP para Gmail
EMAIL_USE_TLS = True  # ← CRÍTICO: TLS activado para Gmail
EMAIL_USE_SSL = False
EMAIL_TIMEOUT = 30

# Determinar backend según configuración
if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD and EMAIL_HOST_USER != 'tu-email@gmail.com':
    # Usar SMTP real si las credenciales están configuradas
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    print(f"[OK] EMAIL REAL CONFIGURADO: {EMAIL_HOST_USER}")
else:
    # Usar consola como fallback
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    print("⚠️  ADVERTENCIA: Usando backend de consola. Configura EMAIL_HOST_USER y EMAIL_HOST_PASSWORD en .env para envío real.")

# Email por defecto para envíos del sistema
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# ============================================================================
# CONFIGURACIÓN DE PAYPAL
# ============================================================================

# Configuración PayPal (Sandbox para desarrollo)
PAYPAL_CLIENT_ID = os.getenv('PAYPAL_CLIENT_ID', 'sandbox_client_id')
PAYPAL_CLIENT_SECRET = os.getenv('PAYPAL_CLIENT_SECRET', 'sandbox_client_secret')
PAYPAL_MODE = os.getenv('PAYPAL_MODE', 'sandbox')  # 'sandbox' o 'live'

# URLs de PayPal
if PAYPAL_MODE == 'sandbox':
    PAYPAL_API_BASE = 'https://api.sandbox.paypal.com'
else:
    PAYPAL_API_BASE = 'https://api.paypal.com'