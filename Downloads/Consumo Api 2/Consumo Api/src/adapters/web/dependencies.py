# src/adapters/web/dependencies.py

from fastapi import Depends
from sqlalchemy.orm import Session
from application.use_cases import TranscripcionService
from adapters.repository.sqlite_adapter import SQLiteTranscripcionRepository
from adapters.file_storage.local_storage import LocalFileStorage
from config import get_db  # Importar el generador de sesión (absoluto)


# Función que resuelve la dependencia del servicio y del almacenamiento
def get_file_storage() -> LocalFileStorage:
    # Instancia simple del adaptador de almacenamiento local
    return LocalFileStorage()


def get_transcripcion_service(db: Session = Depends(get_db)) -> TranscripcionService:
    # 1. Instanciar el Adaptador REAL (Inyectamos la sesión 'db' aquí)
    repo_adapter = SQLiteTranscripcionRepository(db=db)
    storage = get_file_storage()

    # 2. Instanciar el Caso de Uso e inyectar el Adaptador y el storage
    return TranscripcionService(repository=repo_adapter, file_storage=storage)