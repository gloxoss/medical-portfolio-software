import os
import time

from fastapi import APIRouter

router = APIRouter(tags=["health"])

STARTED_AT = time.time()
VERSION = os.getenv("AI_SIDECAR_VERSION", "1.0.0")


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "version": VERSION,
        "uptime": max(0.0, time.time() - STARTED_AT),
    }
