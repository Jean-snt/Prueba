# ✅ CHECKLIST PRE-DESPLIEGUE - CUESTOM

**Fecha de revisión:** Septiembre 27, 2026  
**Proyecto:** Cuestom Survey Platform  
**Repositorio:** https://github.com/Jean-snt/Cuestom-.git  
**AWS RDS:** database-1.c41o6yqueege.us-east-1.rds.amazonaws.com:5432

---

## 🔒 1. SEGURIDAD Y CREDENCIALES

### Backend Django (survey_project/settings.py)

- [x] **SECRET_KEY:** Sin valor hardcodeado, lee de `DJANGO_SECRET_KEY` (obligatorio en producción)
- [x] **DEBUG:** Configurado como `DEBUG = (ENVIRONMENT == 'development')`
- [x] **ALLOWED_HOSTS:** Dinámico desde env var con patrones AWS (`*.amazonaws.com`, `*.awsapprunner.com`, `*.cloudfront.net`)
- [x] **DATABASE_URL:** Usa `dj-database-url` con soporte SSL (`sslmode=require` en producción)
- [x] **CORS_ALLOWED_ORIGINS:** Dinámico desde `FRONTEND_URL` y `REACT_APP_API_URL` con variantes www
- [x] **CSRF_TRUSTED_ORIGINS:** Dinámico desde `FRONTEND_URL`, `BACKEND_URL`, `CLOUDFRONT_URL`
- [x] **AWS S3:** Configurado con `django-storages` + `boto3` para archivos media en producción
- [x] **WhiteNoise:** Configurado para archivos estáticos con compresión
- [x] **Security Headers:** `SECURE_PROXY_SSL_HEADER` para ALB/CloudFront

### Frontend React

- [x] **API_BASE_URL:** Usa `process.env.REACT_APP_API_URL` exclusivamente (frontend/src/config.js)
- [x] **Sin URLs hardcodeadas:** Verificado en frontend/src/services/api.js
- [x] **.env.example:** Creado con ejemplos para dev/staging/prod

### Archivos Sensibles

- [x] **.env:** Existe con credenciales reales pero **NO rastreado por Git** (en .gitignore)
- [x] **.env.example:** Existe como plantilla sin valores sensibles
- [x] **.gitignore root:** Completo (excluye .env, __pycache__, venv/, db.sqlite3, media/, staticfiles/)
- [x] **.gitignore frontend:** Actualizado (excluye .env*, node_modules/, build/)

---

## 📦 2. DEPENDENCIAS Y CONFIGURACIÓN

### Backend

- [x] **requirements.txt:** Actualizado con:
  - `boto3==1.34.69` (AWS S3)
  - `django-storages==1.14.2` (S3 integration)
  - `gunicorn` (WSGI server)
  - `whitenoise` (static files)
  - `dj-database-url` (database URL parsing)
  - `psycopg2-binary` (PostgreSQL adapter)

### Frontend

- [x] **package.json:** Dependencias de producción correctamente definidas
- [x] **Build script:** `npm run build` genera /build optimizado

---

## 🐳 3. DOCKER Y DEPLOYMENT

- [x] **Dockerfile:** Multi-stage optimizado (build + runtime)
- [x] **docker-compose.yml:** PostgreSQL local para desarrollo
- [x] **.dockerignore:** Completo (excluye __pycache__, .env, venv/, node_modules/)
- [x] **apprunner.yaml:** Configurado para AWS App Runner
- [x] **Procfile:** Define web server (gunicorn)
- [x] **nginx.conf:** Configuración para proxy reverso
- [x] **Makefile:** 45+ comandos para build, deploy, testing

---

## 🗃️ 4. BASE DE DATOS

- [x] **Migraciones:** Script `migrate.py` automatiza migraciones en despliegue
- [x] **PostgreSQL SSL:** Configurado con `sslmode=require` cuando ENVIRONMENT != development
- [x] **RDS Endpoint:** Configurado desde `DATABASE_URL` o vars individuales
- [x] **Backup local:** `data_backup_total.json` existe para migración

---

## 🔍 5. HEALTH CHECKS Y MONITORING

