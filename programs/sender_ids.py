"""
sender_ids.py — Envía mensajes a una lista específica de wasi_ids.
Obtiene datos de la API de Wasi y envía texto + poll.

Uso:
    python sender_ids.py 1655420 3185477 1627500 1551706 1463355 1362023
"""

import sys
import time
import random
import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import httpx
from wasi_tools.wasi_client import get_propiedad, get_propietario
from db_manager import init_db, upsert_property, mark_sent, mark_no_phone, get_conn
from sender import build_message, send_wasender_message, clean_phone, format_price, infer_tipo_operacion

WASENDER_API_KEY = os.getenv("WASENDER_API_KEY", "")


def fetch_property_data(wasi_id: str) -> dict | None:
    try:
        data = get_propiedad(wasi_id)
    except Exception as e:
        print(f"  [ERR] Error obteniendo propiedad {wasi_id}: {e}")
        return None

    owner = get_propietario(wasi_id)
    owner_name  = owner.get("name", "") if owner else ""
    owner_phone = owner.get("phone", "") or owner.get("mobile", "") if owner else ""

    precio_raw = str(data.get("canon_price") or data.get("sale_price") or data.get("price") or "0")
    tipo = infer_tipo_operacion(precio_raw)

    return {
        "wasi_id":            wasi_id,
        "nombre_propiedad":   data.get("title", ""),
        "nombre_propietario": owner_name or "Propietario",
        "telefono_raw":       owner_phone,
        "telefono_e164":      clean_phone(owner_phone),
        "tipo_operacion":     tipo,
        "precio_raw":         precio_raw,
        "precio_fmt":         format_price(precio_raw),
    }


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit("Uso: python sender_ids.py ID1:TELEFONO ID2:TELEFONO ...")

    if not WASENDER_API_KEY:
        sys.exit("[ERROR] WASENDER_API_KEY no configurado.")

    # Parsear id:telefono
    entries = {}
    for a in args:
        if ":" in a:
            wid, phone = a.split(":", 1)
            entries[wid.strip()] = phone.strip()
        else:
            entries[a.strip()] = None

    init_db()
    print(f"Procesando {len(entries)} propiedades\n")

    sent = errors = skipped = 0

    for wasi_id, phone_override in entries.items():
        print(f"--- {wasi_id} ---")
        prop = fetch_property_data(wasi_id)
        if not prop:
            skipped += 1
            continue

        # Aplicar teléfono manual si se proporcionó
        if phone_override:
            prop["telefono_raw"] = phone_override
            prop["telefono_e164"] = clean_phone(phone_override)

        print(f"  Propiedad : {prop['nombre_propiedad']}")
        print(f"  Propietario: {prop['nombre_propietario']}")
        print(f"  Teléfono  : {prop['telefono_e164']}")

        upsert_property(prop)

        if not prop["telefono_e164"]:
            mark_no_phone(wasi_id)
            print(f"  [SKIP] Sin teléfono válido.")
            skipped += 1
            continue

        # Verificar si ya fue enviado
        with get_conn() as conn:
            ya_enviado = conn.execute(
                "SELECT id FROM campaigns WHERE wasi_id=?", (wasi_id,)
            ).fetchone()
        if ya_enviado:
            print(f"  [SKIP] Ya fue enviado anteriormente.")
            skipped += 1
            continue

        mensaje = build_message(prop)

        try:
            result = send_wasender_message(prop["telefono_e164"], mensaje, wasi_id)
            wasender_msg_id = result.get("data", {}).get("id") or result.get("messageId")
            mark_sent(wasi_id, prop["telefono_e164"], mensaje, wasender_msg_id)
            sent += 1
            print(f"  [OK] Enviado")
        except httpx.HTTPStatusError as e:
            errors += 1
            print(f"  [ERR] HTTP {e.response.status_code}: {e.response.text[:120]}")
            if e.response.status_code == 422:
                mark_no_phone(wasi_id)
                continue
        except Exception as e:
            errors += 1
            print(f"  [ERR] Error: {e}")
            continue

        if wasi_id != list(entries.keys())[-1]:
            delay = random.randint(240, 360)
            print(f"  [WAIT] Esperando {delay}s antes del proximo...")
            time.sleep(delay)

    print(f"\nFinalizado. Enviados: {sent} | Errores: {errors} | Saltados: {skipped}")


if __name__ == "__main__":
    main()
