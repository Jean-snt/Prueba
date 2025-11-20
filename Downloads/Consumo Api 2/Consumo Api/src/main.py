# src/main.py

import os
import sys

# Garantizar que el directorio `src` esté en sys.path para permitir imports absolutos
src_dir = os.path.abspath(os.path.dirname(__file__))
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from fastapi import FastAPI
from adapters.web.api_router import router as transcripcion_router
from config import Base, engine  # Import absoluto ahora que `src` está en sys.path
from sqlalchemy.orm import Session
from adapters.repository.sqlite_adapter import TranscripcionDB

# --- Inicialización de la Base de Datos ---
def create_db_tables():
    """Crea las tablas de la base de datos si no existen."""
    # Asegurar que el modelo esté importado para que Base lo conozca
    Base.metadata.create_all(bind=engine)

# Llamar a la función al inicio de la aplicación
create_db_tables()

app = FastAPI(title="API de Transcripciones Hexagonal")

# Incluir las rutas (Aplicando prefijo /api)
app.include_router(transcripcion_router, prefix="/api")

# Ruta base de prueba 
@app.get("/")
def read_root():
    return {"message": "API de Transcripciones en ejecución."}