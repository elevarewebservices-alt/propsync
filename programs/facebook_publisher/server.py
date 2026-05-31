"""
facebook_publisher/server.py — Standalone FastAPI app for the FB Publisher module.

Start with:
    uvicorn facebook_publisher.server:app --host 0.0.0.0 --port 8001 --reload

Completely independent from the WhatsApp webhook server (app.py on port 8000).
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from facebook_publisher.db.base import init_postgres
    from facebook_publisher.monitoring.logger import get_logger
    log = get_logger("server")
    await init_postgres()
    log.info("fb_publisher_started", port=8001)
    yield
    log.info("fb_publisher_stopped")


app = FastAPI(
    title="PropSync — Facebook Publisher API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    from datetime import datetime
    return {"status": "ok", "service": "fb_publisher", "timestamp": datetime.utcnow().isoformat()}


from facebook_publisher.api.router import router as fb_router
app.include_router(fb_router, prefix="/api/fb")
