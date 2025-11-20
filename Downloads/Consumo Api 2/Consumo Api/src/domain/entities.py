# src/domain/entities.py
from datetime import date
from typing import Optional

class Transcripcion:
    def __init__(
        self,
        nombre_archivo: str,
        tamano_kb: float,
        tipo_archivo: str,
        fecha_creacion: date,
        id: Optional[int] = None,
        ruta_archivo: Optional[str] = None
    ):
        self.id = id
        self.nombre_archivo = nombre_archivo
        self.tamano_kb = tamano_kb
        self.tipo_archivo = tipo_archivo
        self.fecha_creacion = fecha_creacion
        self.ruta_archivo = ruta_archivo