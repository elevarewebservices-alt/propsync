"""
desactivar_portales.py — Quita TODOS los portales de las propiedades
publicadas antes del 2025-05-01 para que no aparezcan en ningún portal.

Uso:
    python desactivar_portales.py --dry-run   # muestra qué haría sin tocar nada
    python desactivar_portales.py             # ejecuta los cambios
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


def get_old_properties(scope: int = 1) -> list[dict]:
    props = []
    skip = 0
    take = 100

    scope_label = {1: "B&B (propias)", 2: "Asociados", 3: "Todas"}.get(scope, str(scope))
    print(f"[PORT] Obteniendo propiedades de Wasi — scope: {scope_label}...")
    while True:
        resp = requests.get(
            f"{BASE_URL}/property/search",
            params={**_creds(), "skip": skip, "take": take,
                    "order_by": "created_at", "order": "asc", "scope": scope},
            timeout=30,
        )
        resp.raise_for_status()
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
    resp = requests.get(
        f"{BASE_URL}/portal/property/{id_property}",
        params=_creds(), timeout=15,
    )
    if resp.status_code != 200:
        return None
    data = resp.json()
    if data.get("status") == "error":
        return None
    return [int(v["id"]) for k, v in data.items()
            if k.isdigit() and v.get("active")]


def clear_portals(id_property: str, dry_run: bool) -> str:
    portals = get_active_portals(id_property)

    if portals is None:
        return "error_portals"

    if not portals:
        return "sin_portales"

    if dry_run:
        return f"dry | portales actuales: {portals} -> quedarian: []"

    # Enviar sin ningún campo de portal para limpiar la lista
    payload = {**_creds()}

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
    parser.add_argument("--test-id", type=str, default=None,
                        help="Probar con una sola propiedad primero (ej: --test-id 978822)")
    args = parser.parse_args()

    if args.dry_run:
        print("[PORT] MODO DRY-RUN — no se tocara nada en Wasi\n")

    if args.test_id:
        print(f"[PORT] Modo TEST — solo procesando propiedad {args.test_id}\n")
        portals = get_active_portals(args.test_id)
        print(f"  Portales actuales: {portals}")
        if not args.dry_run and portals:
            result = clear_portals(args.test_id, dry_run=False)
            print(f"  Resultado: {result}")
            portals_post = get_active_portals(args.test_id)
            print(f"  Portales despues: {portals_post}")
        return

    props = get_old_properties(scope=args.scope)
    print(f"\n[PORT] {len(props)} propiedades anteriores al 2025-05-01.\n")

    if not props:
        print("[PORT] Nada que procesar.")
        return

    ok = 0
    sin_portales = 0
    errores = 0

    for prop in props:
        wasi_id = prop["id_property"]
        try:
            result = clear_portals(wasi_id, dry_run=args.dry_run)
            if result == "sin_portales":
                sin_portales += 1
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

    print(f"\n[PORT] Finalizado.")
    print(f"  Portales quitados : {ok}")
    print(f"  Ya sin portales   : {sin_portales}")
    print(f"  Errores           : {errores}")


if __name__ == "__main__":
    main()
