import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

celery_app = Celery(
    "fb_publisher",
    broker=os.getenv("FB_CELERY_BROKER_URL", "redis://localhost:6379/1"),
    backend=os.getenv("FB_CELERY_RESULT_BACKEND", "redis://localhost:6379/2"),
    include=[
        "facebook_publisher.queue.tasks.sync_task",
        "facebook_publisher.queue.tasks.content_task",
        "facebook_publisher.queue.tasks.account_task",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Panama",
    enable_utc=True,
    result_expires=3600,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Prevent a single crashing task from leaking browser processes
    worker_max_tasks_per_child=50,
    task_routes={
        "facebook_publisher.queue.tasks.sync_task.*": {"queue": "sync"},
        "facebook_publisher.queue.tasks.content_task.*": {"queue": "content"},
        "facebook_publisher.queue.tasks.account_task.*": {"queue": "default"},
    },
)
