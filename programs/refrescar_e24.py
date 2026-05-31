"""
refrescar_e24.py — Para TODAS las propiedades con created_at >= 2024-01-01:
  1. Asegura que E24 (portal 54) este en la lista de portales
  2. Hace POST property/update con la lista de portales (misma o + E24)
     → Wasi actualiza updated_at  → E24 las ve como "Updated" no "Deactivated"

Filtros: no Isabel (232699), no id_status_on_page=2, solo disponibles o destacadas.
"""

import os
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


def update_portals(wasi_id: str, portals: list):
    payload = {**_creds()}
    for i, pid in enumerate(portals):
        payload[f"portals[{i}]"] = pid
    resp = requests.post(
        f"{BASE_URL}/property/update/{wasi_id}",
        data=payload, timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    if result.get("status") == "error":
        raise Exception(result.get("message", "unknown error"))


def main():
    print("[E24] Iniciando refresco de propiedades 2024+ para E24...")
    print(f"[E24] Filtro: created_at >= {DESDE_2024.date()}, disponibles/destacadas, sin Isabel\n")

    skip, take = 0, 100
    total = None
    revisadas = 0
    candidatas = []

    # ── Fase 1: recolectar candidatas ──────────────────────────────────────────
    print("[E24] Fase 1: Escaneando propiedades...")
    while True:
        resp = _get_with_retry(
            f"{BASE_URL}/property/search",
            params={**_creds(), "skip": skip, "take": take, "scope": 3},
        )
        data = resp.json()
        if total is None:
            total = int(data.get("total", 0))
            print(f"[E24] Total en Wasi: {total}")
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
                "id":     str(prop["id_property"]),
                "titulo": (prop.get("title") or "")[:55],
            })

        if revisadas % 500 == 0:
            print(f"  Escaneadas {revisadas}/{total} | Candidatas hasta ahora: {len(candidatas)}")

        if skip + take >= total:
            break
        skip += take
        time.sleep(0.3)

    print(f"\n[E24] {len(candidatas)} candidatas (created_at >= 2024, disponible/destacada)\n")
    print("[E24] Fase 2: Actualizando portales (asegura E24 + refresca updated_at)...\n")

    ok_con_e24    = 0   # ya tenian E24, solo refresh
    ok_agrego_e24 = 0   # no tenian E24, se agrego
    errores       = 0

    for i, prop in enumerate(candidatas, 1):
        wasi_id = prop["id"]
        try:
            portals = get_active_portals(wasi_id)
            if portals is None:
                errores += 1
                print(f"[ERR] {wasi_id} | no se obtuvieron portales")
                time.sleep(0.4)
                continue

            tiene_e24 = PORTAL_E24 in portals
            new_portals = portals if tiene_e24 else portals + [PORTAL_E24]

            update_portals(wasi_id, new_portals)

            if tiene_e24:
                ok_con_e24 += 1
                print(f"[REFRESH] {wasi_id} | {prop['titulo']}")
            else:
                ok_agrego_e24 += 1
                print(f"[+E24]    {wasi_id} | {prop['titulo']}")

        except Exception as e:
            errores += 1
            print(f"[ERR] {wasi_id}: {e}")

        if i % 50 == 0:
            print(f"\n  ── Progreso {i}/{len(candidatas)} | Refresh: {ok_con_e24} | +E24: {ok_agrego_e24} | Errores: {errores} ──\n")

        time.sleep(0.5)

    total_ok = ok_con_e24 + ok_agrego_e24
    print(f"\n[E24] Finalizado.")
    print(f"  Refresh (ya tenian E24): {ok_con_e24}")
    print(f"  E24 agregado            : {ok_agrego_e24}")
    print(f"  Total procesadas        : {total_ok}")
    print(f"  Errores                 : {errores}")
    print(f"\n  En el proximo sync de E24 estas {total_ok} propiedades")
    print(f"  deben aparecer como 'Updated' en vez de 'Deactivated'.")


if __name__ == "__main__":
    main()
