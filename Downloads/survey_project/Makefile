# ============================================================================
# MAKEFILE - Comandos útiles para desarrollo y despliegue de Cuestom
# ============================================================================
# Uso: make <comando>
# Ver todos los comandos: make help

.PHONY: help install migrate test run docker-build docker-up docker-down clean

# Variables
PYTHON := python
PIP := pip
MANAGE := $(PYTHON) manage.py
DOCKER_COMPOSE := docker-compose

help: ## Mostrar ayuda de comandos disponibles
	@echo "╔═══════════════════════════════════════════════════════════════════╗"
	@echo "║         MAKEFILE - CUESTOM BACKEND                                ║"
	@echo "╚═══════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Comandos disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

install: ## Instalar dependencias de Python
	@echo "Instalando dependencias..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@echo "✓ Dependencias instaladas"

migrate: ## Ejecutar migraciones de base de datos
	@echo "Ejecutando migraciones..."
	$(PYTHON) migrate.py
	@echo "✓ Migraciones completadas"

migrate-make: ## Crear nuevas migraciones
	@echo "Generando migraciones..."
	$(MANAGE) makemigrations
	@echo "✓ Migraciones generadas"

migrate-apply: ## Aplicar migraciones pendientes
	@echo "Aplicando migraciones..."
	$(MANAGE) migrate
	@echo "✓ Migraciones aplicadas"

migrate-show: ## Mostrar migraciones aplicadas
	$(MANAGE) showmigrations

createsuperuser: ## Crear superusuario
	$(MANAGE) createsuperuser

shell: ## Abrir shell de Django
	$(MANAGE) shell

dbshell: ## Abrir shell de base de datos
	$(MANAGE) dbshell

collectstatic: ## Colectar archivos estáticos
	@echo "Colectando archivos estáticos..."
	$(MANAGE) collectstatic --noinput --clear
	@echo "✓ Estáticos colectados"

test: ## Ejecutar tests
	@echo "Ejecutando tests..."
	$(MANAGE) test
	@echo "✓ Tests completados"

run: ## Ejecutar servidor de desarrollo
	@echo "Iniciando servidor en http://localhost:8000"
	$(MANAGE) runserver

run-prod: ## Ejecutar con Gunicorn (simulando producción)
	@echo "Iniciando servidor con Gunicorn en http://localhost:8000"
	gunicorn survey_project.wsgi:application --bind 0.0.0.0:8000 --workers 4 --threads 2 --reload

check: ## Verificar configuración de Django
	$(MANAGE) check

check-deploy: ## Verificar configuración para despliegue
	$(MANAGE) check --deploy

# ============================================================================
# COMANDOS DOCKER
# ============================================================================

docker-build: ## Build de imagen Docker
	@echo "Building Docker image..."
	docker build -t cuestom-backend:latest .
	@echo "✓ Imagen construida"

docker-up: ## Iniciar servicios con Docker Compose
	@echo "Iniciando servicios..."
	$(DOCKER_COMPOSE) up -d
	@echo "✓ Servicios iniciados"
	@echo "Backend: http://localhost:8000"
	@echo "Ver logs: make docker-logs"

docker-down: ## Detener servicios de Docker Compose
	@echo "Deteniendo servicios..."
	$(DOCKER_COMPOSE) down
	@echo "✓ Servicios detenidos"

docker-restart: ## Reiniciar servicios de Docker Compose
	@echo "Reiniciando servicios..."
	$(DOCKER_COMPOSE) restart
	@echo "✓ Servicios reiniciados"

docker-logs: ## Ver logs de servicios Docker
	$(DOCKER_COMPOSE) logs -f

docker-ps: ## Ver estado de contenedores
	$(DOCKER_COMPOSE) ps

docker-exec: ## Ejecutar comando en contenedor web (uso: make docker-exec CMD="python manage.py shell")
	$(DOCKER_COMPOSE) exec web $(CMD)

docker-shell: ## Abrir shell en contenedor web
	$(DOCKER_COMPOSE) exec web sh

docker-db-shell: ## Abrir shell de PostgreSQL en contenedor
	$(DOCKER_COMPOSE) exec db psql -U postgres -d cuestom_db

docker-clean: ## Detener y eliminar volúmenes (¡CUIDADO! Borra la BD)
	@echo "⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de la base de datos"
	@read -p "¿Continuar? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	$(DOCKER_COMPOSE) down -v
	@echo "✓ Volúmenes eliminados"

# ============================================================================
# COMANDOS DE LIMPIEZA
# ============================================================================

clean: ## Limpiar archivos temporales
	@echo "Limpiando archivos temporales..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.log" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Limpieza completada"

clean-all: clean ## Limpieza profunda (incluye media y staticfiles)
	@echo "Limpieza profunda..."
	rm -rf staticfiles/
	rm -rf media/
	@echo "✓ Limpieza profunda completada"

# ============================================================================
# COMANDOS DE DESPLIEGUE AWS
# ============================================================================

aws-login: ## Login a AWS ECR
	@echo "Login a AWS ECR..."
	aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.us-east-1.amazonaws.com
	@echo "✓ Login exitoso"

aws-push: docker-build ## Build y push a AWS ECR
	@echo "Tagging imagen..."
	docker tag cuestom-backend:latest $(AWS_ACCOUNT_ID).dkr.ecr.us-east-1.amazonaws.com/cuestom-backend:latest
	@echo "Pushing a ECR..."
	docker push $(AWS_ACCOUNT_ID).dkr.ecr.us-east-1.amazonaws.com/cuestom-backend:latest
	@echo "✓ Imagen subida a ECR"

# ============================================================================
# COMANDOS DE UTILIDAD
# ============================================================================

requirements: ## Actualizar requirements.txt
	$(PIP) freeze > requirements.txt
	@echo "✓ requirements.txt actualizado"

format: ## Formatear código con black (si está instalado)
	@command -v black >/dev/null 2>&1 && black . || echo "⚠️  Black no instalado. Instalar con: pip install black"

lint: ## Ejecutar linter (si está instalado)
	@command -v flake8 >/dev/null 2>&1 && flake8 . || echo "⚠️  Flake8 no instalado. Instalar con: pip install flake8"

backup-db: ## Crear backup de base de datos
	@echo "Creando backup..."
	$(MANAGE) dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission --indent 2 > backup_$(shell date +%Y%m%d_%H%M%S).json
	@echo "✓ Backup creado"

load-fixtures: ## Cargar datos desde backup
	@echo "Cargando datos..."
	$(MANAGE) loaddata $(FIXTURE)
	@echo "✓ Datos cargados"

