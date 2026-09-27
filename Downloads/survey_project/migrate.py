#!/usr/bin/env python
"""
Script de migración automatizada para Cuestom
Ejecuta migraciones de Django y carga datos iniciales si es necesario
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from django.core.management import call_command
from django.db import connection
from django.contrib.auth import get_user_model

def check_database_connection():
    """Verificar conexión a la base de datos"""
    print("=" * 70)
    print("VERIFICANDO CONEXIÓN A BASE DE DATOS...")
    print("=" * 70)
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            db_version = cursor.fetchone()
            print(f"✓ Conexión exitosa a PostgreSQL")
            print(f"  Versión: {db_version[0]}")
            return True
    except Exception as e:
        print(f"✗ Error de conexión: {e}")
        return False

def run_migrations():
    """Ejecutar migraciones de Django"""
    print("\n" + "=" * 70)
    print("EJECUTANDO MIGRACIONES...")
    print("=" * 70)
    
    try:
        # Hacer las migraciones
        print("\n1. Generando migraciones si es necesario...")
        call_command('makemigrations', '--noinput')
        
        # Aplicar migraciones
        print("\n2. Aplicando migraciones a la base de datos...")
        call_command('migrate', '--noinput')
        
        print("\n✓ Migraciones aplicadas exitosamente")
        return True
    except Exception as e:
        print(f"\n✗ Error en migraciones: {e}")
        return False

def create_superuser():
    """Crear superusuario si no existe"""
    print("\n" + "=" * 70)
    print("VERIFICANDO SUPERUSUARIO...")
    print("=" * 70)
    
    User = get_user_model()
    
    # Verificar si ya existe un superusuario
    if User.objects.filter(is_superuser=True).exists():
        print("✓ Ya existe al menos un superusuario")
        return True
    
    # Crear superusuario desde variables de entorno
    admin_username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
    admin_email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@cuestom.com')
    admin_password = os.getenv('DJANGO_SUPERUSER_PASSWORD')
    
    if not admin_password:
        print("⚠️  DJANGO_SUPERUSER_PASSWORD no está configurado")
        print("   Para crear superusuario automáticamente, configura:")
        print("   - DJANGO_SUPERUSER_USERNAME=admin")
        print("   - DJANGO_SUPERUSER_EMAIL=admin@cuestom.com")
        print("   - DJANGO_SUPERUSER_PASSWORD=tu-password-seguro")
        print("\n   O crea manualmente con: python manage.py createsuperuser")
        return False
    
    try:
        User.objects.create_superuser(
            username=admin_username,
            email=admin_email,
            password=admin_password
        )
        print(f"✓ Superusuario creado: {admin_username}")
        return True
    except Exception as e:
        print(f"✗ Error creando superusuario: {e}")
        return False

def collect_static():
    """Colectar archivos estáticos"""
    print("\n" + "=" * 70)
    print("COLECTANDO ARCHIVOS ESTÁTICOS...")
    print("=" * 70)
    
    try:
        call_command('collectstatic', '--noinput', '--clear')
        print("✓ Archivos estáticos colectados")
        return True
    except Exception as e:
        print(f"⚠️  Error colectando estáticos (puede ser normal): {e}")
        return True  # No es crítico

def show_database_info():
    """Mostrar información de la base de datos"""
    print("\n" + "=" * 70)
    print("INFORMACIÓN DE BASE DE DATOS")
    print("=" * 70)
    
    from django.conf import settings
    db_config = settings.DATABASES['default']
    
    # Ocultar password
    safe_config = db_config.copy()
    if 'PASSWORD' in safe_config:
        safe_config['PASSWORD'] = '***OCULTO***'
    
    for key, value in safe_config.items():
        if key != 'OPTIONS':
            print(f"  {key}: {value}")

def main():
    """Función principal"""
    print("\n")
    print("╔═══════════════════════════════════════════════════════════════════╗")
    print("║         SCRIPT DE MIGRACIÓN - CUESTOM BACKEND                    ║")
    print("╚═══════════════════════════════════════════════════════════════════╝")
    
    # 1. Verificar conexión
    if not check_database_connection():
        print("\n✗ Abortando: No se pudo conectar a la base de datos")
        sys.exit(1)
    
    # 2. Mostrar info de BD
    show_database_info()
    
    # 3. Ejecutar migraciones
    if not run_migrations():
        print("\n✗ Abortando: Error en migraciones")
        sys.exit(1)
    
    # 4. Crear superusuario (opcional)
    create_superuser()
    
    # 5. Colectar estáticos
    collect_static()
    
    # Resumen final
    print("\n" + "=" * 70)
    print("MIGRACIÓN COMPLETADA EXITOSAMENTE")
    print("=" * 70)
    print("\n✓ Base de datos lista para usar")
    print("✓ Migraciones aplicadas")
    print("✓ Sistema listo para producción")
    print("\nPróximos pasos:")
    print("  1. Ejecutar servidor: gunicorn survey_project.wsgi:application")
    print("  2. Acceder al admin: http://tu-dominio/admin/")
    print("  3. Verificar API: http://tu-dominio/encuestas/api/surveys/")
    print("\n")

if __name__ == '__main__':
    main()
