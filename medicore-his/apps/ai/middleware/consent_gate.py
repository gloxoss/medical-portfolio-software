import os
from typing import Any

import httpx
import jwt
from fastapi import status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from middleware.rate_limit import redis_client

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-for-dev")
INTERNAL_API_URL = os.getenv("API_URL", "http://localhost:3001/internal")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")
CONSENT_CACHE_TTL_SECONDS = 60
CONSENT_TYPE = "ai_ambient_audio"


def is_protected_ai_route(path: str) -> bool:
    if path.startswith("/ai/ambient/"):
        return True
    return path == "/ai/soap/suggest"


def consent_cache_key(org_id: str, patient_id: str, consent_type: str = CONSENT_TYPE) -> str:
    return f"consent_cache:{org_id}:{patient_id}:{consent_type}"


def parse_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ", maxsplit=1)[1]


def decode_claims(token: str) -> dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


def extract_patient_and_org(claims: dict[str, Any]) -> tuple[str | None, str | None]:
    patient_id = claims.get("patient_id") or claims.get("patientId")
    org_id = claims.get("org_id") or claims.get("orgId")
    return patient_id, org_id


async def fetch_consent_status_from_api(patient_id: str, org_id: str) -> bool:
    if not INTERNAL_SERVICE_TOKEN:
        return False

    url = f"{INTERNAL_API_URL}/patients/{patient_id}/consent"
    params = {"type": CONSENT_TYPE, "org_id": org_id}
    headers = {"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers, timeout=5.0)

    if response.status_code != 200:
        return False

    body = response.json()
    return body.get("granted") is True


async def get_consent_status(patient_id: str, org_id: str) -> bool:
    key = consent_cache_key(org_id, patient_id)

    try:
        cached = redis_client.get(key)
    except Exception:
        cached = None

    if cached is not None:
        return cached == "1"

    granted = await fetch_consent_status_from_api(patient_id, org_id)

    try:
        redis_client.setex(key, CONSENT_CACHE_TTL_SECONDS, "1" if granted else "0")
    except Exception:
        pass

    return granted


def process_consent_revocation_event(payload: dict[str, Any]) -> None:
    patient_id = payload.get("patient_id") or payload.get("patientId")
    org_id = payload.get("org_id") or payload.get("orgId")

    if not patient_id or not org_id:
        return

    try:
        redis_client.delete(consent_cache_key(org_id, patient_id))
    except Exception:
        return


class ConsentGateMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or not is_protected_ai_route(request.url.path):
            return await call_next(request)

        token = parse_bearer_token(request)
        if not token:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"code": "UNAUTHORIZED", "message": "Missing bearer token"},
            )

        try:
            claims = decode_claims(token)
        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"code": "UNAUTHORIZED", "message": "Token has expired"},
            )
        except jwt.InvalidTokenError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"code": "UNAUTHORIZED", "message": "Invalid token"},
            )

        patient_id, org_id = extract_patient_and_org(claims)
        if not patient_id:
            patient_id = request.headers.get("X-Patient-Id")
        if not org_id:
            org_id = request.headers.get("X-Org-Id")

        if not patient_id or not org_id:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "code": "CONSENT_REQUIRED",
                    "message": "Patient has not consented to AI processing",
                },
            )

        granted = await get_consent_status(patient_id, org_id)
        if not granted:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "code": "CONSENT_REQUIRED",
                    "message": "Patient has not consented to AI processing",
                },
            )

        return await call_next(request)
