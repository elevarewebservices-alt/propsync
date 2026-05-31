"""
api/responses.py — Endpoints para consultar respuestas de WhatsApp y lanzar el processor.
"""

import sys
import subprocess
import logging
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from db_manager import get_responses, get_summary

log = logging.getLogger(__name__)
router = APIRouter(tags=["responses"])

PROCESSOR_SCRIPT = Path(__file__).parent.parent / "processor.py"


@router.get("")
async def list_responses(tipo: Optional[str] = None, limit: int = 100):
    """
    Lista respuestas de WhatsApp con datos del propietario y la propiedad.
    tipo puede ser: Confirmado | Inactivo | Manual | SinID
    """
    return get_responses(tipo=tipo, limit=limit)


@router.get("/summary")
async def responses_summary():
    """Conteo de propiedades por estado_verificacion."""
    return get_summary()


@router.post("/process")
async def process_responses(dry_run: bool = False):
    """
    Lanza processor.py para ejecutar acciones en Wasi según las respuestas recibidas.
    Retorna inmediatamente; el procesamiento corre en background.
    """
    args = [sys.executable, str(PROCESSOR_SCRIPT)]
    if dry_run:
        args.append("--dry-run")

    try:
        proc = subprocess.Popen(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(PROCESSOR_SCRIPT.parent),
        )
        log.info("Processor lanzado (PID %s, dry_run=%s)", proc.pid, dry_run)
        return JSONResponse({"status": "started", "pid": proc.pid, "dry_run": dry_run})
    except Exception as e:
        log.error("Error lanzando processor: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
