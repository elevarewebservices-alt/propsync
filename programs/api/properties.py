"""
api/properties.py — Endpoints para consultar y operar propiedades en Wasi CRM.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

log = logging.getLogger(__name__)
router = APIRouter(tags=["properties"])


def _get_client():
    from wasi_tools.wasi_client import (
        get_propiedad, update_propiedad,
        duplicar_y_archivar, inactivar,
        marcar_vendida, marcar_alquilada, enviar_basurero,
    )
    return {
        "get": get_propiedad,
        "update": update_propiedad,
        "duplicate": duplicar_y_archivar,
        "inactivate": inactivar,
        "sell": marcar_vendida,
        "rent": marcar_alquilada,
        "trash": enviar_basurero,
    }


class ActionRequest(BaseModel):
    comentario: Optional[str] = ""


@router.get("")
async def list_properties(page: int = 1, limit: int = 50, tipo: Optional[str] = None):
    """
    Lista propiedades desde Wasi CRM.
    Parámetros: page, limit, tipo (Venta | Alquiler).
    """
    import httpx
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")

    base = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")
    token = os.getenv("WASI_TOKEN", "")
    company = os.getenv("WASI_ID_COMPANY", "")

    params = {
        "wasi_token": token,
        "id_company": company,
        "id_status_on_page": 1,
        "order_by": "updated_at",
        "order_type": "desc",
        "count": limit,
        "start": (page - 1) * limit,
    }
    if tipo:
        params["operation_type"] = tipo

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(f"{base}/property/list", json=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        log.error("Error listando propiedades: %s", e)
        raise HTTPException(status_code=502, detail=f"Error conectando con Wasi: {e}")

    return data


@router.get("/{property_id}")
async def get_property(property_id: str):
    """Obtiene una propiedad por su ID de Wasi."""
    try:
        client = _get_client()
        return client["get"](property_id)
    except Exception as e:
        log.error("Error obteniendo propiedad %s: %s", property_id, e)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/{property_id}/duplicate")
async def duplicate_property(property_id: str, body: ActionRequest):
    """Duplica la propiedad y archiva la original en Wasi."""
    try:
        client = _get_client()
        new_id = client["duplicate"](property_id, body.comentario or "Duplicada desde PropSync")
        return JSONResponse({"status": "ok", "new_property_id": new_id})
    except Exception as e:
        log.error("Error duplicando %s: %s", property_id, e)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/{property_id}/inactivate")
async def inactivate_property(property_id: str, body: ActionRequest):
    """Inactiva la propiedad en Wasi."""
    try:
        client = _get_client()
        client["inactivate"](property_id, body.comentario or "Inactivada desde PropSync")
        return JSONResponse({"status": "ok"})
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/{property_id}/sell")
async def sell_property(property_id: str, body: ActionRequest):
    """Marca la propiedad como vendida en Wasi."""
    try:
        client = _get_client()
        client["sell"](property_id, body.comentario or "Marcada vendida desde PropSync")
        return JSONResponse({"status": "ok"})
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/{property_id}/rent")
async def rent_property(property_id: str, body: ActionRequest):
    """Marca la propiedad como alquilada en Wasi."""
    try:
        client = _get_client()
        client["rent"](property_id, body.comentario or "Marcada alquilada desde PropSync")
        return JSONResponse({"status": "ok"})
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/{property_id}/trash")
async def trash_property(property_id: str, body: ActionRequest):
    """Envía la propiedad al basurero en Wasi."""
    try:
        client = _get_client()
        client["trash"](property_id, body.comentario or "Enviada al basurero desde PropSync")
        return JSONResponse({"status": "ok"})
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
