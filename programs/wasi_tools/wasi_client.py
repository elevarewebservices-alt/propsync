"""
Cliente compartido para la API de Wasi CRM.
Lee credenciales desde el .env del proyecto raíz.
"""

import os
import time
import tempfile
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

ID_COMPANY = os.getenv("WASI_ID_COMPANY", "")
WASI_TOKEN = os.getenv("WASI_TOKEN", "")
BASE_URL   = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")


def _creds():
    return {"id_company": ID_COMPANY, "wasi_token": WASI_TOKEN}


_MINUSCULAS_ES = {
    "de", "del", "la", "las", "el", "los", "un", "una", "unos", "unas",
    "en", "con", "por", "para", "sin", "al", "a", "y", "e", "o", "u",
}

# Abreviaturas inmobiliarias que siempre van en mayúscula
_SIGLAS_INMOBILIARIAS = {
    "PH", "PB", "VIP", "APT", "OF", "OF.", "URB", "SA", "SRL",
    "IVA", "B&B", "USD", "PAB",
}

def _title_es(texto: str) -> str:
    """Title case en español: preposiciones en minúscula, siglas conocidas preservadas."""
    palabras = texto.split()
    resultado = []
    for i, p in enumerate(palabras):
        nucleo = p.strip(".,;:()")
        if nucleo.upper() in _SIGLAS_INMOBILIARIAS:
            resultado.append(nucleo.upper() + p[len(nucleo):])
        elif i == 0:
            resultado.append(p[0].upper() + p[1:].lower() if p else p)
        elif nucleo.lower() in _MINUSCULAS_ES:
            resultado.append(p.lower())
        else:
            resultado.append(p[0].upper() + p[1:].lower() if p else p)
    return " ".join(resultado)


