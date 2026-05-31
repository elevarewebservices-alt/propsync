"""
auditar_e24.py — Estado real de E24 en Wasi.

Escanea todas las propiedades con created_at >= 2024-01-01,
disponibles o destacadas, sin Isabel, y reporta cuales tienen
E24 activo y cuales no. Guarda resultado en auditoria_e24.json.
"""

import os
import sys
import time
import json
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

ID_COMPANY  = os.getenv("WASI_ID_COMPANY")
WASI_TOKEN  = os.getenv("WASI_TOKEN")
BASE_URL    = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")
PORTAL_E24  = 54
ISABEL_USER = "232699"
DESDE_2024  = datetime(2024, 1, 1)
OUTPUT      = Path(__file__).parent / "auditoria_e24.json"


def _creds():
    return {"id_company": ID_COMPANY, "wasi_token": WASI_TOKEN}


def _get_with_retry(url, params, timeout=30, retries=4):
    for attempt in range(retries):
        try:
            resp = requests.get(url, params=params, timeout=timeout)
            if resp.status_code in (502, 503, 504):
                wait = 10 * (attempt + 1)
                print(f"  [RETRY] {resp.status_code} — esperando {wait}s...", flush=True)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp
        except requests.exceptions.ConnectionError:
            wait = 10 * (attempt + 1)
            print(f"  [RETRY] conexion — esperando {wait}s...", flush=True)
            time.sleep(wait)
    raise Exception(f"Fallo tras {retries} intentos: {url}")


def parse_date(raw):
    try:
        return datetime.strptime((raw or "")[:10], "%Y-%m-%d")
    except Exception:
        return None


def get_active_portals(wasi_id: str):
    try:
        resp = _get_with_retry(
            f"{BASE_URL}/portal/property/{wasi_id}",
            params=_creds(), timeout=15,
        )
    except Exception:
        return None
    data = resp.json()
    if data.get("status") == "error":
        return None
    return [int(v["id"]) for k, v in data.items()
            if k.isdigit() and v.get("active")]


def main():
    print("[AUDIT] Escaneando propiedades 2024+ disponibles/destacadas...", flush=True)

    skip, take = 0, 100
    total = None
    revisadas = 0
    candidatas = []

    while True:
        resp = _get_with_retry(
            f"{BASE_URL}/property/search",
            params={**_creds(), "skip": skip, "take": take, "scope": 3},
        )
        data = resp.json()
        if total is None:
            total = int(data.get("total", 0))
            print(f"[AUDIT] Total en Wasi: {total}", flush=True)
        batch = [v for k, v in data.items() if k.isdigit()]
        if not batch:
            break

        for prop in batch:
            revisadas += 1
            if str(prop.get("id_user", "")) == ISABEL_USER:
                continue
            status = str(prop.get("id_status_on_page", "1"))
            if status == "2":
                continue
            dt_c = parse_date(prop.get("created_at"))
            if not dt_c or dt_c < DESDE_2024:
                continue
            disponible = prop.get("id_availability") == "1"
            destacada  = bool(prop.get("featured")) or status == "3"
            if not (disponible or destacada):
                continue

            candidatas.append({
                "id":          str(prop["id_property"]),
                "titulo":      (prop.get("title") or "")[:60],
                "created_at":  (prop.get("created_at") or "")[:10],
                "updated_at":  (prop.get("updated_at") or "")[:10],
                "disponible":  disponible,
                "destacada":   destacada,
                "id_user":     str(prop.get("id_user", "")),
            })

        if revisadas % 300 == 0:
            print(f"  Escaneadas {revisadas}/{total} | Candidatas: {len(candidatas)}", flush=True)

        if skip + take >= total:
            break
        skip += take
        time.sleep(0.3)

    print(f"\n[AUDIT] {len(candidatas)} candidatas encontradas. Verificando portales...\n", flush=True)

    con_e24    = []
    sin_e24    = []
    error_ids  = []

    for i, prop in enumerate(candidatas, 1):
        wasi_id = prop["id"]
        portals = get_active_portals(wasi_id)

        if portals is None:
            error_ids.append(wasi_id)
            print(f"[ERR] {wasi_id}", flush=True)
        elif PORTAL_E24 in portals:
            prop["portales"] = portals
            con_e24.append(prop)
        else:
            prop["portales"] = portals
            sin_e24.append(prop)

        if i % 25 == 0:
            print(f"  {i}/{len(candidatas)} | Con E24: {len(con_e24)} | Sin E24: {len(sin_e24)} | Errores: {len(error_ids)}", flush=True)

        time.sleep(0.4)

    result = {
        "fecha_auditoria": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "resumen": {
            "total_candidatas_2024_plus": len(candidatas),
            "con_e24_activo":  len(con_e24),
            "sin_e24":         len(sin_e24),
            "errores_portal":  len(error_ids),
        },
        "con_e24":   con_e24,
        "sin_e24":   sin_e24,
        "errores":   error_ids,
    }

    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n{'='*55}", flush=True)
    print(f"  AUDITORIA E24 — {result['fecha_auditoria']}", flush=True)
    print(f"{'='*55}", flush=True)
    print(f"  Propiedades 2024+ disponibles/destacadas : {len(candidatas)}", flush=True)
    print(f"  CON E24 activo                           : {len(con_e24)}", flush=True)
    print(f"  SIN E24 (faltan agregar)                 : {len(sin_e24)}", flush=True)
    print(f"  Errores al consultar portales            : {len(error_ids)}", flush=True)
    print(f"{'='*55}", flush=True)
    print(f"\n  Guardado en: {OUTPUT}", flush=True)


if __name__ == "__main__":
    main()
