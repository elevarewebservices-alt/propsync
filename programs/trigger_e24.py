"""
trigger_e24.py — Inactiva y reactiva propiedades para forzar re-sync con E24.
Aplica a propiedades con updated_at >= 2024-01-01, disponibles o destacadas,
excluyendo Isabel Urriola (id_user=232699).
"""

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
ISABEL_USER  = "232699"
DESDE_2024   = datetime(2024, 1, 1)
DESDE_1ANIO  = datetime(2025, 5, 7)   # propiedades más recientes que esto se saltan


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
            print(f"  [RETRY] conexion — esperando {wait}s...")
            time.sleep(wait)
    raise Exception(f"Fallo tras {retries} intentos: {url}")


def parse_date(raw):
    try:
        return datetime.strptime((raw or "")[:10], "%Y-%m-%d")
    except Exception:
        return None


def set_status(wasi_id: str, status: int):
    resp = requests.post(
        f"{BASE_URL}/property/update/{wasi_id}",
        data={**_creds(), "id_status_on_page": status},
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    if result.get("status") == "error":
        raise Exception(result.get("message"))


def main():
    print("[TRIGGER] Cargando propiedades 2024+ disponibles/destacadas (sin Isabel)...\n")

    skip, take = 0, 100
    total = None
    candidatas = []
    revisadas  = 0

    while True:
        resp = _get_with_retry(
            f"{BASE_URL}/property/search",
            params={**_creds(), "skip": skip, "take": take, "scope": 3},
        )
        data = resp.json()
        if total is None:
            total = int(data.get("total", 0))
        batch = [v for k, v in data.items() if k.isdigit()]
        if not batch:
            break

        for prop in batch:
            revisadas += 1
            if str(prop.get("id_user", "")) == ISABEL_USER:
                continue

            dt_c = parse_date(prop.get("created_at"))
            dt_u = parse_date(prop.get("updated_at"))

            # Creadas en 2024 pero NO en el último año (solo created_at, updated_at lo toca Wasi solo)
            creada_2024  = dt_c and dt_c >= DESDE_2024
            creada_reciente = dt_c and dt_c >= DESDE_1ANIO

            if not creada_2024 or creada_reciente:
                continue

            disponible = prop.get("id_availability") == "1"
            destacada  = bool(prop.get("featured")) or prop.get("id_status_on_page") == "3"
            if not (disponible or destacada):
                continue

            candidatas.append({
                "id":     str(prop["id_property"]),
                "titulo": (prop.get("title") or "")[:55],
                "status_original": int(prop.get("id_status_on_page") or 1),
            })

        if skip + take >= total:
            break
        skip += take
        time.sleep(0.3)

    print(f"[TRIGGER] {len(candidatas)} propiedades a procesar.\n")

    ok = 0
    errores = 0

    for i, prop in enumerate(candidatas, 1):
        wasi_id = prop["id"]
        status_orig = prop["status_original"]

        try:
            set_status(wasi_id, 2)
            time.sleep(3)
            set_status(wasi_id, status_orig)
            ok += 1
            print(f"[OK] {wasi_id} | {prop['titulo']}")
        except Exception as e:
            errores += 1
            print(f"[ERR] {wasi_id}: {e}")

        if i % 100 == 0:
            print(f"  Progreso: {i}/{len(candidatas)} | OK: {ok} | Errores: {errores}")

        time.sleep(0.5)

    print(f"\n[TRIGGER] Finalizado.")
    print(f"  Re-sincronizadas: {ok}")
    print(f"  Errores         : {errores}")


if __name__ == "__main__":
    main()
