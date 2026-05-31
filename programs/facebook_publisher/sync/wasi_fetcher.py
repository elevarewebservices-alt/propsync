import asyncio
import os
from typing import AsyncGenerator

import httpx
from dotenv import load_dotenv

from facebook_publisher.monitoring.logger import get_logger

load_dotenv()

log = get_logger(__name__)

ID_COMPANY = os.getenv("WASI_ID_COMPANY", "")
WASI_TOKEN = os.getenv("WASI_TOKEN", "")
BASE_URL = os.getenv("WASI_BASE_URL", "https://api.wasi.co/v1")
PAGE_SIZE = int(os.getenv("FB_WASI_PAGE_SIZE", "100"))
SCOPE = int(os.getenv("FB_WASI_SCOPE", "1"))

_RETRY_STATUSES = {502, 503, 504}
_MAX_RETRIES = 3
_RETRY_DELAY = 4.0


def _auth_params() -> dict:
    return {"id_company": ID_COMPANY, "wasi_token": WASI_TOKEN}


async def fetch_all_properties() -> AsyncGenerator[dict, None]:
    """
    Paginates /property/search and yields every property dict from Wasi.
    Fetches all non-deleted properties (id_status_on_page != 4) regardless of
    internet publication status so we can track status changes.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        skip = 0
        total_fetched = 0

        while True:
            params = {
                **_auth_params(),
                "take": PAGE_SIZE,
                "skip": skip,
                "scope": SCOPE,
            }

            data = await _get_with_retry(client, f"{BASE_URL}/property/search", params)

            if not data or data.get("status") != "success":
                log.warning("wasi_unexpected_response", skip=skip, response=str(data)[:200])
                break

            count = 0
            for key, prop in data.items():
                if not key.isdigit():
                    continue
                # Skip trashed properties (id_status_on_page == 4)
                if str(prop.get("id_status_on_page", "")) == "4":
                    continue
                count += 1
                total_fetched += 1
                yield prop

            log.debug("wasi_page_fetched", skip=skip, page_count=count, total=total_fetched)

            if count < PAGE_SIZE:
                break
            skip += PAGE_SIZE

        log.info("wasi_fetch_complete", total_fetched=total_fetched)


async def _get_with_retry(client: httpx.AsyncClient, url: str, params: dict) -> dict:
    last_exc: Exception | None = None

    for attempt in range(_MAX_RETRIES):
        try:
            resp = await client.get(url, params=params)
            if resp.status_code in _RETRY_STATUSES:
                log.warning(
                    "wasi_server_error_retry",
                    status=resp.status_code,
                    attempt=attempt + 1,
                )
                await asyncio.sleep(_RETRY_DELAY)
                continue
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            last_exc = exc
            if attempt < _MAX_RETRIES - 1:
                await asyncio.sleep(_RETRY_DELAY)

    raise RuntimeError(f"Wasi API failed after {_MAX_RETRIES} attempts") from last_exc
