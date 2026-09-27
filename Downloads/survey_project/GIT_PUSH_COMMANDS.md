# 🚀 COMANDOS GIT - PUSH FINAL A GITHUB

**Proyecto:** Cuestom Survey Platform  
**Repositorio:** https://github.com/Jean-snt/Cuestom-.git  
**Fecha:** Septiembre 27, 2026

---

## ✅ PRE-VERIFICACIÓN COMPLETADA

### Seguridad Verificada
- ✅ SECRET_KEY usa `os.getenv('DJANGO_SECRET_KEY')` - Sin hardcoding
- ✅ DB_PASSWORD usa `os.getenv('DB_PASSWORD')` - Sin hardcoding
- ✅ .env existe localmente pero está en .gitignore - NO se subirá
- ✅ .env.example creado como plantilla
- ✅ DEBUG configurado dinámicamente desde ENVIRONMENT
- ✅ ALLOWED_HOSTS dinámico desde env vars con patrones AWS
- ✅ CORS/CSRF configurados dinámicamente
- ✅ AWS S3 integrado para media files en producción
- ✅ Frontend usa process.env.REACT_APP_API_URL

---

## 📋 OPCIÓN 1: PRIMER PUSH (Repositorio Nuevo)

Si **NUNCA** has hecho push a este repositorio:

```bash
# 1. Inicializar Git en el proyecto
git init

# 2. Configurar usuario (si no está configurado globalmente)
git config user.name "Jean"
git config user.email "tu-email@ejemplo.com"

# 3. Agregar remote
git remote add origin https://github.com/Jean-snt/Cuestom-.git

# 4. Verificar que .env NO se agregue (debe estar en .gitignore)
git status

# 5. Agregar todos los archivos (excepto los del .gitignore)
git add .

# 6. Verificar archivos a commitear (NO debe aparecer .env)
git status

# 7. Crear commit con mensaje descriptivo
git commit -m "feat: Pre-deployment hardening - AWS integration, dynamic config, security improvements

- Hardened Django settings.py security (no hardcoded secrets)
- Added AWS S3 support for media files with django-storages + boto3
- Configured dynamic CORS/CSRF from environment variables
- Added Docker configuration (Dockerfile, docker-compose.yml, apprunner.yaml)
- Implemented health check endpoints (/health/, /readiness/, /liveness/)
- Added comprehensive deployment documentation
- Frontend configured to use REACT_APP_API_URL from environment
- Updated requirements.txt with production dependencies
- Created migration scripts and Makefile for deployment automation"

# 8. Crear y cambiar a branch main
git branch -M main

# 9. Push inicial a GitHub
git push -u origin main
```

---

## 📋 OPCIÓN 2: ACTUALIZACIÓN (Ya existe repositorio)

Si **YA HICISTE** push anteriormente y solo quieres actualizar:

```bash
# 1. Verificar estado del repositorio
git status

# 2. Verificar que .env NO aparezca en archivos a subir
git status | findstr ".env"

# 3. Agregar cambios
git add .

# 4. Ver resumen de archivos modificados
git status --short

# 5. Commit con los cambios de seguridad
git commit -m "security: Pre-deployment hardening and AWS integration

- Removed all hardcoded secrets from settings.py
- Added dynamic CORS/CSRF configuration from env vars
- Integrated AWS S3 for production media storage
- Added boto3 and django-storages to requirements.txt
- Updated frontend .gitignore to exclude all .env variants
- Created comprehensive pre-deployment checklist"

# 6. Push a main
git push origin main
```

---

## 📋 OPCIÓN 3: VERIFICACIÓN ANTES DE PUSH

Si quieres **REVISAR** antes de hacer push:

```bash
# 1. Ver archivos que se van a subir
git status

# 2. Ver diferencias específicas
git diff survey_project/settings.py
git diff requirements.txt
git diff frontend/.gitignore

# 3. Verificar que .env NO esté rastreado
git ls-files | findstr ".env"
# Debe mostrar SOLO .env.example y frontend\.env.example

# 4. Ver lista completa de archivos rastreados por Git
git ls-files

# 5. Ver archivos ignorados
git status --ignored
```

---

## ⚠️ VERIFICACIÓN CRÍTICA PRE-PUSH

