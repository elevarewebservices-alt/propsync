from fastapi import APIRouter

from facebook_publisher.api import metrics_endpoints
from facebook_publisher.api import queue_endpoints
from facebook_publisher.api import history_endpoints
from facebook_publisher.api import accounts_endpoints

router = APIRouter()

router.include_router(metrics_endpoints.router, prefix="/metrics", tags=["metrics"])
router.include_router(queue_endpoints.router, prefix="/queue", tags=["queue"])
router.include_router(history_endpoints.router, prefix="/history", tags=["history"])
router.include_router(accounts_endpoints.router, prefix="/accounts", tags=["accounts"])
