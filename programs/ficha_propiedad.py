"""
ficha_propiedad.py — Extrae imágenes y descripción de una propiedad Wasi
y las envía por WhatsApp a tu propio número.

Uso:
    python ficha_propiedad.py 6643895
    python ficha_propiedad.py 6643895 --phone +50762877050
    python ficha_propiedad.py 6643895 --max-images 5
"""

import argparse
import html
import os
import re
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from wasi_tools.wasi_client import get_propiedad

WASENDER_API_KEY  = os.getenv("WASENDER_API_KEY", "")
WASENDER_BASE_URL = os.getenv("WASENDER_BASE_URL", "https://www.wasenderapi.com/api")
MY_PHONE          = os.getenv("MY_PHONE", "")


def _send(payload: dict):
    headers = {
        "Authorization": f"Bearer {WASENDER_API_KEY}",
        "Content-Type": "application/json",
    }
    for attempt in range(2):
        resp = httpx.post(f"{WASENDER_BASE_URL}/send-message", json=payload, headers=headers, timeout=30)
        if resp.status_code == 429:
            wait = resp.json().get("retry_after", 60) + 5
            print(f"  [WAIT] Rate limit — esperando {wait}s...")
            time.sleep(wait)
            continue
        if not resp.is_success:
            print(f"  [DEBUG] {resp.status_code}: {resp.text[:300]}")
        resp.raise_for_status()
        return resp.json()
    resp.raise_for_status()


def send_text(to: str, text: str):
    _send({"to": to, "text": text})


def send_image(to: str, url: str, caption: str = ""):
    payload = {"to": to, "imageUrl": url}
    if caption:
        payload["caption"] = caption
    _send(payload)


def build_header(prop: dict) -> str:
    title      = prop.get("title", "Sin titulo")
    wasi_id    = prop.get("id_property", "")
    sale_price = prop.get("sale_price")
    rent_price = prop.get("rent_price")
    bedrooms   = prop.get("bedrooms") or prop.get("rooms", "")
    bathrooms  = prop.get("bathrooms", "")
    area       = prop.get("area") or prop.get("total_area", "")
    area_unit  = prop.get("unit_area_label", "m2")
    city       = prop.get("city_label", "")
    zone       = prop.get("zone_label", "")

    lines = [f"*{title}*", f"ID: {wasi_id}"]

    location_parts = [p for p in [zone, city] if p]
    if location_parts:
        lines.append(", ".join(location_parts))

    try:
        if sale_price and float(str(sale_price).replace(",", "") or 0) > 0:
            lines.append(f"Venta: ${float(str(sale_price).replace(',', '')):,.0f}")
    except (ValueError, TypeError):
        pass
    try:
        if rent_price and float(str(rent_price).replace(",", "") or 0) > 0:
            lines.append(f"Alquiler: ${float(str(rent_price).replace(',', '')):,.0f}/mes")
    except (ValueError, TypeError):
        pass

    details = []
    if bedrooms:
        details.append(f"{bedrooms} rec")
    if bathrooms:
        details.append(f"{bathrooms} banos")
    if area:
        details.append(f"{area} {area_unit}")
    if details:
        lines.append(" · ".join(details))

    return "\n".join(lines)


def _strip_html(text: str) -> str:
    text = html.unescape(text)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>|</div>|</li>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def build_description(prop: dict) -> str | None:
    raw = (prop.get("observations") or prop.get("description") or "").strip()
    if not raw:
        return None
    desc = _strip_html(raw)
    if not desc:
        return None
    if len(desc) > 1500:
        desc = desc[:1500] + "\n_(descripcion recortada)_"
    return desc


def extract_images(prop: dict) -> list[str]:
    galleries = prop.get("galleries", [])
    images = sorted(
        [val for gallery in galleries for val in gallery.values()
         if isinstance(val, dict) and "url_original" in val],
        key=lambda x: x.get("position", 0),
    )
    return [img["url_original"] for img in images]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("wasi_id",               help="ID de la propiedad en Wasi")
    parser.add_argument("--phone",               default="",  help="Teléfono destino (default: MY_PHONE del .env)")
    parser.add_argument("--max-images", type=int, default=10, help="Máximo de imágenes a enviar (default: 10)")
    args = parser.parse_args()

    to = args.phone or MY_PHONE
    if not to:
        sys.exit("[ERROR] Configura MY_PHONE en el .env o usa --phone +507XXXXXXXX")

    if not WASENDER_API_KEY:
        sys.exit("[ERROR] WASENDER_API_KEY no configurado en .env")

    print(f"[ficha] Obteniendo propiedad {args.wasi_id} de Wasi…")
    prop = get_propiedad(args.wasi_id)

    header      = build_header(prop)
    description = build_description(prop)
    all_images  = extract_images(prop)
    images      = all_images[:args.max_images]

    print(f"[ficha] Enviando a {to} | imagenes: {len(all_images)} (enviando {len(images)})")

    send_text(to, header)
    print("  [OK] Titulo enviado")

    if description:
        time.sleep(2)
        send_text(to, description)
        print("  [OK] Descripcion enviada")

    for i, url in enumerate(images, 1):
        time.sleep(2)
        try:
            send_image(to, url)
            print(f"  [OK] Imagen {i}/{len(images)}")
        except Exception as e:
            print(f"  [ERR] Imagen {i} fallo: {e}")

    print(f"\n[ficha] Listo. '{prop.get('title', args.wasi_id)}'")


if __name__ == "__main__":
    main()
