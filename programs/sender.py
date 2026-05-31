"""
sender.py — Lee el CSV de Wasi, limpia los datos, los importa a SQLite
y dispara los mensajes vía la API de WASender con delay aleatorio.

Uso:
    python sender.py --csv inventario_wasi.csv [--dry-run]
"""

import argparse
import csv
import json
import os
import re
import sys
import time
import random
from datetime import datetime
from pathlib import Path

import httpx
import requests
from dotenv import load_dotenv

from db_manager import init_db, upsert_property, mark_sent, mark_no_phone, get_pending_properties

load_dotenv()

# ── Configuración ──────────────────────────────────────────────────────────────
WASENDER_API_KEY  = os.getenv("WASENDER_API_KEY", "")
WASENDER_BASE_URL = os.getenv("WASENDER_BASE_URL", "https://api.wasender.app/api")
DELAY_MIN         = int(os.getenv("DELAY_MIN", "20"))   # segundos
DELAY_MAX         = int(os.getenv("DELAY_MAX", "60"))

WASI_ID_COMPANY   = os.getenv("WASI_ID_COMPANY", "")
WASI_TOKEN        = os.getenv("WASI_TOKEN", "")
WASI_BASE_URL     = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")

# ── Mapeo de columnas CSV → campos internos
COLUMN_MAP = {
    "wasi_id":            ["id_property"],
    "nombre_propiedad":   ["title"],
    "nombre_propietario": ["owner_name"],
    "telefono":           ["owner_phone"],
    "tipo_operacion":     ["tipo_operacion", "operation_type", "tipo operación"],
    "precio":             ["precio"],
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def find_column(header: list[str], candidates: list[str]) -> str | None:
    """Devuelve el primer nombre de columna del CSV que coincida con algún candidato."""
    header_lower = {h.strip().lower(): h for h in header}
    for c in candidates:
        if c.strip().lower() in header_lower:
            return header_lower[c.strip().lower()]
    return None


def clean_phone(raw: str) -> str | None:
    """
    Normaliza a formato E.164.
    - Toma solo el primer segmento si hay comas, barras u otros separadores.
    - Números duplicados (>15 dígitos) se truncan inteligentemente.
    - 507 + 0 inicial sobrante se elimina (507066... → 50766...).
    - 8 dígitos sin código → se asume Panamá (+507).
    - Retorna None si vacío o menos de 7 dígitos.
    """
    if not raw:
        return None
    raw = str(raw).strip()
    first = re.split(r"[,;/|\\]+", raw)[0].strip()
    has_plus = first.startswith("+")
    digits = re.sub(r"\D", "", first)
    if len(digits) < 7:
        return None
    if len(digits) > 15:
        digits = digits[:11] if digits.startswith("507") else digits[:13]
    if digits.startswith("507") and len(digits) == 12 and digits[3] == "0":
        digits = digits[:3] + digits[4:]
    if has_plus or len(digits) > 10:
        return f"+{digits}"
    if len(digits) == 8:
        return f"+507{digits}"
    return f"+{digits}"


def format_price(raw: str) -> str:
    """Convierte '450000.00' → '$450,000'."""
    try:
        value = float(str(raw).replace(",", "").replace("$", "").strip())
        return f"${value:,.0f}"
    except (ValueError, TypeError):
        return str(raw).strip() or "N/D"


def infer_tipo_operacion(precio_raw: str) -> str:
    """Si el precio supera $20,000 es Venta, de lo contrario Alquiler."""
    try:
        value = float(str(precio_raw).replace(",", "").replace("$", "").strip())
        return "Venta" if value > 20_000 else "Alquiler"
    except (ValueError, TypeError):
        return "Venta"  # default seguro para inmuebles sin precio legible


def build_message(prop: dict) -> str:
    return (
        f"Buen día, estimada/o {prop['nombre_propietario']},\n\n"
        f"Reciban un cordial saludo de parte de B&B Real Estate Panamá (PJ 1267-18).\n"
        f"Nos encontramos actualizando nuestra base de datos y la propiedad "
        f"*{prop['nombre_propiedad']}* actualmente disponible para "
        f"{prop['tipo_operacion']} con un precio de {prop['precio_fmt']}.\n\n"
        f"Para su actualización, agradeceríamos confirmar si el inmueble "
        f"continúa disponible para {prop['tipo_operacion']}.\n"
        f"Quedamos atentos a su amable confirmación. (ID: {prop['wasi_id']})\n\n"
        f"Atentamente,\nEquipo B&B Real Estate Panamá\n\n"
        f"_Si no desea recibir más mensajes, responda: STOP_"
    )


def add_wasi_comment(wasi_id: str, comment: str) -> None:
    """Agrega una observacion a la propiedad en Wasi (no interrumpe el flujo si falla)."""
    try:
        resp = requests.post(
            f"{WASI_BASE_URL}/property/update/{wasi_id}",
            data={"id_company": WASI_ID_COMPANY, "wasi_token": WASI_TOKEN, "comment": comment},
            timeout=15,
        )
        resp.raise_for_status()
    except Exception as e:
        print(f"    [WASI-OBS] No se pudo agregar observacion a {wasi_id}: {e}")


def _post_with_retry(url: str, payload: dict, headers: dict) -> dict:
    """Hace POST y reintenta una vez si recibe 429, respetando retry_after."""
    for attempt in range(2):
        resp = httpx.post(url, json=payload, headers=headers, timeout=30)
        if resp.status_code == 429:
            retry_after = resp.json().get("retry_after", 60) + 5
            print(f"    [WAIT] Rate limit — esperando {retry_after}s...")
            time.sleep(retry_after)
            continue
        resp.raise_for_status()
        return resp.json()
    resp.raise_for_status()


def send_wasender_message(telefono: str, mensaje: str, wasi_id: str) -> dict:
    """
    Envía dos mensajes secuenciales:
    1. Texto con el detalle completo de la propiedad.
    2. Poll con Sí/No — la pregunta incluye el ID para que el webhook lo identifique.
    """
    headers = {
        "Authorization": f"Bearer {WASENDER_API_KEY}",
        "Content-Type": "application/json",
    }

    # ── 1. Mensaje de texto ────────────────────────────────────────────────────
    _post_with_retry(
        f"{WASENDER_BASE_URL}/send-message",
        {"to": telefono, "text": mensaje},
        headers,
    )

    # Delay entre texto y poll (misma persona): 20-45 segundos
    inter_delay = random.randint(20, 45)
    print(f"    [WAIT] Esperando {inter_delay}s entre texto y poll...")
    time.sleep(inter_delay)

    # ── 2. Poll con Sí / No ────────────────────────────────────────────────────
    return _post_with_retry(
        f"{WASENDER_BASE_URL}/send-message",
        {
            "to": telefono,
            "poll": {
                "question": f"¿El inmueble continúa disponible? (ID: {wasi_id})",
                "options": ["Sí, disponible", "No, ya no"],
                "multiSelect": False,
            },
        },
        headers,
    )


# ── Carga del CSV ──────────────────────────────────────────────────────────────

def load_csv(path: Path) -> list[dict]:
    records = []
    with open(path, encoding="utf-8-sig") as f:
        raw_lines = f.readlines()

    # Excel a veces envuelve filas enteras en comillas: "col1;col2;col3"
    # Detectamos ese caso y desenvuelve + detectamos delimitador real
    stripped = [l.strip().strip('"') for l in raw_lines if l.strip()]
    sample = stripped[0] if stripped else ""
    delimiter = ";" if sample.count(";") >= sample.count(",") else ","
    print(f"[sender] Delimitador detectado: '{delimiter}'")

    import io
    clean_content = "\n".join(stripped)
    reader = csv.DictReader(io.StringIO(clean_content), delimiter=delimiter)
    header = reader.fieldnames or []

    # Resolver columnas una sola vez
    col = {
        field: find_column(header, candidates)
        for field, candidates in COLUMN_MAP.items()
    }
    missing = [f for f, c in col.items() if c is None]
    if missing:
        print(f"[ADVERTENCIA] Columnas no encontradas en el CSV: {missing}")
        print(f"  Cabeceras disponibles: {header}")

    for i, row in enumerate(reader, start=2):
        wasi_id = row.get(col["wasi_id"], "").strip() if col["wasi_id"] else ""
        if not wasi_id:
            print(f"  [fila {i}] Sin wasi_id, se omite.")
            continue

        nombre_propietario = row.get(col["nombre_propietario"], "").strip() if col["nombre_propietario"] else "Propietario"
        nombre_propiedad   = row.get(col["nombre_propiedad"], "").strip()   if col["nombre_propiedad"]   else ""
        telefono_raw       = row.get(col["telefono"], "").strip()           if col["telefono"]           else ""
        precio_raw         = row.get(col["precio"], "").strip()             if col["precio"]             else ""
        tipo_operacion     = infer_tipo_operacion(precio_raw)

        telefono_e164 = clean_phone(telefono_raw)
        if not telefono_e164:
            print(f"  [fila {i}] Teléfono inválido '{telefono_raw}' para {wasi_id}, se omite envío.")

        records.append({
            "wasi_id":            wasi_id,
            "nombre_propiedad":   nombre_propiedad,
            "nombre_propietario": nombre_propietario,
            "telefono_raw":       telefono_raw,
            "telefono_e164":      telefono_e164,
            "tipo_operacion":     tipo_operacion,
            "precio_raw":         precio_raw,
            "precio_fmt":         format_price(precio_raw),
        })

    print(f"[sender] CSV cargado: {len(records)} registros.")
    return records


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Envía mensajes masivos de verificación de inventario.")
    parser.add_argument("--csv", required=False, help="Ruta al CSV exportado de Wasi")
    parser.add_argument("--dry-run", action="store_true", help="Simula sin enviar mensajes")
    parser.add_argument("--limit", type=int, default=-1, help="Máximo de mensajes a enviar (-1 = aleatorio 25-35, 0 = todos)")
    parser.add_argument("--skip-import", action="store_true", help="Salta la importación del CSV (usa BD existente)")
    args = parser.parse_args()

    if not WASENDER_API_KEY and not args.dry_run:
        sys.exit("[ERROR] WASENDER_API_KEY no configurado. Revisa tu archivo .env")

    init_db()

    if not args.skip_import:
        if not args.csv:
            sys.exit("[ERROR] Debes indicar --csv o usar --skip-import")
        csv_path = Path(args.csv)
        if not csv_path.exists():
            sys.exit(f"[ERROR] Archivo no encontrado: {csv_path}")
        records = load_csv(csv_path)
        bajas = 0
        for rec in records:
            upsert_property(rec)
            if not rec["telefono_e164"]:
                mark_no_phone(rec["wasi_id"])
                bajas += 1
        print(f"[sender] {len(records)} propiedades importadas/actualizadas en SQLite. "
              f"({bajas} marcadas como Baja por falta de teléfono)")
    else:
        print("[sender] Saltando importación CSV — usando BD existente.")

    # Obtener sólo las pendientes sin campaña previa
    pending = get_pending_properties()
    limit = args.limit if args.limit >= 0 else random.randint(25, 35)
    if limit > 0:
        pending = pending[:limit]
    print(f"[sender] {len(pending)} propiedades pendientes de envío (límite: {limit}).")

    sent = 0
    errors = 0

    for prop in pending:

        mensaje = build_message(prop)

        if args.dry_run:
            print(f"\n[DRY-RUN] → {prop['telefono_e164']} | ID: {prop['wasi_id']}")
            print(mensaje)
            print(f"Poll: ¿El inmueble continúa disponible? (ID: {prop['wasi_id']})")
            print("Opciones: ['Sí, disponible', 'No, ya no']")
            continue

        try:
            result = send_wasender_message(prop["telefono_e164"], mensaje, prop["wasi_id"])
            wasender_msg_id = result.get("data", {}).get("id") or result.get("messageId")
            mark_sent(prop["wasi_id"], prop["telefono_e164"], mensaje, wasender_msg_id)
            obs = f"Contactado el {datetime.now().strftime('%Y-%m-%d')} via WhatsApp - Esperando respuesta del propietario."
            add_wasi_comment(prop["wasi_id"], obs)
            sent += 1
            print(f"[OK] Enviado -> {prop['telefono_e164']} | ID: {prop['wasi_id']}")
        except httpx.HTTPStatusError as e:
            errors += 1
            print(f"[ERR] HTTP {e.response.status_code} para {prop['wasi_id']}: {e.response.text[:120]}")
            if e.response.status_code == 422:
                from db_manager import mark_no_phone
                mark_no_phone(prop["wasi_id"])
                print(f"    [BAJA] Marcado como Baja (numero invalido), sin espera.")
                continue
        except Exception as e:
            errors += 1
            print(f"[ERR] Error para {prop['wasi_id']}: {e}")
            continue

        # Delay entre personas: 4-6 minutos (solo si se envió o falló por razón no-422)
        delay = random.randint(240, 360)
        print(f"    [WAIT] Esperando {delay}s antes del proximo envio...")
        time.sleep(delay)

    if not args.dry_run:
        print(f"\n[sender] Finalizado. Enviados: {sent} | Errores: {errors}")
        print("[sender] Corriendo processor.py para procesar Bajas...")
        import subprocess
        result = subprocess.run([sys.executable, str(Path(__file__).parent / "processor.py")],
                                capture_output=True, text=True)
        print(result.stdout.strip()[:500])
        if result.returncode != 0:
            print(f"[ERROR processor] {result.stderr.strip()[:300]}")


if __name__ == "__main__":
    main()
