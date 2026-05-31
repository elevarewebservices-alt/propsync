# Facebook Publisher — Setup Guide

## Prerequisites
- Python 3.11+
- Docker Desktop (for PostgreSQL + Redis)

---

## 1. Install dependencies

```bash
cd programs
pip install -r requirements.txt
playwright install chromium
playwright install-deps chromium   # Linux only
```

---

## 2. Start local services (PostgreSQL + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d
```

Verify:
```bash
docker compose -f docker-compose.dev.yml ps
```

---

## 3. Configure .env

The `.env` file already has dev defaults. Check these keys before running:

| Key | Dev default | Notes |
|---|---|---|
| `FB_POSTGRES_DSN` | `postgresql+asyncpg://postgres:devpassword@localhost:5432/fb_publisher` | Matches docker-compose |
| `FB_MOCK_AI` | `true` | No OpenAI costs during dev |
| `WASI_TOKEN` | `...` | **Must be real** for sync to work |
| `WASI_ID_COMPANY` | `2946576` | Already set |
| `OPENAI_API_KEY` | `sk-...` | Only needed when `FB_MOCK_AI=false` |

Generate a session encryption key:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Paste the output into `FB_SESSION_ENCRYPTION_KEY` in `.env`.

---

## 4. Start the FB Publisher server

```bash
uvicorn facebook_publisher.server:app --host 0.0.0.0 --port 8001 --reload
```

The server creates all database tables on startup automatically.

Health check: http://localhost:8001/health

API docs: http://localhost:8001/docs

---

## 5. Start Celery worker + beat (in separate terminals)

```bash
# Worker (processes tasks)
celery -A facebook_publisher.queue.celery_app worker \
  --loglevel=info \
  --queues=sync,content,default \
  --concurrency=2

# Beat (fires scheduled tasks)
celery -A facebook_publisher.queue.beat_schedule beat \
  --loglevel=info
```

---

## 6. Trigger a manual sync (test)

```bash
celery -A facebook_publisher.queue.celery_app call \
  facebook_publisher.queue.tasks.sync_task.sync_wasi
```

Or via the API after a sync has run:
```bash
curl http://localhost:8001/api/fb/metrics
```

---

## 7. Seed a Facebook account (required before approving queue items)

```bash
curl -X POST http://localhost:8001/api/fb/accounts \
  -H "Content-Type: application/json" \
  -d '{"fb_email": "tu_cuenta@facebook.com", "fb_name": "Mi Cuenta", "daily_limit": 5}'
```

---

## 8. End-to-end approval flow (Phase 2 test)

1. Wait for sync to run (or trigger manually as above)
2. Content is auto-generated for new properties (`FB_MOCK_AI=true` = instant, free)
3. Check the approval queue:
   ```bash
   curl "http://localhost:8001/api/fb/queue?status=pending_approval"
   ```
4. Approve an item:
   ```bash
   curl -X POST http://localhost:8001/api/fb/queue/1/approve \
     -H "Content-Type: application/json" \
     -d '{"approved_by": "tu@email.com"}'
   ```
5. Check queue status:
   ```bash
   curl "http://localhost:8001/api/fb/queue?status=approved"
   ```

---

## WhatsApp server (existing, unchanged)

The existing WhatsApp system continues running independently on port 8000:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

---

## Phase 3 — When ready for Playwright

Phase 3 adds `publisher/marketplace.py` (the actual browser automation).
Until then, approving a queue item sets status to `approved` but no publish fires.
The `_dispatch_publish_task` in `queue_endpoints.py` gracefully handles the
missing `publish_task` module without errors.
