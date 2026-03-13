"""
scraper_masivo.py  — Version 3 (FINAL)

Hallazgo clave: La API usa multipart/form-data con:
  - _token      : token CSRF de Laravel (cambia por sesion)
  - id_buscador : 270  (buscador de Familia)
  - filtros     : JSON con los parametros de la busqueda
  - numero_filas_paginacion : cuantos resultados por pagina
  - offset_paginacion       : desde que registro empezar
  - orden       : "recientes"

Estrategia:
  1. Playwright carga la pagina para obtener el _token CSRF y cookies de sesion.
  2. Usamos requests con esas cookies+token para hacer las peticiones masivas.
     Esto es mas rapido que page.evaluate() y mas estable.
"""

import json
import time
import random
import re
import logging
import sys
from datetime import datetime

from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Table
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

import os

# ============================================================
# CONFIGURACION
# ============================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARCHIVO_BD = os.path.join(BASE_DIR, 'apps', 'nexo-backend', 'causas_judiciales.db')
URL_API              = "https://juris.pjud.cl/busqueda/buscar_sentencias"
URL_BASE             = "https://juris.pjud.cl/busqueda?Familia"
ID_BUSCADOR          = "270"           # Buscador de Familia (del debug)
REGISTROS_POR_PAGINA = 100
PAUSA_MIN            = 3
PAUSA_MAX            = 8
TOTAL_ESTIMADO       = 372502

FILTROS_BASE = {
    "rol": "", "era": "", "fec_desde": "", "fec_hasta": "",
    "tipo_norma": "", "num_norma": "", "num_art": "", "num_inciso": "",
    "todas": "", "algunas": "", "excluir": "", "literal": "",
    "proximidad": "", "distancia": "",
    "analisis_s": "11",
    "submaterias": "",
    "facetas_seleccionadas": [],
    "filtros_omnibox": [{"categoria": "TEXTO", "valores": [""]}],
    "ids_comunas_seleccionadas_mapa": []
}

# ============================================================
# MODELOS SQLAlchemy
# ============================================================
engine = create_engine(f'sqlite:///{ARCHIVO_BD}', echo=False)
Base   = declarative_base()

causa_juez_asociacion = Table(
    'causa_juez', Base.metadata,
    Column('causa_id', Integer, ForeignKey('causas.id'), primary_key=True),
    Column('juez_id',  Integer, ForeignKey('jueces.id'),  primary_key=True)
)

class Tribunal(Base):
    __tablename__ = 'tribunales'
    id     = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(150), unique=True, nullable=False)
    causas = relationship("Causa", back_populates="tribunal")

class Juez(Base):
    __tablename__ = 'jueces'
    id              = Column(Integer, primary_key=True, autoincrement=True)
    nombre_completo = Column(String(150), unique=True, nullable=False)
    causas = relationship("Causa", secondary=causa_juez_asociacion, back_populates="jueces")

class Causa(Base):
    __tablename__ = 'causas'
    id              = Column(Integer, primary_key=True, autoincrement=True)
    rit             = Column(String(50),  nullable=False, index=True)
    ruc             = Column(String(50),  index=True)
    caratulado      = Column(String(255))
    fecha_sentencia = Column(String(50))
    materia         = Column(String(255))
    url_sentencia   = Column(String(500))
    texto_sentencia = Column(Text)
    tribunal_id     = Column(Integer, ForeignKey('tribunales.id'), nullable=False)
    tribunal = relationship("Tribunal", back_populates="causas")
    jueces   = relationship("Juez", secondary=causa_juez_asociacion, back_populates="causas")

Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

# ============================================================
# LOGGING DUAL: consola + archivo scraper.log
# ============================================================

def configurar_logging():
    log_fmt = "%(asctime)s  %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=log_fmt,
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.FileHandler("scraper.log", encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ]
    )

def log(msg: str):
    """Registra en consola y en scraper.log simultaneamente."""
    logging.info(msg)

# ============================================================
# HELPERS DE BASE DE DATOS
# ============================================================

def limpiar_html(texto: str) -> str:
    if not texto:
        return ""
    texto = re.sub(r'<br\s*/?>', '\n', texto, flags=re.IGNORECASE)
    texto = re.sub(r'<[^>]+>', '', texto)
    return texto.strip()

