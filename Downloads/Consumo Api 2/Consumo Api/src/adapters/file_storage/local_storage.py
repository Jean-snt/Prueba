import os
from typing import Optional
from ports.file_storage import IFileStorage


class LocalFileStorage(IFileStorage):
    def __init__(self, base_path: Optional[str] = None):
        # base_path puede ser donde se almacenan los archivos; por defecto './storage'
        self.base_path = base_path or os.path.join(os.getcwd(), "storage")
        os.makedirs(self.base_path, exist_ok=True)

    def _full_path(self, file_path: str) -> str:
        if not file_path:
            return os.path.join(os.getcwd(), "dummy_file_for_download.txt")
        if os.path.isabs(file_path):
            return file_path
        return os.path.join(self.base_path, file_path)

    def get_file(self, file_path: str) -> str:
        """
        Devuelve la ruta real para la descarga. Si el archivo no existe,
        devuelve el archivo dummy en la raíz.
        """
        full = self._full_path(file_path)
        if os.path.exists(full):
            return full
        return os.path.join(os.getcwd(), "dummy_file_for_download.txt")

    def check_file_exists(self, file_path: str) -> bool:
        full = self._full_path(file_path)
        return os.path.exists(full)

    def create_dummy_file(self, file_path: str) -> None:
        """
        Crea un archivo de texto simple en `self.base_path` con el contenido
        de simulación. Si `file_path` es absoluto, lo crea en esa ruta.
        """
        full = self._full_path(file_path)

        # Si la ruta es la del dummy root y no se ha especificado file_path, crear dummy en cwd
        if not file_path:
            target = os.path.join(os.getcwd(), "dummy_file_for_download.txt")
        else:
            target = full

        parent = os.path.dirname(target)
        if parent:
            os.makedirs(parent, exist_ok=True)

        # Crear/reescribir archivo con contenido de simulación
        with open(target, "w", encoding="utf-8") as f:
            f.write("Simulación de archivo de transcripción.")
