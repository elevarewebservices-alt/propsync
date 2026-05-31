import requests
import pandas as pd
import json
import sqlite3
import os
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# ========== CONFIGURACIÓN ==========
ID_COMPANY = int(os.getenv("WASI_ID_COMPANY", "2946576"))
WASI_TOKEN = os.getenv("WASI_TOKEN", "")
BASE_URL   = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")
DB_PATH    = "propiedades.db"
DIAS_SIN_CAMBIOS = 365  # Propiedades con creación Y modificación más antiguas que esto

# Modo CSV: si quieres cargar desde un archivo en lugar del API,
# pon aquí el nombre del archivo (ej: "mis_propiedades.csv") o deja None para usar el API.
# Columnas requeridas: id_property, owner_name, owner_phone, title, precio
INPUT_CSV = None

def auth_params():
    """Parámetros de autenticación para todas las llamadas a la API"""
    return {"id_company": ID_COMPANY, "wasi_token": WASI_TOKEN}


# ========== UTILIDADES DE FECHA ==========

def parse_date(date_str):
    """Convierte string de fecha WASI a datetime. Fechas vacías → epoch."""
    if not date_str or str(date_str).startswith("0000"):
        return datetime(1900, 1, 1)
    try:
        return datetime.strptime(str(date_str).strip(), '%Y-%m-%d %H:%M:%S')
    except ValueError:
        try:
            return datetime.strptime(str(date_str).strip()[:10], '%Y-%m-%d')
        except ValueError:
            return datetime(1900, 1, 1)


# ========== BASE DE DATOS ==========

def iniciar_db():
    """Crea la base de datos y la tabla si no existen. Migra columnas faltantes."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS propiedades (
            id_property      TEXT PRIMARY KEY,
            id_company       TEXT,
            scope            INTEGER,
            asesor           TEXT DEFAULT '',
            created_at       TEXT,
            updated_at       TEXT,
            owner_name       TEXT DEFAULT '',
            owner_phone      TEXT DEFAULT '',
            owner_fetched    INTEGER DEFAULT 0,
            data_json        TEXT
        )
    """)
    # Migración: agregar columnas que puedan faltar en DBs antiguas
    columnas_existentes = {row[1] for row in conn.execute("PRAGMA table_info(propiedades)")}
    migraciones = {
        'asesor'       : "ALTER TABLE propiedades ADD COLUMN asesor TEXT DEFAULT ''",
        'created_at'   : "ALTER TABLE propiedades ADD COLUMN created_at TEXT DEFAULT ''",
        'updated_at'   : "ALTER TABLE propiedades ADD COLUMN updated_at TEXT DEFAULT ''",
        'owner_name'   : "ALTER TABLE propiedades ADD COLUMN owner_name TEXT DEFAULT ''",
        'owner_phone'  : "ALTER TABLE propiedades ADD COLUMN owner_phone TEXT DEFAULT ''",
        'owner_fetched': "ALTER TABLE propiedades ADD COLUMN owner_fetched INTEGER DEFAULT 0",
    }
    for col, sql in migraciones.items():
        if col not in columnas_existentes:
            conn.execute(sql)
            print(f"   🔧 Columna '{col}' agregada a la DB")
    conn.commit()
    return conn


