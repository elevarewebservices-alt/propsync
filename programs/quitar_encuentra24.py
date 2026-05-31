"""
quitar_encuentra24.py — Quita Encuentra24 de todas las propiedades
publicadas antes del 2025-05-01.

Uso:
    python quitar_encuentra24.py --dry-run   # muestra qué haría sin tocar nada
    python quitar_encuentra24.py             # ejecuta los cambios
"""

import argparse
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

ID_COMPANY  = os.getenv("WASI_ID_COMPANY")
WASI_TOKEN  = os.getenv("WASI_TOKEN")
BASE_URL    = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")
CUTOFF_DATE = datetime(2025, 5, 1)


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


def get_old_properties(scope: int = 1) -> list[dict]:
    props = []
    skip = 0
    take = 100

    scope_label = {1: "B&B (propias)", 2: "Asociados", 3: "Todas"}.get(scope, str(scope))
    print(f"[E24] Obteniendo propiedades de Wasi — scope: {scope_label}...")
    while True:
        resp = _get_with_retry(
            f"{BASE_URL}/property/search",
            params={**_creds(), "skip": skip, "take": take,
                    "order_by": "created_at", "order": "asc", "scope": scope},
        )
        data = resp.json()
        total = int(data.get("total", 0))
        batch = [v for k, v in data.items() if k.isdigit()]

        if not batch:
            break

        done = False
        for prop in batch:
            created_str = (prop.get("created_at") or "")[:10]
            if not created_str:
                continue
            created_dt = datetime.strptime(created_str, "%Y-%m-%d")
            if created_dt < CUTOFF_DATE:
                props.append({"id_property": str(prop["id_property"]),
                               "title": prop.get("title", "")[:60],
                               "created_at": created_str})
            else:
                done = True
                break

        print(f"  Revisadas {skip + len(batch)}/{total} | Antiguas: {len(props)}")

        if done or skip + take >= total:
            break

        skip += take
        time.sleep(0.3)

    return props


def get_active_portals(id_property: str) -> list[int] | None:
    try:
        resp = _get_with_retry(f"{BASE_URL}/portal/property/{id_property}", params=_creds(), timeout=15)
    except Exception:
        return None
    if resp.status_code != 200:
        return None
    data = resp.json()
    if data.get("status") == "error":
        return None
    return [int(v["id"]) for k, v in data.items()
            if k.isdigit() and v.get("active")]


def remove_portal(id_property: str, portal_id: int, dry_run: bool) -> str:
    portals = get_active_portals(id_property)

    if portals is None:
        return "error_portals"

    if portal_id not in portals:
        return "sin_portal"

    new_portals = [p for p in portals if p != portal_id]

    if dry_run:
        return f"dry | portales actuales: {portals} -> quedan: {new_portals}"

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
    return "ok"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Muestra qué haría sin ejecutar cambios")
    parser.add_argument("--scope", type=int, default=1,
                        help="1=B&B propias (default), 2=asociados, 3=todas")
    parser.add_argument("--portal-id", type=int, default=54,
                        help="ID del portal a quitar (default: 54=Encuentra24, 44=Compreoalquile)")
    args = parser.parse_args()

    portal_names = {54: "Encuentra24", 44: "Compreoalquile"}
    portal_label = portal_names.get(args.portal_id, f"Portal {args.portal_id}")

    if args.dry_run:
        print(f"[PORTAL] MODO DRY-RUN — no se tocara nada en Wasi\n")

    print(f"[PORTAL] Quitando: {portal_label} (ID={args.portal_id})")

    props = get_old_properties(scope=args.scope)
    print(f"\n[PORTAL] {len(props)} propiedades anteriores al 2025-05-01.\n")

    if not props:
        print("[PORTAL] Nada que procesar.")
        return

    ok = 0
    sin_portal = 0
    errores = 0

    for prop in props:
        wasi_id = prop["id_property"]
        try:
            result = remove_portal(wasi_id, args.portal_id, dry_run=args.dry_run)
            if result == "sin_portal":
                sin_portal += 1
            elif result == "error_portals":
                errores += 1
                print(f"[ERR] {wasi_id} | No se obtuvieron portales")
            elif result.startswith("dry"):
                ok += 1
                print(f"[DRY] {wasi_id} | {prop['title']} | {result}")
            elif result == "ok":
                ok += 1
                print(f"[OK] {wasi_id} | {prop['title']}")
        except Exception as e:
            errores += 1
            print(f"[ERR] {wasi_id}: {e}")

        time.sleep(0.4)

    print(f"\n[PORTAL] Finalizado.")
    print(f"  Actualizadas       : {ok}")
    print(f"  Sin {portal_label}: {sin_portal}")
    print(f"  Errores            : {errores}")


if __name__ == "__main__":
    main()
