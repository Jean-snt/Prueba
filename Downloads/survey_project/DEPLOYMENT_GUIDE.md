# 🚀 GUÍA DE DESPLIEGUE EN AWS - CUESTOM BACKEND

---

## 📋 ÍNDICE
1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de AWS RDS PostgreSQL](#configuración-de-aws-rds-postgresql)
3. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
4. [Despliegue con AWS App Runner](#despliegue-con-aws-app-runner)
5. [Despliegue con Docker + ECS](#despliegue-con-docker-ecs)
6. [Testing Local con Docker](#testing-local-con-docker)
7. [Troubleshooting](#troubleshooting)

---

## 1. REQUISITOS PREVIOS

### Software Necesario
- [x] Python 3.12+
- [x] Docker y Docker Compose
- [x] AWS CLI configurado
- [x] Git
- [x] PostgreSQL Client (psql)

### Instalación de AWS CLI
```bash
# Windows (PowerShell)
winget install Amazon.AWSCLI

# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Configurar AWS CLI
```bash
aws configure
# AWS Access Key ID: [TU_ACCESS_KEY]
# AWS Secret Access Key: [TU_SECRET_KEY]
# Default region name: us-east-1
# Default output format: json
```

---

## 2. CONFIGURACIÓN DE AWS RDS POSTGRESQL

### 2.1 Datos de Conexión Actuales

```
Endpoint: database-1.c41o6yqueege.us-east-1.rds.amazonaws.com
Puerto: 5432
Usuario: postgres
Base de Datos: postgres
```

### 2.2 Cadena de Conexión (DATABASE_URL)

```bash
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@database-1.c41o6yqueege.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require"
```

### 2.3 Verificar Conexión Desde Tu Máquina

```bash
# Instalar psql si no lo tienes
# Windows: https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt install postgresql-client

# Conectar a RDS
psql "postgresql://postgres:TU_CONTRASEÑA@database-1.c41o6yqueege.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require"

# Verificar tablas
\dt

# Salir
\q
```

### 2.4 Ejecutar Migraciones en RDS

```bash
# Configurar DATABASE_URL en .env
echo 'DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@database-1.c41o6yqueege.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require"' >> .env

# Ejecutar script de migración
python migrate.py

# O manualmente
python manage.py migrate
```

### 2.5 Configurar Security Group de RDS

**IMPORTANTE:** Asegúrate de que el Security Group de RDS permita conexiones:

1. Ve a AWS Console → RDS → Databases → database-1
2. Haz clic en el Security Group asociado
3. Agrega regla Inbound:
   - Type: PostgreSQL
   - Port: 5432
   - Source: 
     - Para testing local: Tu IP pública
     - Para App Runner: Security Group de App Runner
     - Para cualquier: 0.0.0.0/0 (NO recomendado en producción)

---

## 3. CONFIGURACIÓN DE VARIABLES DE ENTORNO

### 3.1 Variables Críticas para Producción

Crea un archivo `.env.production` con:

```bash
# ===== GENERAL =====
ENVIRONMENT=production
DEBUG=False
DJANGO_SECRET_KEY=django-insecure-GENERAR-NUEVA-CLAVE-AQUI
ALLOWED_HOSTS=tu-dominio.com,api.tu-dominio.com,*.execute-api.us-east-1.amazonaws.com

# ===== BASE DE DATOS (AWS RDS) =====
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@database-1.c41o6yqueege.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require

# ===== CORS Y CSRF =====
FRONTEND_URL=https://tu-dominio.com
BACKEND_URL=https://api.tu-dominio.com

# ===== EMAIL (USAR AWS SES EN PRODUCCIÓN) =====
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=soportecuestom@gmail.com
EMAIL_HOST_PASSWORD=tu-password-de-app

# ===== PAYPAL =====
PAYPAL_CLIENT_ID=tu-paypal-client-id-live
PAYPAL_CLIENT_SECRET=tu-paypal-client-secret-live
PAYPAL_MODE=live

# ===== AWS (OPCIONAL PARA S3) =====
AWS_STORAGE_BUCKET_NAME=cuestom-media
AWS_S3_REGION_NAME=us-east-1
```

### 3.2 Generar SECRET_KEY Nueva

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 4. DESPLIEGUE CON AWS APP RUNNER

### 4.1 Preparación

```bash
# 1. Verificar que todos los archivos estén listos
ls -la Dockerfile apprunner.yaml requirements.txt

# 2. Commit de cambios
git add .
git commit -m "feat: Configuración para AWS App Runner con RDS"
git push origin main
```

### 4.2 Crear Repositorio ECR (Opcional si usas GitHub)

```bash
# Crear repositorio
aws ecr create-repository --repository-name cuestom-backend --region us-east-1

# Login a ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin TU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build y push
docker build -t cuestom-backend:latest .
docker tag cuestom-backend:latest TU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cuestom-backend:latest
docker push TU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cuestom-backend:latest
```

### 4.3 Crear Servicio en App Runner (AWS Console)

1. Ve a AWS Console → App Runner → Create service

2. **Source:**
   - Source type: Source code repository (GitHub) o Container registry (ECR)
   - Repository: Jean-snt/Cuestom-

3. **Build:**
   - Runtime: Python 3.12
   - Build command: `pip install -r requirements.txt && python migrate.py`
   - Start command: `gunicorn survey_project.wsgi:application --bind 0.0.0.0:8000 --workers 4`

4. **Service settings:**
   - Service name: cuestom-backend
   - Port: 8000
   - CPU: 1 vCPU
   - Memory: 2 GB

5. **Environment variables:** (Agregar TODAS las variables de .env.production)
   ```
   DATABASE_URL=postgresql://...
   DJANGO_SECRET_KEY=...
   ALLOWED_HOSTS=...
   FRONTEND_URL=...
   ENVIRONMENT=production
   DEBUG=False
   ```

6. **Networking:**
   - Outgoing: Allow all outbound traffic
   - VPC connector: (Crear si RDS está en VPC privada)

7. **Health check:**
   - Path: `/health/`
   - Interval: 30s
   - Timeout: 5s
   - Healthy threshold: 2
   - Unhealthy threshold: 3

8. **Auto scaling:**
   - Min: 1
   - Max: 10
   - Target CPU: 70%

9. **Create & deploy**

### 4.4 Configurar VPC Connector (Si RDS está en VPC privada)

```bash
# Crear VPC connector
aws apprunner create-vpc-connector \
  --vpc-connector-name cuestom-vpc-connector \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-zzz \
  --region us-east-1

# Asociar con servicio App Runner (desde AWS Console)
```

### 4.5 Verificar Despliegue

```bash
# Obtener URL del servicio
aws apprunner list-services --region us-east-1

# Verificar health check
curl https://tu-servicio.us-east-1.awsapprunner.com/health/

# Ver logs
aws apprunner list-operations --service-arn <ARN> --region us-east-1
```

---

## 5. DESPLIEGUE CON DOCKER + ECS

### 5.1 Crear Cluster ECS

```bash
aws ecs create-cluster --cluster-name cuestom-cluster --region us-east-1
```

### 5.2 Crear Task Definition

Archivo: `ecs-task-definition.json`

```json
{
  "family": "cuestom-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::TU_ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "cuestom-backend",
      "image": "TU_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/cuestom-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "ENVIRONMENT", "value": "production"},
        {"name": "DEBUG", "value": "False"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:TU_ACCOUNT:secret:cuestom/database_url"
        },
        {
          "name": "DJANGO_SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:TU_ACCOUNT:secret:cuestom/django_secret_key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/cuestom-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health/ || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### 5.3 Registrar Task Definition

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

### 5.4 Crear Service con ALB

```bash
# Crear ALB primero (desde AWS Console o Terraform)

# Crear ECS Service
aws ecs create-service \
  --cluster cuestom-cluster \
  --service-name cuestom-backend-service \
  --task-definition cuestom-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-zzz],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=cuestom-backend,containerPort=8000"
```

---

## 6. TESTING LOCAL CON DOCKER

### 6.1 Testing Local con Docker Compose

```bash
# 1. Configurar DATABASE_URL local
echo 'DATABASE_URL=postgresql://postgres:027430snt@localhost:5432/cuestom_db' >> .env

# 2. Iniciar servicios
docker-compose up -d

# 3. Ver logs
docker-compose logs -f web

# 4. Verificar health check
curl http://localhost:8000/health/

# 5. Acceder al admin
# http://localhost:8000/admin/
```

### 6.2 Testing de Conexión a RDS Desde Docker

```bash
# Crear archivo .env.rds
cat > .env.rds << EOF
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@database-1.c41o6yqueege.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require
EOF

# Build y run con RDS
docker build -t cuestom-backend:rds-test .
docker run --rm \
  --env-file .env.rds \
  -e ENVIRONMENT=production \
  -e DEBUG=False \
  -p 8000:8000 \
  cuestom-backend:rds-test

# Verificar
curl http://localhost:8000/health/
```

---

## 7. TROUBLESHOOTING

### Error: "No se puede conectar a RDS"

**Solución 1: Verificar Security Group**
```bash
# Obtener tu IP pública
curl https://checkip.amazonaws.com

# Agregar tu IP al Security Group de RDS
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr $(curl -s https://checkip.amazonaws.com)/32
```

**Solución 2: Verificar PASSWORD**
```bash
# Intentar conexión manual
psql "postgresql://postgres:TU_PASSWORD@database-1.c41o6yqueege.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require"
```

### Error: "SSL connection required"

**Solución:** Agregar `?sslmode=require` al DATABASE_URL
```bash
DATABASE_URL="postgresql://...?sslmode=require"
```

### Error: "Health check failed"

**Solución:** Verificar que el endpoint `/health/` responde
```bash
# Test local
python manage.py runserver
curl http://localhost:8000/health/

# Test en contenedor
docker exec -it cuestom_backend curl http://localhost:8000/health/
```

### Error: "Migraciones no aplicadas"

**Solución:**
```bash
# Conectar a RDS
python migrate.py

# O manualmente
python manage.py migrate --settings=survey_project.settings
```

### Ver Logs en App Runner

```bash
aws apprunner list-operations \
  --service-arn arn:aws:apprunner:us-east-1:ACCOUNT_ID:service/cuestom-backend/xxx \
  --region us-east-1

# Desde CloudWatch
aws logs tail /aws/apprunner/cuestom-backend --follow
```

---

## 8. COMANDOS ÚTILES

### Makefile Commands

```bash
# Ver todos los comandos
make help

# Desarrollo local
make install          # Instalar dependencias
make migrate          # Ejecutar migraciones
make run              # Servidor de desarrollo
make run-prod         # Servidor con Gunicorn

# Docker
make docker-build     # Build imagen
make docker-up        # Iniciar servicios
make docker-logs      # Ver logs
make docker-down      # Detener servicios

# Limpieza
make clean            # Limpiar archivos temporales
make clean-all        # Limpieza profunda
```

### Docker Compose Commands

```bash
# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ejecutar comando en contenedor
docker-compose exec web python manage.py shell

# Detener
docker-compose down

# Rebuild
docker-compose up -d --build
```

---

## 9. CHECKLIST DE DESPLIEGUE

### Antes de Desplegar

- [ ] Variables de entorno configuradas en AWS
- [ ] SECRET_KEY nueva generada
- [ ] DEBUG=False en producción
- [ ] ALLOWED_HOSTS configurado correctamente
- [ ] DATABASE_URL apuntando a RDS con sslmode=require
- [ ] Security Group de RDS permite conexiones
- [ ] Migraciones ejecutadas en RDS
- [ ] Health check endpoint funciona
- [ ] CORS configurado para dominio de frontend
- [ ] CSRF_TRUSTED_ORIGINS configurado

### Después de Desplegar

- [ ] Verificar health check: `curl https://tu-dominio/health/`
- [ ] Verificar API: `curl https://tu-dominio/encuestas/api/surveys/`
- [ ] Acceder al admin: `https://tu-dominio/admin/`
- [ ] Verificar logs en CloudWatch
- [ ] Configurar alarmas de CloudWatch
- [ ] Configurar auto-scaling
- [ ] Habilitar backups automáticos de RDS
- [ ] Configurar dominio personalizado (Route 53)
- [ ] Configurar certificado SSL (ACM)

---

## 10. PRÓXIMOS PASOS

1. **Configurar CloudFront** para CDN del frontend
2. **Migrar archivos media a S3** para escalabilidad
3. **Configurar AWS SES** para emails en producción
4. **Implementar CI/CD** con GitHub Actions
5. **Configurar monitoring** con CloudWatch + X-Ray
6. **Habilitar WAF** para protección contra ataques
7. **Configurar auto-scaling** según tráfico
8. **Implementar caché** con ElastiCache Redis

---

**Última actualización:** 2026-09-27  
**Versión:** 1.0  
**Soporte:** soportecuestom@gmail.com
