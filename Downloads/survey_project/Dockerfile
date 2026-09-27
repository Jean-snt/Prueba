# ============================================================================
# DOCKERFILE OPTIMIZADO PARA CUESTOM BACKEND (DJANGO)
# Multi-stage build para reducir tamaño final
# ============================================================================

# ===== STAGE 1: Builder =====
FROM python:3.12-slim as builder

LABEL maintainer="Cuestom Team <soporte@cuestom.com>"
LABEL description="Cuestom Survey Platform - Django Backend"

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar solo requirements.txt primero (para aprovechar caché de Docker)
COPY requirements.txt .

# Instalar dependencias de Python en directorio de usuario
RUN pip install --user --no-cache-dir -r requirements.txt

# ===== STAGE 2: Runtime =====
FROM python:3.12-slim

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    ENVIRONMENT=production \
    PATH=/root/.local/bin:$PATH

WORKDIR /app

# Instalar solo dependencias de runtime (sin compiladores)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias de Python instaladas desde builder
COPY --from=builder /root/.local /root/.local

# Copiar código de la aplicación
COPY . .

# Crear directorios necesarios
RUN mkdir -p static staticfiles media logs

# Crear usuario no-root para seguridad
RUN useradd -m -u 1000 django && \
    chown -R django:django /app

# Cambiar a usuario no-root
USER django

# Colectar archivos estáticos
RUN python manage.py collectstatic --noinput --clear || echo "No static files to collect"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:${PORT}/health/', timeout=3)" || exit 1

# Exponer puerto
EXPOSE ${PORT}

# Comando por defecto (puede ser sobrescrito por apprunner.yaml)
CMD gunicorn survey_project.wsgi:application \
    --bind 0.0.0.0:${PORT} \
    --workers 4 \
    --threads 2 \
    --worker-class sync \
    --worker-tmp-dir /dev/shm \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --log-level info \
    --access-logfile - \
    --error-logfile - \
    --log-file -
