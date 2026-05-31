import os
from datetime import timedelta
from celery.schedules import crontab
from facebook_publisher.queue.celery_app import celery_app

_SYNC_HOURS = int(os.getenv("FB_SYNC_INTERVAL_HOURS", "2"))

celery_app.conf.beat_schedule = {
    "sync-wasi-properties": {
        "task": "facebook_publisher.queue.tasks.sync_task.sync_wasi",
        "schedule": timedelta(hours=_SYNC_HOURS),
        "options": {"queue": "sync"},
    },
    "reset-daily-post-counts": {
        "task": "facebook_publisher.queue.tasks.account_task.reset_daily_counts",
        "schedule": crontab(hour=0, minute=1),
        "options": {"queue": "default"},
    },
}
