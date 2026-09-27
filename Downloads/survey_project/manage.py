#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    # Ajusta este valor si tu proyecto se llama diferente
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "No se pudo importar Django. ¿Está instalado y tu entorno virtual activado?"
        ) from exc
    execute_from_command_line(sys.argv)
