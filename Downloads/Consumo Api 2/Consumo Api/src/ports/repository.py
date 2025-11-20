# src/ports/repository.py
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from datetime import date
from domain.entities import Transcripcion


class ITranscripcionRepository(ABC):
    @abstractmethod
    def find_all(self, limit: int, offset: int) -> Tuple[List[Transcripcion], int]:
        """Devuelve transcripciones paginadas ordenadas por fecha descendente y el conteo total."""
        raise NotImplementedError

    @abstractmethod
    def search(self, query: Optional[str], search_date: Optional[date], limit: int, offset: int) -> Tuple[List[Transcripcion], int]:
        """Busca transcripciones por nombre (query) y/o por fecha exacta (search_date) con paginación.
        Retorna una tupla (result_list, total_count).
        """
        raise NotImplementedError

    @abstractmethod
    def find_by_id(self, transcripcion_id: int) -> Optional[Transcripcion]:
        """Devuelve una transcripción por su id o None si no existe."""
        raise NotImplementedError

    # ... otros métodos ...