- [x] **Health endpoint:** `/health/` implementado (surveys/views/health_views.py)
- [x] **Readiness endpoint:** `/readiness/` implementado
- [x] **Liveness endpoint:** `/liveness/` implementado
- [x] **URLs registradas:** survey_project/urls.py incluye rutas de health

---

## 📁 6. ARCHIVOS NO RASTREADOS (VERIFICAR ANTES DE COMMIT)

### ⚠️ NO deben estar en Git:
```
✓ .env                          # Credenciales reales
✓ __pycache__/                  # Bytecode compilado
✓ *.pyc, *.pyo                  # Archivos Python compilados
✓ db.sqlite3                    # Base de datos local
✓ venv/, env/                   # Entornos virtuales
✓ node_modules/                 # Dependencias Node.js
✓ frontend/build/               # Build de producción
✓ media/                        # Archivos subidos por usuarios
✓ staticfiles/                  # Archivos estáticos recolectados
✓ *.log                         # Logs
```

---

## 🚀 7. VARIABLES DE ENTORNO REQUERIDAS

### Para Producción (AWS)

**Backend (.env o AWS Secrets Manager):**
```bash
# Core
ENVIRONMENT=production
DJANGO_SECRET_KEY=<generar-con-django.core.management.utils.get_random_secret_key()>

# Database
DATABASE_URL=postgresql://usuario:password@database-1.c41o6yqueege.us-east-1.rds.amazonaws.com:5432/cuestom_db

# Hosts permitidos
ALLOWED_HOSTS=*.amazonaws.com,*.awsapprunner.com,*.cloudfront.net,tudominio.com

# CORS/CSRF
FRONTEND_URL=https://tudominio.com
BACKEND_URL=https://api.tudominio.com
CLOUDFRONT_URL=https://dxxxxx.cloudfront.net

# AWS S3 (media files)
AWS_STORAGE_BUCKET_NAME=cuestom-media
AWS_S3_REGION_NAME=us-east-1
AWS_ACCESS_KEY_ID=AKIAxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxx

# Email (opcional si usa SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password

# PayPal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_MODE=live
```

**Frontend (.env para build):**
```bash
REACT_APP_API_URL=https://api.tudominio.com/encuestas/api
```

### Para Desarrollo Local

**Backend (.env):**
```bash
ENVIRONMENT=development
DJANGO_SECRET_KEY=dev-secret-key-insecure
DATABASE_URL=postgresql://usuario:password@localhost:5432/cuestom_db
ALLOWED_HOSTS=localhost,127.0.0.1
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env):**
```bash
REACT_APP_API_URL=http://127.0.0.1:8000/encuestas/api
```

---

## ✅ 8. PASOS PRE-COMMIT

Ejecutar estos comandos **ANTES** de hacer commit:

```bash
# 1. Verificar que .env NO esté rastreado
git status | findstr /C:".env"
# Debe devolver vacío o solo .env.example

# 2. Verificar archivos a commitear
git status --short

# 3. Verificar que no haya credenciales hardcodeadas
findstr /S /I "secret" survey_project\settings.py
findstr /S /I "password" survey_project\settings.py
# Solo deben aparecer referencias a os.getenv()

# 4. Verificar frontend usa env vars
findstr /S "REACT_APP_API_URL" frontend\src\config.js
# Debe usar process.env.REACT_APP_API_URL

# 5. Eliminar __pycache__ huérfanos
Get-ChildItem -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
```

---

## 📝 9. COMANDOS GIT PARA COMMIT FINAL

```bash
# Inicializar repositorio si no existe
git init

# Agregar remote
git remote add origin https://github.com/Jean-snt/Cuestom-.git

# Verificar remote
git remote -v

# Agregar archivos (EXCLUYE .env automáticamente por .gitignore)
git add .

# Commit con mensaje descriptivo
git commit -m "Pre-deployment: Hardened security settings, AWS S3 integration, dynamic CORS/CSRF"

