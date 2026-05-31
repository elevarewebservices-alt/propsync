"""
api/dashboard.py — Endpoints de estadísticas para el dashboard de PropSync.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter
from db_manager import get_stats, get_recent_activity

router = APIRouter(tags=["dashboard"])


@router.get("/stats")
async def stats():
    """KPI cards: total propiedades, enviados hoy, pendientes WhatsApp, confirmados."""
    return get_stats()


@router.get("/recent")
async def recent(limit: int = 10):
    """Últimas N respuestas recibidas con datos de la propiedad."""
    return get_recent_activity(limit=limit)
