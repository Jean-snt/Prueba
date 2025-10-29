#!/bin/bash

# Script para iniciar el servicio de emails en desarrollo

echo "🚀 Iniciando Email Service..."

# Verificar que Python esté instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 no está instalado"
    exit 1
fi

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
echo "🔧 Activando entorno virtual..."
source venv/bin/activate

# Instalar dependencias
echo "📚 Instalando dependencias..."
pip install -r requirements.txt

# Crear directorios necesarios
echo "📁 Creando directorios necesarios..."
mkdir -p logs sent_emails staticfiles

# Ejecutar migraciones
echo "🗄️ Ejecutando migraciones..."
python manage.py migrate

# Crear superusuario si no existe
echo "👤 Creando superusuario..."
python manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@empresa.com', 'admin123')
    print('Superusuario creado: admin/admin123')
else:
    print('Superusuario ya existe')
"

# Iniciar servidor
echo "🌐 Iniciando servidor en puerto 8002..."
echo "📧 Email Service disponible en: http://localhost:8002"
echo "🏥 Health check disponible en: http://localhost:8002/healthz/"
echo "📊 Admin panel disponible en: http://localhost:8002/admin/"

python manage.py runserver 0.0.0.0:8002


