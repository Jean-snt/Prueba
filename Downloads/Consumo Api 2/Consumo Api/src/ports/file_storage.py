from abc import ABC, abstractmethod
from typing import Protocol


class IFileStorage(ABC):
    @abstractmethod
    def get_file(self, file_path: str) -> str:
        """Devuelve la ruta completa al archivo solicitado."""
        raise NotImplementedError

    @abstractmethod
    def check_file_exists(self, file_path: str) -> bool:
        """Comprueba si el archivo existe en el almacenamiento."""
        raise NotImplementedError
from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable

class IFileStorageService(ABC):

    @abstractmethod
    def save_file(self, file_bytes: bytes, filename: str) -> str:
        """Guarda un archivo y devuelve la ruta/identificador."""
        raise NotImplementedError

    @abstractmethod
    def download_file(self, identifier: str) -> bytes:
        """Devuelve bytes del archivo dado su identificador."""
        raise NotImplementedError

    @abstractmethod
    def delete_file(self, identifier: str) -> bool:
        """Elimina el archivo y devuelve True si se eliminó."""
        raise NotImplementedError