def get_propiedad(id_property: str) -> dict:
    resp = requests.post(f"{BASE_URL}/property/get/{id_property}", data=_creds(), timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") == "error":
        raise Exception(f"Wasi error: {data.get('message')}")
    return data


def update_propiedad(id_property: str, campos: dict) -> dict:
    resp = requests.post(
        f"{BASE_URL}/property/update/{id_property}",
        data={**_creds(), **campos},
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    if result.get("status") == "error":
        raise Exception(f"Wasi update error: {result.get('message')}")
    return result


def get_propietario(id_property: str) -> dict | None:
    resp = requests.post(f"{BASE_URL}/property/owner/{id_property}", data=_creds(), timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") == "error" or data.get("total", 0) == 0:
        return None
    return data


def asignar_propietario(id_property_nueva: str, id_client: str):
    resp = requests.post(
        f"{BASE_URL}/client/add-property/{id_property_nueva}",
        data={**_creds(), "id_client": id_client, "id_client_type": "5"},
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    if result.get("status") == "error":
        raise Exception(f"Error asignando propietario: {result.get('message')}")


def get_comision(id_property: str) -> dict | None:
    resp = requests.get(f"{BASE_URL}/property/get-commission/{id_property}",
                        params=_creds(), timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return None if data.get("status") == "error" else data


def copiar_comision(id_property_nueva: str, comision: dict):
    campos = {
        "commission_type":            comision.get("commission_type", "percent"),
        "commission_value":           comision.get("commission_value", "0"),
        "external_commission_type":   comision.get("external_commission_type", "percent"),
        "external_commission_value":  comision.get("external_commission_value", "0"),
        "external_commission_active": comision.get("external_commission_active", False),
        "external_commission_note":   comision.get("external_commission_note", ""),
        "exclusivity_contract":       comision.get("exclusivity_contract", False),
    }
    if comision.get("exclusivity_contract_date"):
        campos["exclusivity_contract_date"] = comision["exclusivity_contract_date"][:10]
    resp = requests.post(
        f"{BASE_URL}/property/update-commission/{id_property_nueva}",
        data={**_creds(), **campos},
        timeout=30,
    )
    resp.raise_for_status()


CAMPOS_EXCLUIR = {
    "id_property", "id_company", "status", "created_at", "updated_at",
    "visits", "url", "galleries", "main_image", "features", "user_data",
    "link", "id_property_wasi", "published", "trash",
    "country_label", "region_label", "city_label", "location_label",
    "zone_label", "iso_currency", "name_currency", "unit_area_label",
    "unit_built_area_label", "unit_private_area_label", "maintenance_fee_label",
    "sale_price_label", "rent_price_label", "rents_type_label",
    "property_condition_label", "status_on_page_label", "publish_on_map_label",
    "availability_label", "label", "label_color",
}


def crear_propiedad(datos: dict, reintentos: int = 3) -> dict:
    payload = _creds()
    for campo, valor in datos.items():
        if campo not in CAMPOS_EXCLUIR and valor not in (None, "", [], {}):
            if not isinstance(valor, (dict, list)):
                payload[campo] = valor
    payload["id_status_on_page"] = "1"
    for intento in range(1, reintentos + 1):
        resp = requests.post(f"{BASE_URL}/property/add", data=payload, timeout=30)
        if resp.status_code in (502, 503, 504) and intento < reintentos:
            time.sleep(4)
            continue
        resp.raise_for_status()
        result = resp.json()
        if result.get("status") == "error":
            raise Exception(f"Error al crear: {result.get('message')}")
        return result
    raise Exception("No se pudo crear la propiedad tras varios intentos")


def copiar_caracteristicas(id_property_nueva: str, features: dict) -> int:
    ids = [
        str(item["id"])
        for grupo in ("internal", "external")
        for item in features.get(grupo, [])
        if item.get("id")
    ]
    if not ids:
        return 0
    payload = _creds()
    for i, fid in enumerate(ids):
        payload[f"features[{i}]"] = fid
    resp = requests.post(f"{BASE_URL}/property/update/{id_property_nueva}",
                         data=payload, timeout=30)
    resp.raise_for_status()
    return len(ids)


def _subir_imagen(id_property: str, url_imagen: str, reintentos: int = 3) -> bool:
    img_resp = requests.get(url_imagen, timeout=30)
    img_resp.raise_for_status()
    filename = url_imagen.split("/")[-1]
    ext = filename.split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        ext = "jpg"
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(img_resp.content)
        tmp_path = tmp.name
    try:
        for _ in range(reintentos):
            with open(tmp_path, "rb") as f:
                resp = requests.post(
                    f"{BASE_URL}/property/upload-image/{id_property}",
                    params=_creds(),
                    files={"image": (filename, f, f"image/{ext}")},
                    timeout=60,
                )
            resp.raise_for_status()
            if resp.json().get("status") == "success":
                return True
            time.sleep(2)
        return False
    finally:
        os.unlink(tmp_path)


def copiar_imagenes(id_property_nueva: str, galleries: list) -> tuple[int, int]:
    imagenes = sorted(
        [val for gallery in galleries for val in gallery.values()
         if isinstance(val, dict) and "url_original" in val],
        key=lambda x: x.get("position", 0),
    )
    exitosas = 0
    for img in imagenes:
        try:
            if _subir_imagen(id_property_nueva, img["url_original"]):
                exitosas += 1
        except Exception:
            pass
        time.sleep(0.5)
    return exitosas, len(imagenes)


# ── Acciones de alto nivel ─────────────────────────────────────────────────────

def inactivar(id_property: str, comentario: str):
    update_propiedad(id_property, {"id_status_on_page": "2", "comment": comentario})


def marcar_alquilada(id_property: str, comentario: str):
    update_propiedad(id_property, {"id_status_on_page": "2", "id_availability": "3", "comment": comentario})


def marcar_vendida(id_property: str, comentario: str):
    update_propiedad(id_property, {"id_status_on_page": "2", "id_availability": "4", "comment": comentario})


def enviar_basurero(id_property: str, comentario: str):
    from datetime import date
    nota = f"Vendido el {date.today()} - Confirmado por propietario. {comentario}".strip()
    update_propiedad(id_property, {"comment": nota, "id_status_on_page": "4"})


def get_portales(id_property: str) -> list:
    try:
        resp = requests.get(f"{BASE_URL}/portal/property/{id_property}",
                            params=_creds(), timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "error":
            return []
        return [int(v["id"]) for k, v in data.items() if k.isdigit() and v.get("active")]
    except Exception:
        return []


def copiar_portales(id_property_nueva: str, portales: list):
    if not portales:
        return
    payload = _creds()
    for i, pid in enumerate(portales):
        payload[f"portals[{i}]"] = pid
    resp = requests.post(f"{BASE_URL}/property/update/{id_property_nueva}",
                         data=payload, timeout=30)
    resp.raise_for_status()


def duplicar_y_archivar(id_property: str, comentario: str, verbose: bool = True) -> str:
    from datetime import date
    fecha = str(date.today())

    propiedad = get_propiedad(id_property)
    galleries = propiedad.get("galleries", [])
    features  = propiedad.get("features")

    nueva    = crear_propiedad(propiedad)
    nuevo_id = str(nueva.get("id_property"))

    nombre_original = propiedad.get("name", "")
    nombre_titulo   = _title_es(nombre_original) if nombre_original else None
    campos_inicio   = {"id_status_on_page": "1", "id_availability": "1"}
    if nombre_titulo and nombre_titulo != nombre_original:
        campos_inicio["name"] = nombre_titulo
    update_propiedad(nuevo_id, campos_inicio)
    time.sleep(1)

    propietario = get_propietario(id_property)
    if propietario:
        try:
            asignar_propietario(nuevo_id, propietario.get("id_client"))
        except Exception:
            pass
    time.sleep(1)

    comision = get_comision(id_property)
    if comision:
        try:
            copiar_comision(nuevo_id, comision)
        except Exception:
            pass
    time.sleep(1)

    if features:
        try:
            copiar_caracteristicas(nuevo_id, features)
        except Exception:
            pass
    time.sleep(1)

    copiar_imagenes(nuevo_id, galleries)
    time.sleep(1)

    # Siempre publicar en E24 (54) y Compreoalquile (44)
    try:
        copiar_portales(nuevo_id, [54, 44])
    except Exception:
        pass
    time.sleep(1)

    # Observacion en nueva: fecha + codigos
    obs_nueva = f"Disponible - Confirmado con propietario el {fecha}. Cod. nuevo: #{nuevo_id} | Cod. anterior: #{id_property}."
    if comentario:
        obs_nueva += f" {comentario}"
    try:
        update_propiedad(nuevo_id, {"comment": obs_nueva})
    except Exception:
        pass
    time.sleep(1)

    # Original: inactiva (NO papelera) con referencia a la nueva
    nota_original = f"Reemplazada por #{nuevo_id} el {fecha}. {comentario}".strip()
    update_propiedad(id_property, {"comment": nota_original, "id_status_on_page": "2"})

    return nuevo_id
