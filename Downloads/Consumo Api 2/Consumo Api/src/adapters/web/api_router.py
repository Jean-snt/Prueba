# src/adapters/web/api_router.py

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from application.use_cases import TranscripcionService
from domain.entities import Transcripcion # Importación Absoluta/Simple
from adapters.web.dependencies import get_transcripcion_service # Importación absoluta
from fastapi.responses import FileResponse
from adapters.web.dependencies import get_file_storage

# --- Modelos Pydantic para la Respuesta ---
class TranscripcionResponse(BaseModel):
    id: int
    name: str
    file_size_kb: float
    file_type: str
    recorded_at: date

    @classmethod
    def from_entity(cls, entity: Transcripcion):
        """Convierte una entidad de dominio a un modelo Pydantic."""
        return cls(
            id=entity.id,
            name=entity.nombre_archivo,
            file_size_kb=entity.tamano_kb,
            file_type=entity.tipo_archivo,
            recorded_at=entity.fecha_creacion
        )


class TranscripcionCreate(BaseModel):
    name: str
    file_size_kb: float
    file_type: str
    recorded_at: date
    ruta_archivo: str

class TranscriptionsListResponse(BaseModel):
    results: List[TranscripcionResponse]
    limit: int
    offset: int
    total: int

# --- Router ---
router = APIRouter(tags=["Transcripciones"]) # Sin prefijo aquí

@router.get(
    "/transcriptions", 
    response_model=TranscriptionsListResponse
)
def list_transcriptions(
    service: TranscripcionService = Depends(get_transcripcion_service),
    query: Optional[str] = None,
    search_date: Optional[date] = Query(None, description="Fecha de grabación exacta (YYYY-MM-DD)"),
    limit: int = Query(25, ge=1, le=100, description="Número máximo de resultados a devolver"),
    offset: int = Query(0, ge=0, description="Número de registros a omitir (desplazamiento)"),
):
    # 1. Llamar al Caso de Uso (filtrar si se proporcionan parámetros)
    if query or search_date:
        transcripciones_domain, total = service.search_transcripciones(query=query, search_date=search_date, limit=limit, offset=offset)
    else:
        transcripciones_domain, total = service.get_all_transcripciones(limit=limit, offset=offset)

    # 2. Serializar y adaptar la respuesta al formato JSON
    results = [TranscripcionResponse.from_entity(t) for t in transcripciones_domain]

    return TranscriptionsListResponse(results=results, limit=limit, offset=offset, total=total)


@router.post(
    "/transcriptions",
    response_model=TranscripcionResponse,
    status_code=201,
)
def create_transcription(
    payload: TranscripcionCreate,
    service: TranscripcionService = Depends(get_transcripcion_service),
):
    """Crea una nueva transcripción en la base de datos."""
    # Mapear request -> entidad de dominio
    entity = Transcripcion(
        nombre_archivo=payload.name,
        tamano_kb=payload.file_size_kb,
        tipo_archivo=payload.file_type,
        fecha_creacion=payload.recorded_at,
        ruta_archivo=payload.ruta_archivo,
    )

    created = service.create_transcripcion(entity)
    return TranscripcionResponse.from_entity(created)


@router.get("/transcriptions/{transcripcion_id}/download")
def download_transcription(
    transcripcion_id: int,
    service: TranscripcionService = Depends(get_transcripcion_service),
):
    """Descarga el archivo asociado a la transcripción."""
    try:
        file_path, transcripcion = service.download_transcripcion(transcripcion_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Usar FileResponse para enviar el archivo. Nombre del fichero = nombre_archivo
    return FileResponse(path=file_path, filename=transcripcion.nombre_archivo)