def guardar_propiedades_en_db(conn, props, scope):
    """Inserta propiedades filtradas en la DB. Si ya existen, no las sobreescribe."""
    insertadas = 0
    for prop in props:
        id_prop  = str(prop.get('id_property', ''))
        id_comp  = str(prop.get('id_company', ''))
        asesor   = prop.get('asesor', '')
        created  = str(prop.get('created_at', ''))
        updated  = str(prop.get('updated_at', ''))
        data_str = json.dumps(prop, ensure_ascii=False)
        try:
            conn.execute(
                """INSERT OR IGNORE INTO propiedades
                   (id_property, id_company, scope, asesor, created_at, updated_at, data_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (id_prop, id_comp, scope, asesor, created, updated, data_str)
            )
            insertadas += 1
        except Exception as e:
            print(f"   ⚠️ Error guardando propiedad {id_prop}: {e}")
    conn.commit()
    return insertadas


def obtener_pendientes_propietario(conn):
    cur = conn.execute("SELECT id_property FROM propiedades WHERE owner_fetched = 0")
    return [row[0] for row in cur.fetchall()]


def guardar_propietario_en_db(conn, id_property, owner_name, owner_phone):
    conn.execute(
        """UPDATE propiedades
           SET owner_name = ?, owner_phone = ?, owner_fetched = 1
           WHERE id_property = ?""",
        (owner_name, owner_phone, str(id_property))
    )
    conn.commit()


def leer_todas_de_db(conn):
    """Lee todas las propiedades de la DB y las devuelve como lista de dicts"""
    cur = conn.execute(
        "SELECT data_json, asesor, owner_name, owner_phone, scope FROM propiedades"
    )
    filas = []
    for data_json, asesor, owner_name, owner_phone, scope in cur.fetchall():
        prop = json.loads(data_json)
        prop['asesor']      = asesor      or ''
        prop['owner_name']  = owner_name  or ''
        prop['owner_phone'] = owner_phone or ''
        prop['scope']       = scope
        filas.append(prop)
    return filas


# ========== API WASI ==========

def obtener_asesores():
    """Devuelve dict {id_user: nombre_completo}"""
    try:
        data = requests.get(
            f"{BASE_URL}/user/all-users",
            params=auth_params(),
            timeout=30
        ).json()
        if data.get('status') != 'success':
            return {}
        return {
            str(u.get('id_user')): f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()
            for k, u in data.items() if k.isdigit()
        }
    except Exception as e:
        print(f"   ⚠️ No se pudieron obtener asesores: {e}")
        return {}


def obtener_propiedades_antiguas(scope, nombre, asesores):
    """
    Descarga todas las propiedades activas (scope) y filtra localmente
    las que tienen AMBAS fechas (created_at y updated_at) con más de
    DIAS_SIN_CAMBIOS días de antigüedad.
    """
    corte      = datetime.now() - timedelta(days=DIAS_SIN_CAMBIOS)
    filtradas  = []
    skip, take = 0, 100
    total_api  = '?'

    print(f"📡 Descargando {nombre} (scope={scope})...")

    while True:
        try:
            params = {
                **auth_params(),
                'scope'                : scope,
                'take'                 : take,
                'skip'                 : skip,
                'id_status_on_internet': 1,   # Solo propiedades activas
            }
            data = requests.get(
                f"{BASE_URL}/property/search",
                params=params,
                timeout=30
            ).json()

            if not data or data.get('status') != 'success':
                print(f"   ⚠️ Respuesta inesperada: {str(data)[:100]}")
                break

            total_api    = data.get('total', '?')
            items_en_lote = 0

            for key, prop in data.items():
                if not key.isdigit():
                    continue
                items_en_lote += 1

                f_creacion    = parse_date(prop.get('created_at'))
                f_modificacion = parse_date(prop.get('updated_at'))
                disponible    = str(prop.get('id_availability', ''))

                # Filtro: activa + creada hace >1 año + no modificada hace >1 año
                if disponible == '1' and (f_creacion < corte or f_modificacion < corte):
                    id_user = str(prop.get('id_user', ''))
                    prop['asesor'] = asesores.get(id_user, f"ID {id_user}")
                    filtradas.append(prop)

            print(f"   📄 skip={skip}: {items_en_lote} procesadas | "
                  f"{len(filtradas)} antiguas acumuladas / {total_api} totales en API",
                  end='\r')

            if items_en_lote < take:
                break
            skip += take

        except requests.exceptions.RequestException as e:
            print(f"\n   ❌ Error de conexión: {e}")
            break

    print(f"\n   ✅ {nombre}: {len(filtradas)} propiedades antiguas (de {total_api} activas)")
    return filtradas


def obtener_propietario_api(id_property):
    """Llama a la API y devuelve (owner_name, owner_phone)"""
    try:
        data = requests.get(
            f"{BASE_URL}/property/owner/{id_property}",
            params=auth_params(),
            timeout=30
        ).json()

        if data.get('status') != 'success' or data.get('total', 0) == 0:
            return '', ''

        owner = data.get('0', {})
        first = owner.get('first_name', '').strip()
        last  = owner.get('last_name',  '').strip()
        name  = f"{first} {last}".strip()
        phone = owner.get('cell_phone') or owner.get('phone', '')
        return name, str(phone)
    except Exception:
        return '', ''


# ========== MODO CSV ==========

def cargar_desde_csv(csv_path):
    """
    Lee un CSV con las columnas: id_property, owner_name, owner_phone, title, precio
    Devuelve lista de dicts compatibles con guardar_propiedades_en_db,
    con owner_fetched=1 ya que el CSV ya trae los datos del propietario.
    """
    COLUMNAS_REQUERIDAS = {'id_property', 'owner_name', 'owner_phone', 'title', 'precio'}

    if not os.path.exists(csv_path):
        print(f"❌ No se encontró el archivo: {csv_path}")
        return []

    try:
        df = pd.read_csv(csv_path, dtype=str).fillna('')
    except Exception as e:
        print(f"❌ Error leyendo CSV: {e}")
        return []

    # Normalizar nombres de columna (quitar espacios, lowercase)
    df.columns = [c.strip().lower() for c in df.columns]

    faltantes = COLUMNAS_REQUERIDAS - set(df.columns)
    if faltantes:
        print(f"❌ Al CSV le faltan estas columnas: {', '.join(sorted(faltantes))}")
        print(f"   Columnas encontradas: {', '.join(df.columns)}")
        return []

    props = []
    for _, row in df.iterrows():
        prop = {
            'id_property' : row.get('id_property',  '').strip(),
            'owner_name'  : row.get('owner_name',   '').strip(),
            'owner_phone' : row.get('owner_phone',  '').strip(),
            'title'       : row.get('title',        '').strip(),
            'sale_price'  : row.get('precio',       '').strip(),
            'id_company'  : str(ID_COMPANY),
            'asesor'      : row.get('asesor',       '').strip(),
            'created_at'  : row.get('created_at',   '').strip(),
            'updated_at'  : row.get('updated_at',   '').strip(),
            # Columnas extra del CSV si existen
            **{k: v for k, v in row.items()
               if k not in ('id_property','owner_name','owner_phone','title','precio',
                            'id_company','asesor','created_at','updated_at','sale_price')},
            '_owner_prefetched': True,  # Señal para no volver a consultar la API
        }
        if prop['id_property']:
            props.append(prop)

    print(f"   ✅ CSV cargado: {len(props)} propiedades (de {len(df)} filas)")
    return props


def guardar_csv_en_db(conn, props, scope):
    """
    Como cargar_desde_csv ya trae owner_name/owner_phone,
    los guarda directamente con owner_fetched=1.
    """
    insertadas = 0
    for prop in props:
        id_prop  = str(prop.get('id_property', ''))
        id_comp  = str(prop.get('id_company', ''))
        asesor   = prop.get('asesor', '')
        created  = str(prop.get('created_at', ''))
        updated  = str(prop.get('updated_at', ''))
        o_name   = prop.get('owner_name', '')
        o_phone  = prop.get('owner_phone', '')
        data_str = json.dumps(
            {k: v for k, v in prop.items() if k != '_owner_prefetched'},
            ensure_ascii=False
        )
        try:
            conn.execute(
                """INSERT OR IGNORE INTO propiedades
                   (id_property, id_company, scope, asesor, created_at, updated_at,
                    owner_name, owner_phone, owner_fetched, data_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)""",
                (id_prop, id_comp, scope, asesor, created, updated,
                 o_name, o_phone, data_str)
            )
            insertadas += 1
        except Exception as e:
            print(f"   ⚠️ Error guardando propiedad {id_prop}: {e}")
    conn.commit()
    return insertadas


# ========== PROPIETARIOS (con caché en DB) ==========

def enriquecer_con_propietarios(conn):
    """Consulta la API solo para las propiedades que aún no tienen propietario"""
    pendientes = obtener_pendientes_propietario(conn)
    total = len(pendientes)

    if total == 0:
        print("   ✅ Todos los propietarios ya están en la base de datos.")
        return

    print(f"   🔍 Propiedades pendientes de propietario: {total}")
    for i, id_prop in enumerate(pendientes, 1):
        name, phone = obtener_propietario_api(id_prop)
        guardar_propietario_en_db(conn, id_prop, name, phone)
        if i % 10 == 0 or i == total:
            print(f"   👤 Propietarios consultados: {i}/{total}", end='\r')
    print()


# ========== EXPORTAR ==========

def exportar_resultados(conn):
    """Lee la DB y exporta CSVs. Devuelve la carpeta creada."""
    carpeta = f"Reporte_Limpieza_{datetime.now().strftime('%d_%m_%Y_%H%M%S')}"
    os.makedirs(carpeta, exist_ok=True)

    print(f"\n💾 Guardando archivos en carpeta: {carpeta}/")
    print("=" * 50)

    todas      = leer_todas_de_db(conn)

    if not todas:
        print("   ⚠️  No hay propiedades en la base de datos. Verifica la conexión al API.")
        return carpeta, pd.DataFrame()

    bb_props   = [p for p in todas if p.get('scope') == 1]
    asoc_props = [p for p in todas if p.get('scope') == 2]

    # Agrupar asociados por empresa
    empresas_asociadas = {}
    for prop in asoc_props:
        cid = prop.get('id_company')
        if cid and str(cid) != str(ID_COMPANY):
            empresas_asociadas.setdefault(cid, []).append(prop)

    # CSV B&B con formato exacto requerido: 5 columnas específicas
    def bb_a_csv(props, ruta):
        if not props:
            return
        df = pd.DataFrame(props)
        df_out = pd.DataFrame({
            'id_property': df.get('id_property', pd.Series(dtype=str)).fillna(''),
            'owner_name' : df.get('owner_name',  pd.Series(dtype=str)).fillna(''),
            'owner_phone': df.get('owner_phone',  pd.Series(dtype=str)).fillna(''),
            'title'      : df.get('title',        pd.Series(dtype=str)).fillna(''),
            'precio'     : df.get('sale_price',   pd.Series(dtype=str)).fillna(''),
        })
        df_out.to_csv(ruta, index=False, encoding='utf-8-sig')
        print(f"   ✅ {ruta} ({len(props)} propiedades)")

    # CSV asociados con todas las columnas (uso interno)
    COLS_INICIO = ['id_property', 'asesor', 'owner_name', 'owner_phone',
                   'title', 'zone_label', 'sale_price', 'created_at', 'updated_at']

    def a_csv(props, ruta):
        if not props:
            return
        df = pd.DataFrame(props)
        for col in COLS_INICIO:
            if col not in df.columns:
                df[col] = ''
        resto = [c for c in df.columns if c not in COLS_INICIO]
        df = df[COLS_INICIO + resto]
        df.to_csv(ruta, index=False, encoding='utf-8-sig')
        print(f"   ✅ {ruta} ({len(props)} propiedades)")

    bb_a_csv(bb_props,  f"{carpeta}/01_BB_REAL_ESTATE.csv")
    a_csv(asoc_props,   f"{carpeta}/02_TODOS_ASOCIADOS.csv")
    for empresa_id, props in empresas_asociadas.items():
        a_csv(props, f"{carpeta}/03_ASOCIADO_{empresa_id}.csv")

    # Resumen por asesor (B&B)
    if bb_props:
        df_bb = pd.DataFrame(bb_props)
        resumen_asesor = df_bb['asesor'].value_counts().reset_index()
        resumen_asesor.columns = ['Asesor', 'Propiedades_Antiguas']
        resumen_asesor.to_csv(f"{carpeta}/00_RESUMEN_ASESORES.csv", index=False, encoding='utf-8-sig')
        print(f"   ✅ {carpeta}/00_RESUMEN_ASESORES.csv")

    # Resumen general
    resumen = []
    if bb_props:
        resumen.append({'tipo': 'PRINCIPAL', 'id_empresa': ID_COMPANY,
                        'nombre': 'B&B Real Estate', 'propiedades': len(bb_props),
                        'archivo': '01_BB_REAL_ESTATE.csv'})
    for empresa_id, props in empresas_asociadas.items():
        resumen.append({'tipo': 'ASOCIADO', 'id_empresa': empresa_id,
                        'nombre': f"Asociado {empresa_id}", 'propiedades': len(props),
                        'archivo': f"03_ASOCIADO_{empresa_id}.csv"})

    df_resumen = pd.DataFrame(resumen) if resumen else pd.DataFrame()
    df_resumen.to_csv(f"{carpeta}/00_RESUMEN_GENERAL.csv", index=False, encoding='utf-8-sig')
    print(f"   ✅ {carpeta}/00_RESUMEN_GENERAL.csv")

    return carpeta, df_resumen


# ========== MAIN ==========

def main():
    print("=" * 60)
    print("🏢 CLASIFICADOR DE PROPIEDADES ANTIGUAS — WASI")
    print(f"   Criterio: activas + sin cambios hace >{DIAS_SIN_CAMBIOS} días")
    print("=" * 60)
    print(f"\n📋 Configuración:")
    print(f"   ID Empresa : {ID_COMPANY}")
    print(f"   Token      : {WASI_TOKEN[:10]}...")
    print(f"   Base datos : {DB_PATH}")

    # Iniciar base de datos
    conn = iniciar_db()

    if INPUT_CSV:
        # ── MODO CSV ─────────────────────────────────────────────
        print(f"\n📂 MODO CSV: leyendo desde '{INPUT_CSV}'")
        print("=" * 60)
        props_csv = cargar_desde_csv(INPUT_CSV)
        if not props_csv:
            print("❌ No se pudo cargar el CSV. Revisa el archivo e intenta de nuevo.")
            conn.close()
            return
        nuevas = guardar_csv_en_db(conn, props_csv, scope=1)
        print(f"   💽 Guardadas en DB: {nuevas} propiedades del CSV")
        print("   ℹ️  Propietarios cargados del CSV — se omite consulta al API.")
    else:
        # ── MODO API ─────────────────────────────────────────────
        print("\n👥 Obteniendo asesores...")
        asesores = obtener_asesores()
        print(f"   ✅ {len(asesores)} asesores encontrados")

        print("\n" + "=" * 60)
        bb_props = obtener_propiedades_antiguas(1, "B&B Real Estate", asesores)
        nuevas_bb = guardar_propiedades_en_db(conn, bb_props, scope=1)
        print(f"   💽 Guardadas en DB: {nuevas_bb} nuevas de B&B")

        print("\n" + "=" * 60)
        asoc_props = obtener_propiedades_antiguas(2, "Asociados", asesores)
        nuevas_asoc = guardar_propiedades_en_db(conn, asoc_props, scope=2)
        print(f"   💽 Guardadas en DB: {nuevas_asoc} nuevas de Asociados")

        # Enriquecer con propietarios (retoma si se interrumpió)
        print("\n" + "=" * 60)
        print("👤 OBTENIENDO DATOS DE PROPIETARIOS")
        print("=" * 60)
        enriquecer_con_propietarios(conn)

    # Exportar CSVs
    print("\n" + "=" * 60)
    carpeta, df_resumen = exportar_resultados(conn)

    conn.close()

    print("\n" + "=" * 60)
    print("✨ PROCESO COMPLETADO EXITOSAMENTE ✨")
    print("=" * 60)
    print(f"💽 Base de datos : {DB_PATH}")
    print(f"📁 CSVs en       : {carpeta}/")
    print(f"\n📄 Archivos generados:")
    print(f"   • 00_RESUMEN_GENERAL.csv   - Resumen por empresa")
    print(f"   • 00_RESUMEN_ASESORES.csv  - Conteo por asesor (B&B)")
    print(f"   • 01_BB_REAL_ESTATE.csv    - Propiedades antiguas de B&B")
    print(f"   • 02_TODOS_ASOCIADOS.csv   - Propiedades antiguas de asociados")
    print(f"   • 03_ASOCIADO_[ID].csv     - Por cada empresa asociada")
    if not df_resumen.empty:
        print(f"\n📊 Resumen:")
        print(df_resumen.to_string(index=False))


if __name__ == "__main__":
    main()
