"""
api/campaigns.py — Endpoints para gestionar campañas de WhatsApp.
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from db_manager import get_campaigns, get_queue

log = logging.getLogger(__name__)
router = APIRouter(tags=["campaigns"])

SENDER_SCRIPT = Path(__file__).parent.parent / "sender.py"

# Registro en memoria del proceso de sender activo
_sender_process: Optional[subprocess.Popen] = None


class StartCampaignRequest(BaseModel):
    csv_path: Optional[str] = None
    limit: int = -1
    skip_import: bool = False
    dry_run: bool = False


@router.get("")
async def list_campaigns(limit: int = 50):
    """Lista campañas enviadas con datos de la propiedad."""
    return get_campaigns(limit=limit)


@router.get("/queue")
async def queue(limit: int = 50):
    """Propiedades pendientes en cola (enviadas pero sin respuesta aún)."""
    return get_queue(limit=limit)


@router.get("/status")
async def status():
    """Estado actual del proceso sender.py."""
    global _sender_process
    if _sender_process is None:
        return {"running": False, "pid": None}

    poll = _sender_process.poll()
    if poll is not None:
        _sender_process = None
        return {"running": False, "pid": None, "exit_code": poll}

    return {"running": True, "pid": _sender_process.pid}


@router.post("/start")
async def start_campaign(body: StartCampaignRequest):
    """
    Lanza sender.py en background.
    Si skip_import=True usa los datos ya importados en SQLite.
    """
    global _sender_process

    if _sender_process and _sender_process.poll() is None:
        raise HTTPException(status_code=409, detail="Una campaña ya está en curso.")

    args = [sys.executable, str(SENDER_SCRIPT)]

    if body.skip_import:
        args.append("--skip-import")
    elif body.csv_path:
        args += ["--csv", body.csv_path]
    else:
        raise HTTPException(status_code=400, detail="Provee csv_path o usa skip_import=true.")

    if body.limit != 0:
        args += ["--limit", str(body.limit)]
    if body.dry_run:
        args.append("--dry-run")

    try:
        _sender_process = subprocess.Popen(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(SENDER_SCRIPT.parent),
        )
        log.info("Sender lanzado (PID %s)", _sender_process.pid)
        return JSONResponse({"status": "started", "pid": _sender_process.pid})
    except Exception as e:
        log.error("Error lanzando sender: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_campaign():
    """Detiene el proceso sender.py activo."""
    global _sender_process

    if _sender_process is None or _sender_process.poll() is not None:
        _sender_process = None
        return JSONResponse({"status": "not_running"})

    _sender_process.terminate()
    log.info("Sender detenido (PID %s)", _sender_process.pid)
    pid = _sender_process.pid
    _sender_process = None
    return JSONResponse({"status": "stopped", "pid": pid})
