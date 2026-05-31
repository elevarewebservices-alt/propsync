import os, time, requests
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

creds = {"id_company": os.getenv("WASI_ID_COMPANY"), "wasi_token": os.getenv("WASI_TOKEN")}
BASE  = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")
DESDE = datetime(2026, 5, 1)
ISABEL = "232699"

skip, take, total = 0, 100, None
count = 0
props = []

while True:
    r = requests.get(f"{BASE}/property/search",
                     params={**creds, "skip": skip, "take": take, "scope": 3}, timeout=30)
    data = r.json()
    if total is None:
        total = int(data.get("total", 0))
        print(f"Total Wasi: {total}", flush=True)
    batch = [v for k, v in data.items() if k.isdigit()]
    if not batch:
        break
    for p in batch:
        if str(p.get("id_user", "")) == ISABEL:
            continue
        if str(p.get("id_status_on_page", "1")) == "2":
            continue
        try:
            dt = datetime.strptime((p.get("created_at") or "")[:10], "%Y-%m-%d")
        except Exception:
            continue
        if dt < DESDE:
            continue
        avail = p.get("id_availability") == "1"
        feat  = bool(p.get("featured")) or str(p.get("id_status_on_page", "1")) == "3"
        if avail or feat:
            count += 1
            props.append({"id": str(p["id_property"]), "created_at": (p.get("created_at") or "")[:10], "titulo": (p.get("title") or "")[:50]})
    if skip + take >= total:
        break
    skip += take
    time.sleep(0.3)

print(f"\nPropiedades creadas desde mayo 2026 (disponibles/destacadas, sin Isabel): {count}")
for p in props:
    print(f"  {p['created_at']}  {p['id']}  {p['titulo']}")
