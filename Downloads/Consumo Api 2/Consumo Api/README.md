# Transcripciones API (Hexagonal + FastAPI)

Estructura base para una API de transcripciones usando Arquitectura Hexagonal.

Instrucciones rápidas (PowerShell):

1. Crear y activar venv:

```powershell
python -m venv .\venv
& .\venv\Scripts\Activate.ps1
```

2. Instalar dependencias:

```powershell
pip install -r requirements.txt
```

3. Ejecutar:

```powershell
uvicorn src.main:app --reload
```

Estructura creada por el script:

- `.gitignore`
- `requirements.txt`
- `README.md`
- `src/` con los módulos de dominio, puertos, aplicación y adaptadores.

Comandos para reproducir la estructura (ver sección final del README).