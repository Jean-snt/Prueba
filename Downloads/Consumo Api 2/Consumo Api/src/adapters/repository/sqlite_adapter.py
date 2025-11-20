# src/adapters/repository/sqlite_adapter.py

from typing import List, Optional, Tuple
from sqlalchemy import Column, Integer, String, Float, Date, func
from sqlalchemy.orm import Session
from ports.repository import ITranscripcionRepository
from domain.entities import Transcripcion
from config import Base  # Usar import absoluto (se asumirá `src` en sys.path)
from datetime import date

# --- 2.1. Modelo ORM de SQLAlchemy (Base de Datos) ---
class TranscripcionDB(Base):
    __tablename__ = "transcripciones"

    id = Column(Integer, primary_key=True, index=True)
    nombre_archivo = Column(String, index=True)
    tamano_kb = Column(Float)
    tipo_archivo = Column(String)
    fecha_creacion = Column(Date, index=True)
    ruta_archivo = Column(String, nullable=True)

    # Método de clase para convertir ORM -> Dominio (Mapeo)
    def to_entity(self) -> Transcripcion:
        return Transcripcion(
            id=self.id,
            nombre_archivo=self.nombre_archivo,
            tamano_kb=self.tamano_kb,
            tipo_archivo=self.tipo_archivo,
            fecha_creacion=self.fecha_creacion,
            ruta_archivo=self.ruta_archivo
        )


# --- 2.2. Adaptador de Repositorio REAL ---
class SQLiteTranscripcionRepository(ITranscripcionRepository):
    def __init__(self, db: Session):
        self.db = db

    def find_all(self, limit: int, offset: int) -> Tuple[List[Transcripcion], int]:
        """Devuelve transcripciones paginadas ordenadas por fecha descendente y el conteo total."""
        # total count (sin limit/offset)
        total_count = self.db.query(func.count(TranscripcionDB.id)).scalar() or 0

        q = self.db.query(TranscripcionDB).order_by(TranscripcionDB.fecha_creacion.desc()).offset(offset).limit(limit)
        db_results = q.all()
        return [db_item.to_entity() for db_item in db_results], int(total_count)

    def search(self, query: Optional[str], search_date: Optional[date], limit: int, offset: int) -> Tuple[List[Transcripcion], int]:
        """Construye una consulta dinámica según parámetros opcionales y devuelve entidades paginadas y el conteo total."""
        base_q = self.db.query(TranscripcionDB)

        if query:
            pattern = f"%{query}%"
            base_q = base_q.filter(TranscripcionDB.nombre_archivo.ilike(pattern))

        if search_date:
            base_q = base_q.filter(TranscripcionDB.fecha_creacion == search_date)

        # total count for the filtered query
        total_count = base_q.with_entities(func.count(TranscripcionDB.id)).scalar() or 0

        q = base_q.order_by(TranscripcionDB.fecha_creacion.desc()).offset(offset).limit(limit)
        db_results = q.all()
        return [db_item.to_entity() for db_item in db_results], int(total_count)

    def find_by_id(self, transcripcion_id: int) -> Optional[Transcripcion]:
        db_item = self.db.query(TranscripcionDB).filter(TranscripcionDB.id == transcripcion_id).first()
        if not db_item:
            return None
        return db_item.to_entity()

    def search_by_name_and_date(self, query: str, date_str: str) -> List[Transcripcion]:
        # Implementación pendiente...
        pass

    def save(self, transcripcion: Transcripcion) -> Transcripcion:
        # Convertir entidad de dominio a ORM
        db_transcripcion = TranscripcionDB(
            nombre_archivo=transcripcion.nombre_archivo,
            tamano_kb=transcripcion.tamano_kb,
            tipo_archivo=transcripcion.tipo_archivo,
            fecha_creacion=transcripcion.fecha_creacion,
            ruta_archivo=getattr(transcripcion, 'ruta_archivo', None)
        )

        # Persistir
        self.db.add(db_transcripcion)
        self.db.commit()
        # Refrescar para obtener el id asignado por la BD
        self.db.refresh(db_transcripcion)

        # Devolver la entidad de dominio con el id asignado
        return db_transcripcion.to_entity()

    def delete(self, transcripcion_id: int) -> None:
        # Implementación pendiente...
        pass