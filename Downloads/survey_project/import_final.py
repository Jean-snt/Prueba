import os
import django
from django.db import transaction

# Configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from django.contrib.auth.models import User
from django.db.models.signals import post_save

def run():
    try:
        # Intentamos importar el signal para desconectarlo
        from surveys.models.user_profile import save_user_profile
        post_save.disconnect(save_user_profile, sender=User)
        print("✅ Signals de perfil desconectados.")
    except Exception as e:
        print(f"⚠️ No se pudo desconectar el signal (tal vez no existe): {e}")

    print("🚀 Cargando usuarios en PostgreSQL...")
    resultado = os.system("python manage.py loaddata usuarios_solo.json")
    
    if resultado == 0:
        print("✅ ¡Éxito! Usuarios cargados correctamente.")
    else:
        print("❌ Hubo un error al cargar el archivo JSON.")

if __name__ == "__main__":
    run()