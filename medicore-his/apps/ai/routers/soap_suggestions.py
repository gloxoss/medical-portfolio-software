import json
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from services.llm_service import generate_completion

router = APIRouter(prefix="/ai/soap", tags=["soap-suggestions"])


class SoapSuggestionRequest(BaseModel):
    encounter_id: str
    transcript_chunk: str
    soap_field: str


def _build_prompt(payload: SoapSuggestionRequest) -> str:
    field = payload.soap_field.strip().lower()
    transcript = payload.transcript_chunk.strip()
    return (
        "You are a clinical SOAP writing assistant. "
        f"Generate concise content only for the '{field}' field. "
        "Keep medical tone, avoid hallucinations, and do not include markdown.\n\n"
        f"Encounter ID: {payload.encounter_id}\n"
        f"Transcript:\n{transcript}\n"
    )


async def _stream_chunks(suggestion: str) -> AsyncGenerator[str, None]:
    words = suggestion.split()
    if not words:
        yield "data: {}\n\n"
        return

    for word in words:
        chunk = json.dumps({"chunk": f"{word} "})
        yield f"data: {chunk}\n\n"

    done = json.dumps({"done": True})
    yield f"data: {done}\n\n"


@router.post("/suggest")
async def suggest_soap(payload: SoapSuggestionRequest):
    prompt = _build_prompt(payload)

    try:
        suggestion = await generate_completion(prompt)
    except Exception:
        return JSONResponse(
            status_code=200,
            content={"suggestion": None, "fallback": True},
        )

    return StreamingResponse(
        _stream_chunks(suggestion),
        media_type="text/event-stream",
    )
