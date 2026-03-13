from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Table
from sqlalchemy.orm import declarative_base, relationship
import os

# Conexión a la base de datos local
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'causas_judiciales.db')
engine = create_engine(f'sqlite:///{db_path}', echo=False)
Base = declarative_base()

# --- TABLA INTERMEDIA: CAUSAS - JUECES ---
# Perfecta para manejar el campo "gls_juez_ss" que trae múltiples jueces
causa_juez_asociacion = Table(
    'causa_juez', Base.metadata,
    Column('causa_id', Integer, ForeignKey('causas.id'), primary_key=True),
    Column('juez_id', Integer, ForeignKey('jueces.id'), primary_key=True)
)

# --- MODELOS ---
class Tribunal(Base):
    __tablename__ = 'tribunales'
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(150), unique=True, nullable=False) # Viene de: gls_juz_s
    
    causas = relationship("Causa", back_populates="tribunal")

class Juez(Base):
    __tablename__ = 'jueces'
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre_completo = Column(String(150), unique=True, nullable=False) # Viene de la lista: gls_juez_ss
    
    causas = relationship("Causa", secondary=causa_juez_asociacion, back_populates="causas")

class Causa(Base):
    __tablename__ = 'causas'
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Datos de identificación
    rit = Column(String(50), nullable=False, index=True)      # Viene de: rol_era_sup_s
    ruc = Column(String(50), index=True)                      # Viene de: sent__RUC_s
    caratulado = Column(String(255))                          # Viene de: caratulado_s
    
    # Fechas y Detalles
    fecha_sentencia = Column(String(50))                      # Viene de: fec_sentencia_sup_dt
    materia = Column(String(255))                             # Viene de: cod_materia_s (Lo uniremos con comas si hay varias)
    
    # Documentos
    url_sentencia = Column(String(500))                       # Viene de: url_acceso_sentencia
    texto_sentencia = Column(Text)                            # Viene de: texto_sentencia (Text soporta miles de caracteres)
    
    # Claves Foráneas
    tribunal_id = Column(Integer, ForeignKey('tribunales.id'), nullable=False)
    
    # Relaciones
    tribunal = relationship("Tribunal", back_populates="causas")
    jueces = relationship("Juez", secondary=causa_juez_asociacion, back_populates="causas")

# Creación física de las tablas
print("Reconstruyendo la base de datos con los nuevos campos descubiertos...")
# Precaución: drop_all borra la BD anterior. Como está vacía, no hay problema.
Base.metadata.drop_all(engine) 
Base.metadata.create_all(engine)
print("¡Base de datos 'causas_judiciales.db' actualizada y lista para el JSON real!")
