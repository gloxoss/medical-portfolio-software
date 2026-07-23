from io import BytesIO

import jwt
from fastapi.testclient import TestClient

import middleware.consent_gate as consent_gate
from main import app


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    def get(self, key: str):
        return self.store.get(key)

    def setex(self, key: str, _ttl: int, value: str) -> None:
        self.store[key] = value

    def delete(self, key: str) -> None:
        self.store.pop(key, None)


def _token(patient_id: str = "pat-1", org_id: str = "org-1") -> str:
    return jwt.encode(
        {"patient_id": patient_id, "org_id": org_id, "sub": "clinician-1"},
        consent_gate.JWT_SECRET,
        algorithm="HS256",
    )


def _allow_consent(monkeypatch, fake_redis: FakeRedis) -> None:
    async def fake_fetch(_patient_id: str, _org_id: str) -> bool:
        return True

    monkeypatch.setattr(consent_gate, "fetch_consent_status_from_api", fake_fetch)
    monkeypatch.setattr(consent_gate, "redis_client", fake_redis)


def test_ambient_transcribe_returns_transcript(monkeypatch) -> None:
    fake_redis = FakeRedis()
    _allow_consent(monkeypatch, fake_redis)

    import routers.ambient as ambient_router

    async def fake_transcribe(_audio_bytes: bytes, _content_type: str | None):
        return "Patient reports mild cough.", 0.88

    monkeypatch.setattr(ambient_router, "transcribe_audio_chunk", fake_transcribe)
    monkeypatch.setattr(ambient_router, "redis_client", fake_redis)

    client = TestClient(app)

    response = client.post(
        "/ai/ambient/transcribe",
        headers={"Authorization": f"Bearer {_token()}"},
        files={"audio": ("chunk.webm", BytesIO(b"audio-data"), "audio/webm")},
        data={"encounter_id": "enc-1", "chunk_index": "1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["transcript"] == "Patient reports mild cough."
    assert body["encounter_id"] == "enc-1"


def test_ambient_session_delete_clears_state(monkeypatch) -> None:
    fake_redis = FakeRedis()
    _allow_consent(monkeypatch, fake_redis)

    import routers.ambient as ambient_router

    monkeypatch.setattr(ambient_router, "redis_client", fake_redis)

    fake_redis.setex("ambient:session:enc-5", 60, "{}")

    client = TestClient(app)
    response = client.delete(
        "/ai/ambient/session/enc-5",
        headers={"Authorization": f"Bearer {_token()}"},
    )

    assert response.status_code == 200
    assert response.json() == {"cleared": True, "encounter_id": "enc-5"}