**EJECUTAR ESTE COMANDO ANTES DE HACER GIT PUSH:**

```bash
# Verificar que .env NO esté en staging area
git status | Select-String -Pattern "\.env$"
```

**Resultado esperado:** 
- NO debe aparecer `.env` solo
- DEBE aparecer `.env.example` ✅
- DEBE aparecer `frontend\.env.example` ✅

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Si .env aparece en git status:

```bash
# Remover .env del staging area (NO lo borra del disco)
git reset HEAD .env

# Asegurar que está en .gitignore
echo ".env" >> .gitignore

# Verificar
git status
```

### Si ya commiteaste .env por error (NO has hecho push):

```bash
# Revertir el último commit (mantiene cambios)
git reset --soft HEAD~1

# Remover .env
git reset HEAD .env

# Re-commitear sin .env
git add .
git commit -m "security: Pre-deployment hardening (without .env)"
```

### Si ya hiciste push de .env (URGENTE):

```bash
# 1. Eliminar .env del historial
git rm --cached .env

# 2. Commit de eliminación
git commit -m "security: Remove .env from repository"

# 3. Force push (CUIDADO - solo si nadie más usa el repo)
git push origin main --force

# 4. Rotar TODAS las credenciales en .env inmediatamente:
# - Generar nuevo DJANGO_SECRET_KEY
# - Cambiar DB_PASSWORD en AWS RDS
# - Regenerar AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY
# - Regenerar PAYPAL_CLIENT_SECRET
```

---

## 📊 POST-PUSH: VERIFICACIÓN EN GITHUB

Después del push, verifica en https://github.com/Jean-snt/Cuestom-.git:

1. **Archivos que DEBEN estar:**
   - [ ] survey_project/settings.py ✅
   - [ ] .env.example ✅
   - [ ] frontend/.env.example ✅
   - [ ] requirements.txt (con boto3, django-storages) ✅
   - [ ] Dockerfile ✅
   - [ ] apprunner.yaml ✅
   - [ ] PRE_DEPLOYMENT_CHECKLIST.md ✅
   - [ ] DEPLOYMENT_GUIDE.md ✅

2. **Archivos que NO DEBEN estar:**
   - [ ] .env ❌ (CRÍTICO)
   - [ ] db.sqlite3 ❌
   - [ ] __pycache__/ ❌
   - [ ] venv/ ❌
   - [ ] node_modules/ ❌
   - [ ] frontend/build/ ❌

3. **Verificar contenido de settings.py en GitHub:**
   - Buscar "SECRET_KEY" - debe ser `os.getenv('DJANGO_SECRET_KEY')`
   - Buscar "PASSWORD" - debe ser `os.getenv('DB_PASSWORD')`
   - NO deben aparecer valores hardcodeados

---

## 🎯 COMANDO RÁPIDO RECOMENDADO

**Para un push limpio y seguro:**

```bash
# Todo en uno - Verificación + Push
git status; `
git add .; `
git status | Select-String "\.env$"; `
Write-Output "`n⚠️  Si aparece '.env' arriba, NO continuar`n"; `
git commit -m "security: Pre-deployment hardening and AWS integration"; `
git push origin main
```

---

## 📝 SIGUIENTE PASO DESPUÉS DEL PUSH

1. **Configurar GitHub Secrets** (para CI/CD si usas GitHub Actions):
   ```
   Settings → Secrets and variables → Actions → New repository secret
   ```
   
   Secrets a agregar:
   - `DJANGO_SECRET_KEY`
   - `DB_PASSWORD`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `PAYPAL_CLIENT_SECRET`

2. **Configurar AWS App Runner:**
   - Source: Conectar a GitHub repo
   - Branch: main
   - Build: Automatic
   - Environment variables: Configurar desde AWS Console

3. **Deploy Frontend:**
   - Build: `cd frontend && npm install && npm run build`
   - Deploy /build a S3 + CloudFront o AWS Amplify

---

## 📞 CONTACTO

**Desarrollador:** Jean  
**Repositorio:** https://github.com/Jean-snt/Cuestom-.git  
**AWS RDS:** database-1.c41o6yqueege.us-east-1.rds.amazonaws.com

---

**✅ TODO LISTO PARA PUSH A GITHUB - SEGURIDAD VERIFICADA**
