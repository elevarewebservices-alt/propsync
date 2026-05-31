"""
app.py — Servidor FastAPI que recibe webhooks de WASender y actualiza SQLite.

Arrancar:
    uvicorn app:app --host 0.0.0.0 --port 8000

Exponer con ngrok (desarrollo):
    ngrok http 8000
    → Configurar la URL en WASender: https://<tu-subdominio>.ngrok.io/webhook
"""

import json
import os
import re
import logging
import threading
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db_manager import init_db, update_verification
from api.dashboard import router as dashboard_router
from api.responses import router as responses_router
from api.campaigns import router as campaigns_router
from api.properties import router as properties_router

load_dotenv()

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")  # opcional pero recomendado

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

app = FastAPI(title="PropSync — API Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router, prefix="/api/dashboard")
app.include_router(responses_router, prefix="/api/responses")
app.include_router(campaigns_router, prefix="/api/campaigns")
app.include_router(properties_router, prefix="/api/properties")


# ── Regex para extraer el wasi_id del cuerpo del mensaje ───────────────────────
WASI_ID_RE = re.compile(r"\(ID:\s*([A-Za-z0-9_\-]+)\)")


def run_processor():
    try:
        result = subprocess.run(
            [sys.executable, str(Path(__file__).parent / "processor.py")],
            capture_output=True, text=True, timeout=300,
        )
        log.info("Processor output: %s", result.stdout.strip()[:300])
        if result.returncode != 0:
            log.error("Processor error: %s", result.stderr.strip()[:300])
    except Exception as e:
        log.error("Error corriendo processor: %s", e)

# IDs de botón que WASender devuelve en la respuesta
BUTTON_SI  = {"si_disponible", "sí disponible", "sí, disponible"}
BUTTON_NO  = {"no_disponible", "no, ya no", "no ya no"}


def extract_wasi_id(text: str) -> str | None:
    m = WASI_ID_RE.search(text or "")
    return m.group(1) if m else None


def classify_response(payload: dict) -> tuple[str, str | None]:
    """
    Determina el tipo de respuesta y el texto relevante.
    Retorna (tipo, texto): tipo ∈ {'Confirmado', 'Inactivo', 'Manual'}
    """
    # Respuesta de botón interactivo
    btn_id    = (payload.get("buttonId")    or payload.get("button_id")    or "").lower().strip()
    btn_title = (payload.get("buttonTitle") or payload.get("button_title") or "").lower().strip()
    identifier = btn_id or btn_title

    if identifier in BUTTON_SI or any(k in identifier for k in ("si_", "sí_", "disponible")):
        return "Confirmado", None
    if identifier in BUTTON_NO or any(k in identifier for k in ("no_", "ya no")):
        return "Inactivo", None

    # Respuesta de texto libre
    text = (payload.get("body") or payload.get("message") or payload.get("text") or "").strip()
    if text:
        if text.upper().strip() == "STOP":
            return "OptOut", None
        return "Manual", text

    return "Manual", json.dumps(payload)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    init_db()
    log.info("Base de datos inicializada.")


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/webhook")
async def receive_webhook(
    request: Request,
    x_wasender_signature: str = Header(default=None),
):
    raw_body = await request.body()

    # Validación opcional de firma HMAC
    if WEBHOOK_SECRET:
        import hmac
        import hashlib
        expected = "sha256=" + hmac.new(
            WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, x_wasender_signature or ""):
            log.warning("Firma de webhook inválida.")
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        data = json.loads(raw_body)
    except json.JSONDecodeError:
        log.error("Payload no es JSON válido.")
        raise HTTPException(status_code=400, detail="Invalid JSON")

    log.info("Webhook recibido: %s", json.dumps(data)[:300])

    event  = data.get("event") or data.get("type") or ""
    nested = data.get("data", {})

    # ── Rama 1: resultado de poll (poll.results) ───────────────────────────────
    if event == "poll.results":
        poll_msg     = nested.get("pollMsg", {})
        creation     = poll_msg.get("pollCreationMessageV3", {})
        poll_name    = creation.get("name", "")
        poll_results = nested.get("pollResult", [])

        wasi_id = extract_wasi_id(poll_name)
        if not wasi_id:
            log.warning("poll.results sin wasi_id: %s", poll_name)
            _store_unmatched("", poll_name, json.dumps(data))
            return JSONResponse({"status": "no_wasi_id"})

        # Opción ganadora = la que tiene voters no vacío
        selected_option = ""
        telefono = ""
        for opt in poll_results:
            if opt.get("voters"):
                selected_option = opt.get("name", "")
                raw_voter = opt["voters"][0].replace("@s.whatsapp.net", "")
                telefono = f"+{raw_voter}" if not raw_voter.startswith("+") else raw_voter
                break

        log.info("poll.results | wasi_id=%s | opcion=%s | tel=%s", wasi_id, selected_option, telefono)

        combined = {"buttonId": selected_option, "body": selected_option}
        tipo, texto = classify_response(combined)
        campaign_id = _get_latest_campaign_id(wasi_id)
        update_verification(wasi_id=wasi_id, estado=tipo, campaign_id=campaign_id,
                            mensaje_texto=texto, payload_raw=json.dumps(data), telefono=telefono)
        threading.Thread(target=run_processor, daemon=True).start()
        return JSONResponse({"status": "processed", "wasi_id": wasi_id, "tipo": tipo})

    # ── Rama 2: mensaje de texto entrante (messages.received) ─────────────────
    msg_obj = nested.get("messages") or nested.get("message") or {}

    # Ignorar mensajes propios
    if msg_obj.get("key", {}).get("fromMe"):
        return JSONResponse({"status": "ignored", "reason": "fromMe"})

    if event and "incoming" not in event.lower() and "received" not in event.lower():
        return JSONResponse({"status": "ignored", "event": event})

    key        = msg_obj.get("key", {})
    sender_pn  = key.get("cleanedSenderPn") or key.get("senderPn", "").replace("@s.whatsapp.net", "")
    telefono   = f"+{sender_pn}" if sender_pn and not sender_pn.startswith("+") else sender_pn
    msg_content = msg_obj.get("message") or {}
    msg_body    = (
        msg_content.get("conversation") or
        msg_content.get("extendedTextMessage", {}).get("text") or
        msg_obj.get("messageBody") or ""
    )

    wasi_id = extract_wasi_id(msg_body)
    log.info("messages.received | tel=%s | body=%s | wasi_id=%s", telefono, msg_body[:80], wasi_id)

    if not wasi_id:
        _store_unmatched(telefono, msg_body, json.dumps(data))
        return JSONResponse({"status": "no_wasi_id", "phone": telefono})

    tipo, texto = classify_response({"body": msg_body})
    log.info("wasi_id=%s | tipo=%s | tel=%s", wasi_id, tipo, telefono)

    # Buscar la campaña más reciente para ese wasi_id
    campaign_id = _get_latest_campaign_id(wasi_id)

    update_verification(
        wasi_id=wasi_id,
        estado=tipo,
        campaign_id=campaign_id,
        mensaje_texto=texto,
        payload_raw=json.dumps(data),
        telefono=telefono,
    )
    threading.Thread(target=run_processor, daemon=True).start()

    return JSONResponse({"status": "processed", "wasi_id": wasi_id, "tipo": tipo})


# ── Helpers internos ───────────────────────────────────────────────────────────

def _get_latest_campaign_id(wasi_id: str) -> int | None:
    from db_manager import get_conn
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM campaigns WHERE wasi_id = ? ORDER BY id DESC LIMIT 1",
            (wasi_id,),
        ).fetchone()
    return row["id"] if row else None


def _store_unmatched(telefono: str, body: str, payload_raw: str):
    """Guarda mensajes sin wasi_id en responses para revisión."""
    from db_manager import get_conn
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO responses
               (wasi_id, telefono, tipo_respuesta, payload_raw, mensaje_texto)
               VALUES (NULL, ?, 'SinID', ?, ?)""",
            (telefono, payload_raw, body),
        )


# ── Endpoint de resumen (útil para revisar estado) ─────────────────────────────
@app.get("/summary")
async def summary():
    from db_manager import get_summary
    return get_summary()