def obtener_o_crear(session, modelo, campo, valor):
    obj = session.query(modelo).filter(getattr(modelo, campo) == valor).first()
    if not obj:
        obj = modelo(**{campo: valor})
        session.add(obj)
        session.flush()
    return obj

def causa_ya_existe(session, rit: str) -> bool:
    return session.query(Causa).filter(Causa.rit == rit).first() is not None

def detectar_offset_inicial() -> int:
    """
    Auto-reanudacion: calcula el offset de partida basandose en
    cuantas causas ya existen en la BD.  Si la BD tiene 15.400 causas,
    arranca en offset=15400 (con un margen de -200 para cubrir posibles
    duplicados del ultimo lote incompleto).
    """
    session = SessionLocal()
    total_en_bd = session.query(Causa).count()
    session.close()
    if total_en_bd == 0:
        return 0
    # Retroceder un lote para asegurar continuidad
    offset = max(0, total_en_bd - REGISTROS_POR_PAGINA)
    log(f"Auto-reanudacion detectada: {total_en_bd:,} causas en BD. Arrancando en offset={offset:,}")
    return offset

def insertar_causas(docs: list) -> int:
    session = SessionLocal()
    nuevas  = 0
    try:
        for doc in docs:
            rit = doc.get("rol_era_sup_s", "").strip()
            if not rit or causa_ya_existe(session, rit):
                continue

            nombre_tribunal = doc.get("gls_juz_s", "Desconocido").strip()
            tribunal        = obtener_o_crear(session, Tribunal, "nombre", nombre_tribunal)

            materias    = doc.get("cod_materia_s", [])
            materia_str = ", ".join(materias) if isinstance(materias, list) else str(materias)
            texto_raw   = doc.get("texto_sentencia") or doc.get("texto_setencia") or ""

            causa = Causa(
                rit             = rit,
                ruc             = doc.get("sent__RUC_s", ""),
                caratulado      = doc.get("caratulado_s", ""),
                fecha_sentencia = doc.get("fec_sentencia_sup_dt", ""),
                materia         = materia_str,
                url_sentencia   = doc.get("url_acceso_sentencia", ""),
                texto_sentencia = limpiar_html(texto_raw),
                tribunal        = tribunal
            )
            session.add(causa)
            session.flush()

            jueces_raw = doc.get("gls_juez_ss", [])
            if isinstance(jueces_raw, str):
                jueces_raw = [jueces_raw]
            for nombre_juez in jueces_raw:
                nombre_juez = nombre_juez.strip()
                if nombre_juez:
                    juez = obtener_o_crear(session, Juez, "nombre_completo", nombre_juez)
                    if juez not in causa.jueces:
                        causa.jueces.append(juez)
            nuevas += 1

        session.commit()
    except Exception as e:
        session.rollback()
        print(f"  [ERROR BD] {e}")
        nuevas = 0
    finally:
        session.close()
    return nuevas

# ============================================================
# OBTENER SESION VALIDA CON PLAYWRIGHT
# ============================================================

def obtener_sesion_valida() -> tuple:
    """
    Abre el navegador, carga la pagina, extrae el _token CSRF y las cookies.
    Devuelve (csrf_token, cookies_dict).
    """
    from playwright.sync_api import sync_playwright

    csrf_token  = None
    cookies_dict = {}
    headers_api  = {}

    def on_request(request):
        nonlocal csrf_token, headers_api
        if "buscar_sentencias" in request.url and request.method == "POST":
            body = request.post_data or ""
            # Extraer _token del multipart body
            match = re.search(r'name="_token"\r\n\r\n(.+?)\r\n', body)
            if match:
                csrf_token = match.group(1).strip()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        page.on("request", on_request)

        print("Cargando pagina para obtener sesion y CSRF token...")
        page.goto(URL_BASE, wait_until="load", timeout=45000)
        page.wait_for_timeout(8000)   # Espectamos a que la API responda automaticamente

        # Extraer cookies
        cookies = context.cookies()
        for c in cookies:
            cookies_dict[c["name"]] = c["value"]

        # Si no lo capturamos del request, buscarlo en el HTML
        if not csrf_token:
            html = page.content()
            match = re.search(r'name="_token"[^>]*value="([^"]+)"', html)
            if match:
                csrf_token = match.group(1)
            # Tambien puede estar como meta tag
            if not csrf_token:
                match = re.search(r'<meta name="csrf-token" content="([^"]+)"', html)
                if match:
                    csrf_token = match.group(1)

        browser.close()

    if csrf_token:
        print(f"Token CSRF obtenido: {csrf_token[:30]}...")
    else:
        print("ADVERTENCIA: No se pudo obtener el token CSRF. La API podria rechazar las peticiones.")

    return csrf_token, cookies_dict