# Push a main
git branch -M main
git push -u origin main
```

---

## 🔄 10. VERIFICACIÓN POST-PUSH

Después del push a GitHub, verificar:

1. **GitHub repo:** https://github.com/Jean-snt/Cuestom-.git
   - [ ] .env NO debe aparecer en archivos
   - [ ] .env.example SÍ debe estar presente
   - [ ] requirements.txt incluye boto3 y django-storages
   - [ ] settings.py no tiene SECRET_KEY hardcodeado

2. **AWS App Runner deployment:**
   - [ ] Configurar variables de entorno en AWS Console
   - [ ] Deploy desde GitHub repo
   - [ ] Verificar health endpoint: `https://<app-url>/health/`
   - [ ] Verificar readiness: `https://<app-url>/readiness/`

3. **Frontend deployment:**
   - [ ] Build con `npm run build` (con REACT_APP_API_URL correcto)
   - [ ] Deploy /build a S3 + CloudFront o Amplify
   - [ ] Verificar API calls usan URL de producción

---

## 🎯 11. ARQUITECTURA Y ENDPOINTS

### Backend - 50+ REST Endpoints

- **Autenticación:** `/encuestas/api/auth/` (login, register, logout, refresh)
- **Usuarios:** `/encuestas/api/users/` (CRUD, profile, subscription)
- **Encuestas:** `/encuestas/api/surveys/` (CRUD, list, detail)
- **Respuestas:** `/encuestas/api/responses/` (submit, analytics)
- **Suscripciones VIP:** `/encuestas/api/subscriptions/` (PayPal integration)
- **Admin:** `/encuestas/api/admin/subscriptions/` (gestión)
- **Comentarios:** `/encuestas/api/comments/` (CRUD por encuesta)
- **Health:** `/health/`, `/readiness/`, `/liveness/`

### Arquitectura

- **Hexagonal/Clean Architecture** (DDD)
- **Domain:** Entidades, Value Objects, Services
- **Application:** Use Cases, DTOs, Interfaces
- **Infrastructure:** Repositorios (ORM), Adaptadores

---

## 📚 12. DOCUMENTACIÓN GENERADA

Archivos de documentación incluidos en el proyecto:

- [x] `DEPLOYMENT_GUIDE.md` - Guía completa de despliegue AWS
- [x] `README_NEW.md` - README actualizado con arquitectura
- [x] `CHANGES_SUMMARY.md` - Resumen de cambios aplicados
- [x] `GIT_COMMANDS.txt` - Comandos Git para push
- [x] `PRE_DEPLOYMENT_CHECKLIST.md` - Este documento
- [x] `CORRECCIONES_CRITICAS_APLICADAS.md` - Correcciones previas

---

## ⚡ 13. COMANDO RÁPIDO - PUSH A GITHUB

```bash
# Si el repo YA está inicializado:
git add .
git commit -m "Pre-deployment: Security hardening, AWS integration, dynamic config"
git push origin main

# Si es PRIMERA VEZ:
git init
git add .
git commit -m "Initial commit: Cuestom survey platform with AWS deployment config"
git branch -M main
git remote add origin https://github.com/Jean-snt/Cuestom-.git
git push -u origin main
```

---

## 🛡️ 14. SECURITY BEST PRACTICES APLICADAS

✅ **Implementado:**
- No hardcoded secrets en código
- DEBUG=False en producción automático
- SECRET_KEY obligatorio desde env en producción
- ALLOWED_HOSTS dinámico con validación
- CORS/CSRF dinámicos desde env vars
- SSL/HTTPS forzado en producción (SECURE_PROXY_SSL_HEADER)
- Media files en S3 (no en filesystem del servidor)
- Static files con WhiteNoise + compresión
- .env excluido de Git
- PostgreSQL con SSL en producción
- Health checks para monitoring

---

## 📞 CONTACTO Y SOPORTE

**Desarrollador:** Jean  
**GitHub:** https://github.com/Jean-snt  
**Proyecto:** Cuestom Survey Platform  
**AWS Region:** us-east-1  

---

**Estado del Checklist:** ✅ COMPLETADO - LISTO PARA PUSH A GITHUB

**Próximo paso:** Ejecutar comandos Git para push inicial al repositorio.
