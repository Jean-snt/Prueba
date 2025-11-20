# src/application/use_cases.py
from typing import List, Optional, Tuple
from datetime import date
from ports.repository import ITranscripcionRepository
from ports.file_storage import IFileStorage
# from ports.file_storage import IFileStorageService # No lo usaremos en este ejemplo mínimo
from domain.entities import Transcripcion

class TranscripcionService:
    def __init__(self, repository: ITranscripcionRepository, file_storage: IFileStorage = None):
        # Inyectamos el repositorio y el servicio de almacenamiento
        self.repository = repository
        self.file_storage = file_storage

    def get_all_transcripciones(self, limit: int = 25, offset: int = 0) -> Tuple[List[Transcripcion], int]:
        """Caso de Uso: Recupera la lista completa con paginación. Retorna (lista, total)."""
        return self.repository.find_all(limit=limit, offset=offset)

    def create_transcripcion(self, transcripcion: Transcripcion) -> Transcripcion:
        """Crea una nueva transcripción delegando al repositorio."""
        created = self.repository.save(transcripcion)

        # Crear el archivo dummy en el almacenamiento local si está disponible
        if not self.file_storage:
            raise RuntimeError("File storage no configurado en TranscripcionService")

        # `ruta_archivo` puede ser None; en ese caso `create_dummy_file` creará el dummy por defecto
        ruta = getattr(created, "ruta_archivo", None)
        self.file_storage.create_dummy_file(ruta)

        return created

    def download_transcripcion(self, transcripcion_id: int) -> Tuple[str, Transcripcion]:
        """Retorna la ruta del archivo y la entidad de la transcripción.

        Paso 1: obtener la transcripción por id desde el repositorio.
        Paso 2: si no existe, lanzar excepción.
        Paso 3: usar file_storage.get_file(ruta) para obtener la ruta real.
        """
        transcripcion = self.repository.find_by_id(transcripcion_id)
        from domain.exceptions import TranscripcionNotFound

        if not transcripcion:
            raise TranscripcionNotFound(f"Transcripcion {transcripcion_id} no encontrada")

        if not self.file_storage:
            raise RuntimeError("File storage no configurado en TranscripcionService")

        file_path = self.file_storage.get_file(transcripcion.ruta_archivo)
        return file_path, transcripcion

    def search_transcripciones(self, query: Optional[str], search_date: Optional[date], limit: int = 25, offset: int = 0) -> Tuple[List[Transcripcion], int]:
        """Busca transcripciones delegando al repositorio con paginación. Retorna (lista, total)."""
        return self.repository.search(query=query, search_date=search_date, limit=limit, offset=offset)