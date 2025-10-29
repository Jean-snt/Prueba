@echo off
REM Script para iniciar el servicio de emails en desarrollo (Windows)

echo 🚀 Iniciando Email Service...

REM Verificar que Python esté instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python no está instalado
    pause
    exit /b 1
)

REM Crear entorno virtual si no existe
if not exist "venv" (
    echo 📦 Creando entorno virtual...
    python -m venv venv
)

REM Activar entorno virtual
echo 🔧 Activando entorno virtual...
call venv\Scripts\activate.bat

REM Instalar dependencias
echo 📚 Instalando dependencias...
pip install -r requirements.txt

REM Crear directorios necesarios
echo 📁 Creando directorios necesarios...
if not exist "logs" mkdir logs
if not exist "sent_emails" mkdir sent_emails
if not exist "staticfiles" mkdir staticfiles

REM Ejecutar migraciones
echo 🗄️ Ejecutando migraciones...
python manage.py migrate

REM Crear superusuario si no existe
echo 👤 Creando superusuario...
python manage.py shell -c "from django.contrib.auth.models import User; User.objects.get_or_create(username='admin', defaults={'email': 'admin@empresa.com', 'is_superuser': True, 'is_staff': True}); print('Superusuario: admin/admin123')"

REM Iniciar servidor
echo 🌐 Iniciando servidor en puerto 8002...
echo 📧 Email Service disponible en: http://localhost:8002
echo 🏥 Health check disponible en: http://localhost:8002/healthz/
echo 📊 Admin panel disponible en: http://localhost:8002/admin/

python manage.py runserver 0.0.0.0:8002


