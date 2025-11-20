# src/config.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configuración de la URL de la base de datos (SQLite)
DATABASE_URL = "sqlite:///./transcripciones.db" 

# Crear el motor de la base de datos
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} 
    # check_same_thread es solo necesario para SQLite
)

# Sesión local de la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa para definir modelos
Base = declarative_base()

def get_db():
    """Generador para obtener la sesión de DB y cerrarla."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()