# ============================================================
# SCRAPER PRINCIPAL
# ============================================================

def scraper_masivo():
    import requests as req_lib

    configurar_logging()

    log("=" * 60)
    log("  SCRAPER MASIVO -- JURISPRUDENCIA PJUD")
    log(f"  Total estimado: {TOTAL_ESTIMADO:,} registros")
    log(f"  Inicio        : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log("=" * 60)

    # Paso 1: Auto-reanudacion (detecta donde se quedo)
    offset = detectar_offset_inicial()

    # Paso 2: Obtener sesion valida
    csrf_token, cookies_dict = obtener_sesion_valida()

    headers = {
        "User-Agent"       : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer"          : URL_BASE,
        "X-Requested-With" : "XMLHttpRequest",
        "Accept"           : "text/html, */*; q=0.01",
        "Accept-Language"  : "es-CL,es;q=0.9",
        "Origin"           : "https://juris.pjud.cl",
    }

    http = req_lib.Session()
    http.headers.update(headers)
    for name, value in cookies_dict.items():
        http.cookies.set(name, value)

    total_insertados     = 0
    errores_consecutivos = 0
    num_found            = TOTAL_ESTIMADO

    log(f"Descarga iniciada desde offset={offset:,}\n")

    while offset < num_found:
        data_form = {
            "_token"                  : csrf_token or "",
            "id_buscador"             : ID_BUSCADOR,
            "filtros"                 : json.dumps(FILTROS_BASE),
            "numero_filas_paginacion" : str(REGISTROS_POR_PAGINA),
            "offset_paginacion"       : str(offset),
            "orden"                   : "recientes",
            "personalizacion"         : "false",
        }

        try:
            resp = http.post(URL_API, data=data_form, timeout=60)

            if resp.status_code == 419:
                log("  [419] Token CSRF expirado. Renovando sesion...")
                csrf_token, cookies_dict = obtener_sesion_valida()
                for name, value in cookies_dict.items():
                    http.cookies.set(name, value)
                time.sleep(5)
                continue

            if resp.status_code != 200:
                log(f"  [HTTP {resp.status_code}] offset={offset}. Esperando 30s...")
                errores_consecutivos += 1
                if errores_consecutivos >= 5:
                    log("  Demasiados errores. Deteniendo.")
                    break
                time.sleep(30)
                continue

            data     = resp.json()
            response = data.get("response", {})
            docs     = response.get("docs", [])
            num_found = response.get("numFound", num_found)

            if not docs:
                log(f"Sin mas registros en offset={offset}. Scraping completo.")
                break

            nuevas              = insertar_causas(docs)
            total_insertados    += nuevas
            errores_consecutivos = 0

            progreso = (offset + len(docs)) / max(num_found, 1) * 100
            log(
                f"  offset={offset:>7,} | lote={len(docs):>3} | "
                f"nuevas={nuevas:>3} | BD={total_insertados:>7,} | "
                f"{progreso:>5.1f}%"
            )

            offset += REGISTROS_POR_PAGINA

            if offset < num_found:
                time.sleep(random.uniform(PAUSA_MIN, PAUSA_MAX))

        except req_lib.exceptions.Timeout:
            log(f"  [TIMEOUT] offset={offset}. Reintentando en 20s...")
            errores_consecutivos += 1
            time.sleep(20)

        except Exception as e:
            log(f"  [ERROR] offset={offset}: {e}")
            errores_consecutivos += 1
            if errores_consecutivos >= 5:
                log("  Demasiados errores. Deteniendo.")
                break
            time.sleep(15)

    log("" )
    log("=" * 60)
    log(f"  RESUMEN FINAL")
    log(f"  Causas insertadas esta sesion : {total_insertados:,}")
    log(f"  Ultimo offset procesado       : {offset:,} / {num_found:,}")
    log(f"  Fin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log("=" * 60)



if __name__ == "__main__":
    scraper_masivo()
