import io
import json
import os
from typing import Tuple

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from middleware.rate_limit import redis_client

router = APIRouter(prefix="/ai/ambient", tags=["ambient"])

MAX_AUDIO_BYTES = 5 * 1024 * 1024
SESSION_TTL_SECONDS = 3600


async def transcribe_audio_chunk(audio_bytes: bytes, content_type: str | None) -> Tuple[str, float]:
    provider = os.getenv("TRANSCRIPTION_PROVIDER", "openai").lower()

    if provider == "openai":
        api_key = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY"))
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Transcription provider is not configured",
            )

        from openai import AsyncOpenAI

        model = os.getenv("TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe")
        client = AsyncOpenAI(api_key=api_key)

        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = "chunk.webm"

        transcript = await client.audio.transcriptions.create(
            model=model,
            file=file_obj,
        )

        text = (getattr(transcript, "text", "") or "").strip()
        if not text:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Transcription provider returned empty output",
            )

        return text, 0.9

    if provider == "local":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local transcription provider is not configured",
        )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Unsupported transcription provider",
    )


@router.post("/transcribe")
async def transcribe(
    encounter_id: str = Form(...),
    chunk_index: int = Form(0),
    audio: UploadFile = File(...),
):
    audio_bytes = await audio.read()

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Audio chunk is empty")

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Audio chunk exceeds 5MB")

    transcript, confidence = await transcribe_audio_chunk(audio_bytes, audio.content_type)

    redis_client.setex(
        f"ambient:session:{encounter_id}",
        SESSION_TTL_SECONDS,
        json.dumps({"chunk_index": chunk_index, "duration_ms": 0}),
    )

    return {
        "transcript": transcript,
        "confidence": confidence,
        "encounter_id": encounter_id,
    }


@router.delete("/session/{encounter_id}")
async def clear_session(encounter_id: str):
    redis_client.delete(f"ambient:session:{encounter_id}")
    return {"cleared": True, "encounter_id": encounter_id}
