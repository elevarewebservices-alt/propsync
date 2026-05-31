"""
restaurar_e24_por_fecha.py — En un solo recorrido:
  - Agrega Encuentra24 a propiedades modificadas desde 2024-01-01 (excepto Isabel)
  - Quita Encuentra24 de las propiedades de Isabel Urriola (id_user=232699)

Uso:
    python restaurar_e24_por_fecha.py --dry-run   # muestra qué haría sin tocar nada
    python restaurar_e24_por_fecha.py             # ejecuta los cambios
"""

import argparse
import os
import time
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

ID_COMPANY   = os.getenv("WASI_ID_COMPANY")
WASI_TOKEN   = os.getenv("WASI_TOKEN")
BASE_URL     = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")
PORTAL_E24   = 54
ISABEL_USER  = "232699"
DESDE        = datetime(2024, 1, 1)


def _creds():
    return {"id_company": ID_COMPANY, "wasi_token": WASI_TOKEN}


def _get_with_retry(url, params, timeout=30, retries=4):
    for attempt in range(retries):
        try:
            resp = requests.get(url, params=params, timeout=timeout)
            if resp.status_code in (502, 503, 504):
                wait = 10 * (attempt + 1)
                print(f"  [RETRY] {resp.status_code} — esperando {wait}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp
        except requests.exceptions.ConnectionError:
            wait = 10 * (attempt + 1)
            print(f"  [RETRY] Error de conexion — esperando {wait}s...")
            time.sleep(wait)
    raise Exception(f"Fallo tras {retries} intentos: {url}")


def get_active_portals(id_property: str) -> list[int] | None:
    try:
        resp = _get_with_retry(
            f"{BASE_URL}/portal/property/{id_property}",
            params=_creds(), timeout=15,
        )
    except Exception:
        return None
    if resp.status_code != 200:
        return None
    data = resp.json()
    if data.get("status") == "error":
        return None
    return [int(v["id"]) for k, v in data.items()
            if k.isdigit() and v.get("active")]


def update_portals(id_property: str, new_portals: list[int], dry_run: bool) -> None:
    if dry_run:
        return
    payload = {**_creds()}
    for i, pid in enumerate(new_portals):
        payload[f"portals[{i}]"] = pid
    resp = requests.post(
        f"{BASE_URL}/property/update/{id_property}",
        data=payload, timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    if result.get("status") == "error":
        raise Exception(result.get("message"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Muestra qué haría sin ejecutar cambios")
    args = parser.parse_args()

    if args.dry_run:
        print("[E24] MODO DRY-RUN — no se tocara nada\n")

    print(f"[E24] Agregando E24 a propiedades con updated_at >= {DESDE.date()} (excepto Isabel)")
    print(f"[E24] Quitando E24 a propiedades de Isabel Urriola (id_user={ISABEL_USER})\n")

    skip, take = 0, 100
    total_props = None
    revisadas = 0

    agregados      = 0
    ya_tenia       = 0
    isabel_quitado = 0
    isabel_sin_e24 = 0
    fuera_rango    = 0
    errores        = 0

    while True:
        resp = _get_with_retry(
            f"{BASE_URL}/property/search",
            params={**_creds(), "skip": skip, "take": take,
                    "order_by": "updated_at", "order": "desc", "scope": 3},
        )
        data = resp.json()
        if total_props is None:
            total_props = int(data.get("total", 0))
        batch = [v for k, v in data.items() if k.isdigit()]
        if not batch:
            break

        for prop in batch:
            revisadas += 1
            wasi_id = str(prop["id_property"])
            titulo  = (prop.get("title") or "")[:55]
            id_user = str(prop.get("id_user", ""))

            # --- Isabel: quitar E24 ---
            if id_user == ISABEL_USER:
                try:
                    portals = get_active_portals(wasi_id)
                    if portals is None:
                        errores += 1
                        print(f"[ERR] {wasi_id} | Isabel — no se obtuvieron portales")
                    elif PORTAL_E24 not in portals:
                        isabel_sin_e24 += 1
                    else:
                        new_portals = [p for p in portals if p != PORTAL_E24]
                        if args.dry_run:
                            print(f"[DRY-ISABEL] {wasi_id} | {titulo}")
                        else:
                            update_portals(wasi_id, new_portals, dry_run=False)
                            print(f"[ISABEL-OK] {wasi_id} | {titulo}")
                        isabel_quitado += 1
                except Exception as e:
                    errores += 1
                    print(f"[ERR] {wasi_id} (Isabel): {e}")
                time.sleep(0.35)
                continue

            # --- Resto: agregar E24 si updated_at >= 2024-01-01 y disponible/destacada ---
            raw = (prop.get("updated_at") or "")[:10]
            try:
                dt = datetime.strptime(raw, "%Y-%m-%d")
            except Exception:
                fuera_rango += 1
                continue

            if dt < DESDE:
                fuera_rango += 1
                continue

            disponible  = prop.get("id_availability") == "1"
            destacada   = bool(prop.get("featured")) or prop.get("id_status_on_page") == "3"
            if not (disponible or destacada):
                fuera_rango += 1
                continue

            try:
                portals = get_active_portals(wasi_id)
                if portals is None:
                    errores += 1
                    print(f"[ERR] {wasi_id} | No se obtuvieron portales")
                elif PORTAL_E24 in portals:
                    ya_tenia += 1
                else:
                    new_portals = portals + [PORTAL_E24]
                    if args.dry_run:
                        print(f"[DRY] {wasi_id} | {titulo}")
                    else:
                        update_portals(wasi_id, new_portals, dry_run=False)
                        print(f"[OK] {wasi_id} | {titulo}")
                    agregados += 1
            except Exception as e:
                errores += 1
                print(f"[ERR] {wasi_id}: {e}")

            time.sleep(0.35)

        if revisadas % 200 == 0:
            print(f"  Revisadas {revisadas}/{total_props} | +E24: {agregados} | Ya tenian: {ya_tenia} | Isabel quitado: {isabel_quitado}")

        if skip + take >= total_props:
            break

        skip += take
        time.sleep(0.3)

    print(f"\n[E24] Finalizado.")
    print(f"  E24 agregado        : {agregados}")
    print(f"  Ya tenian E24       : {ya_tenia}")
    print(f"  Isabel — E24 quitado: {isabel_quitado}")
    print(f"  Isabel — sin E24    : {isabel_sin_e24}")
    print(f"  Fuera de rango      : {fuera_rango}")
    print(f"  Errores             : {errores}")


if __name__ == "__main__":
    main()
