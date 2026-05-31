SYSTEM_PROMPT = """Eres un experto en marketing inmobiliario en Panamá.
Escribes en español panameño natural, cálido y profesional.
Nunca uses jerga genérica. Resalta la ubicación y el valor real de la propiedad.
Responde SIEMPRE con JSON válido, sin texto extra."""

OUTPUT_SCHEMA = """{
  "title_v1": "string (máximo 100 caracteres)",
  "title_v2": "string (máximo 100 caracteres)",
  "title_v3": "string (máximo 100 caracteres)",
  "description_v1": "string (máximo 500 caracteres)",
  "description_v2": "string (máximo 500 caracteres)",
  "marketplace_copy": "string (máximo 300 caracteres, formato para Facebook Marketplace: emojis + bullet points + precio + CTA)",
  "hashtags": ["array de 5 a 8 hashtags relevantes, sin #"],
  "cta": "string (una sola frase de llamada a la acción con WhatsApp)"
}"""

_VENTA_TEMPLATE = """\
Genera contenido de marketing para esta propiedad en venta en Panamá.

Detalles:
- Nombre: {name}
- Tipo: {property_type}
- Zona: {zone}, {city}
- Precio: ${sale_price:,.0f}
- Habitaciones: {bedrooms}
- Baños: {bathrooms}
- Área: {area} m²
- Descripción original: {description}

Instrucciones:
- Los títulos deben destacar la zona y ser específicos (no genéricos como "Hermosa casa").
- El marketplace_copy debe tener emojis, precio visible, ubicación y WhatsApp CTA.
- Los hashtags deben incluir la zona, tipo de propiedad y #Panama.
- El CTA debe invitar a escribir por WhatsApp para coordinar visita.

Responde con este JSON exacto:
{schema}"""

_ALQUILER_TEMPLATE = """\
Genera contenido de marketing para esta propiedad en alquiler en Panamá.

Detalles:
- Nombre: {name}
- Tipo: {property_type}
- Zona: {zone}, {city}
- Precio mensual: ${rent_price:,.0f}/mes
- Habitaciones: {bedrooms}
- Baños: {bathrooms}
- Área: {area} m²
- Descripción original: {description}

Instrucciones:
- Enfatiza la practicidad para vivir o trabajar en la zona.
- El marketplace_copy debe mencionar precio mensual, zona y disponibilidad inmediata.
- Los hashtags deben incluir #AlquilerPanama y la zona.
- El CTA debe invitar a escribir por WhatsApp para agendar visita.

Responde con este JSON exacto:
{schema}"""


def build_prompt(prop: dict) -> str:
    operation = (prop.get("operation_type") or "").lower()
    template = _ALQUILER_TEMPLATE if "alquiler" in operation else _VENTA_TEMPLATE

    return template.format(
        name=prop.get("name") or "Propiedad",
        property_type=prop.get("property_type") or "Propiedad",
        zone=prop.get("zone") or "Panamá",
        city=prop.get("city") or "Panamá",
        sale_price=float(prop.get("sale_price") or 0),
        rent_price=float(prop.get("rent_price") or 0),
        bedrooms=prop.get("bedrooms") or "N/D",
        bathrooms=prop.get("bathrooms") or "N/D",
        area=prop.get("area") or "N/D",
        description=(prop.get("description") or "")[:300],
        schema=OUTPUT_SCHEMA,
    )
