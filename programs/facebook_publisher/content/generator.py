import hashlib
import json
import os
import random
from typing import Optional

from dotenv import load_dotenv

from facebook_publisher.content.templates import SYSTEM_PROMPT, build_prompt
from facebook_publisher.monitoring.logger import get_logger

load_dotenv()

log = get_logger(__name__)

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "800"))
TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
MOCK_AI = os.getenv("FB_MOCK_AI", "false").lower() == "true"


def compute_generation_hash(prop: dict) -> str:
    """Hash of the input fields used for generation — skip re-generation if unchanged."""
    key = {
        "name": prop.get("name"),
        "operation_type": prop.get("operation_type"),
        "sale_price": prop.get("sale_price"),
        "rent_price": prop.get("rent_price"),
        "zone": prop.get("zone"),
        "bedrooms": prop.get("bedrooms"),
        "bathrooms": prop.get("bathrooms"),
        "area": prop.get("area"),
    }
    return hashlib.md5(json.dumps(key, sort_keys=True, default=str).encode()).hexdigest()


async def generate_for_property(prop: dict) -> dict:
    """
    Generate content variants for a property.
    Returns a dict matching the OpenAI output schema.
    Uses mock data when FB_MOCK_AI=true (free, for development).
    """
    if MOCK_AI:
        log.debug("using_mock_ai", wasi_id=prop.get("wasi_id"))
        return _mock_generate(prop)

    try:
        return await _call_openai(prop)
    except Exception as exc:
        log.error("openai_generation_failed", wasi_id=prop.get("wasi_id"), error=str(exc))
        log.info("falling_back_to_mock", wasi_id=prop.get("wasi_id"))
        return _mock_generate(prop)


async def _call_openai(prop: dict) -> dict:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    prompt = build_prompt(prop)

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        max_tokens=MAX_TOKENS,
        temperature=TEMPERATURE,
    )

    content = response.choices[0].message.content
    result = json.loads(content)
    result["_tokens_used"] = response.usage.total_tokens if response.usage else None
    return result


def _mock_generate(prop: dict) -> dict:
    name = prop.get("name") or "Propiedad"
    zone = prop.get("zone") or "Panamá"
    op = prop.get("operation_type") or "Venta"
    price = prop.get("sale_price") or prop.get("rent_price") or 0
    price_str = f"${price:,.0f}" if price else "Precio a consultar"
    price_suffix = "/mes" if "alquiler" in op.lower() else ""

    title_variants = [
        f"{name} en {zone}",
        f"Excelente {name} en {zone} – {op}",
        f"{name} disponible en {zone} | {price_str}{price_suffix}",
    ]
    random.shuffle(title_variants)

    return {
        "title_v1": title_variants[0][:100],
        "title_v2": title_variants[1][:100],
        "title_v3": title_variants[2][:100],
        "description_v1": (
            f"Hermosa propiedad ubicada en {zone}. "
            f"Ideal para {('vivir' if 'alquiler' in op.lower() else 'inversión')}. "
            "Contáctenos para más información."
        ),
        "description_v2": (
            f"Excelente oportunidad en {zone}. "
            f"Propiedad en {op.lower()} con precio especial. "
            "No pierdas esta oportunidad."
        ),
        "marketplace_copy": (
            f"🏠 {name}\n"
            f"📍 {zone}\n"
            f"💰 {price_str}{price_suffix}\n"
            f"✅ {op}\n"
            "📲 Escríbenos por WhatsApp para coordinar visita"
        ),
        "hashtags": [
            "Panama",
            "BienesRaices",
            "InmobiliariaPanama",
            zone.replace(" ", ""),
            f"PropiedadesEn{zone.replace(' ', '')}",
        ],
        "cta": "Escríbenos por WhatsApp para coordinar tu visita y recibir más información.",
        "_tokens_used": 0,
    }
