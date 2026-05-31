"""
preparar_campana_propietarios.py — Prepara CSV para sender.py con propietarios.

Lee auditoria_e24.json, toma las propiedades 2024+ con E24 activo
(las mas antiguas primero), consulta el propietario en Wasi,
y genera propietarios_campana.csv listo para sender.py.

Uso:
    python preparar_campana_propietarios.py --limite 75
"""

import argparse
import csv
import json
import os
import re
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

ID_COMPANY = os.getenv("WASI_ID_COMPANY")
WASI_TOKEN = os.getenv("WASI_TOKEN")
BASE_URL   = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")
AUDIT_FILE = Path(__file__).parent / "auditoria_e24.json"
OUTPUT_CSV = Path(__file__).parent / "propietarios_campana.csv"


def _creds():
    return {"id_company": ID_COMPANY, "wasi_token": WASI_TOKEN}


def get_owner(wasi_id: str):
    try:
        resp = requests.post(
            f"{BASE_URL}/property/owner/{wasi_id}",
            data=_creds(), timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "error" or int(data.get("total", 0)) == 0:
            return None
        return data
    except Exception:
        return None


def get_property_detail(wasi_id: str):
    try:
        resp = requests.post(
            f"{BASE_URL}/property/get/{wasi_id}",
            data=_creds(), timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "error":
            return None
        return data
    except Exception:
        return None


def clean_phone(raw):
    """
    Normaliza teléfono a E.164.
    - Divide por separadores (coma, barra, punto y coma) y toma el primer fragmento válido.
    - Si los dígitos están duplicados (ej: 62431766,62431766) toma solo los primeros.
    - Panama local 8 dígitos → +507XXXXXXXX
    - Internacional (ya trae código de país) → se respeta, se trunca si está duplicado.
    - Elimina el 0 inicial post-código que a veces agregan por error (507 0XXXXXXX → 507 XXXXXXX).
    """
    if not raw:
        return ""
    raw = str(raw).strip()

    # Tomar solo el primer segmento si hay comas, barras u otros separadores
    first = re.split(r'[,;/|\\]+', raw)[0].strip()

    has_plus = first.startswith("+")
    digits = re.sub(r'\D', '', first)

    if len(digits) < 7:
        return ""

    # Número muy largo = probablemente duplicado → truncar inteligentemente
    if len(digits) > 15:
        if digits.startswith('507'):
            digits = digits[:11]   # 507 + 8 dígitos locales
        else:
            digits = digits[:13]   # código país largo + número

    # Quitar 0 después del código 507 si sobra (507 0XXXXXXX → 8 dígitos sin el 0)
    if digits.startswith('507') and len(digits) == 12 and digits[3] == '0':
        digits = digits[:3] + digits[4:]   # 50766714337 correcto

    if has_plus or len(digits) > 10:
        return f"+{digits}"

    if len(digits) == 8:
        return f"+507{digits}"

    # 10-15 dígitos sin + → asumir que ya trae código de país
    return f"+{digits}"


def inactivar_propiedad(wasi_id: str, observacion: str):
    try:
        requests.post(
            f"{BASE_URL}/property/update/{wasi_id}",
            data={**_creds(), "id_status_on_page": "2", "comment": observacion},
            timeout=15,
        ).raise_for_status()
        return True
    except Exception as e:
        print(f"    [ERR-INACTIVAR] {wasi_id}: {e}")
        return False


def es_alquiler(titulo: str) -> bool:
    return bool(re.search(r'alquil', titulo, re.IGNORECASE))


def es_proyecto(titulo: str) -> bool:
    return bool(re.search(r'pre.?venta|pre.?sale|proyecto', titulo, re.IGNORECASE))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limite", type=int, default=75,
                        help="Cantidad de propietarios a recolectar (default: 75)")
    args = parser.parse_args()

    if not AUDIT_FILE.exists():
        print("[ERROR] No se encontro auditoria_e24.json — corre auditar_e24.py primero.")
        return

    audit = json.loads(AUDIT_FILE.read_text(encoding="utf-8"))
    propiedades = audit.get("con_e24", []) + audit.get("sin_e24", [])

    # Ordenar: mas antiguas primero (las que mas necesitan actualizarse en E24)
    propiedades.sort(key=lambda p: p.get("created_at", ""))

    print(f"[CAMP] {len(propiedades)} propiedades en auditoria. Buscando {args.limite} propietarios con telefono...\n")

    from datetime import datetime
    hoy = datetime.now().strftime("%Y-%m-%d")

    registros        = []
    sin_owner        = 0
    sin_tel_baja     = 0
    sin_tel_skip     = 0
    errores          = 0

    for prop in propiedades:
        if len(registros) >= args.limite:
            break

        wasi_id = prop["id"]
        titulo  = prop.get("titulo", "")

        owner = get_owner(wasi_id)
        if not owner:
            sin_owner += 1
            print(f"  [SIN_OWNER] {wasi_id} | {titulo[:50]}")
            time.sleep(0.3)
            continue

        nombre = f"{owner.get('first_name', '')} {owner.get('last_name', '')}".strip() or "Propietario"
        phone_raw = owner.get("cell_phone") or owner.get("phone") or ""
        telefono = clean_phone(phone_raw)

        if not telefono:
            # Alquileres sin tel → inactivar. Proyectos/Ventas → saltar.
            if es_alquiler(titulo) and not es_proyecto(titulo):
                obs = f"Inactivado el {hoy} - Alquiler sin telefono de contacto registrado."
                ok = inactivar_propiedad(wasi_id, obs)
                sin_tel_baja += 1
                estado = "BAJA" if ok else "BAJA-ERR"
                print(f"  [SIN_TEL-{estado}] {wasi_id} | {nombre} | {titulo[:45]}")
            else:
                sin_tel_skip += 1
                print(f"  [SIN_TEL-SKIP] {wasi_id} | {nombre} | {titulo[:45]}")
            time.sleep(0.3)
            continue

        # Obtener precio y tipo de operacion
        detail = get_property_detail(wasi_id)
        if detail:
            precio = detail.get("sale_price") or detail.get("rent_price") or ""
            tipo_op = "Alquiler" if detail.get("rent_price") and not detail.get("sale_price") else "Venta"
        else:
            precio  = ""
            tipo_op = "Venta"

        registros.append({
            "id_property":   wasi_id,
            "title":         titulo,
            "owner_name":    nombre,
            "owner_phone":   telefono,
            "tipo_operacion": tipo_op,
            "precio":        str(precio),
            "created_at":    prop.get("created_at", ""),
        })
        print(f"  [OK] {wasi_id} | {nombre} | {telefono} | {titulo[:40]}")
        time.sleep(0.4)

    print(f"\n[CAMP] Recolectados: {len(registros)} | Sin owner: {sin_owner} | Sin tel (baja): {sin_tel_baja} | Sin tel (skip): {sin_tel_skip} | Errores: {errores}")

    if not registros:
        print("[CAMP] Sin registros para exportar.")
        return

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "id_property", "title", "owner_name", "owner_phone",
            "tipo_operacion", "precio", "created_at",
        ])
        writer.writeheader()
        writer.writerows(registros)

    print(f"\n[CAMP] CSV guardado: {OUTPUT_CSV}")
    print(f"[CAMP] Para enviar los mensajes corre:")
    print(f"       python sender.py --csv propietarios_campana.csv --limit {len(registros)}")


if __name__ == "__main__":
    main()
