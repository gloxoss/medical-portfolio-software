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


def _allow_consent(monkeypatch) -> None:
    async def fake_fetch(_patient_id: str, _org_id: str) -> bool:
        return True

    monkeypatch.setattr(consent_gate, "fetch_consent_status_from_api", fake_fetch)
    monkeypatch.setattr(consent_gate, "redis_client", FakeRedis())


def test_soap_suggest_returns_stream(monkeypatch) -> None:
    _allow_consent(monkeypatch)

    import routers.soap_suggestions as soap_router

    async def fake_generate(_prompt: str) -> str:
        return "Likely viral upper respiratory infection."

    monkeypatch.setattr(soap_router, "generate_completion", fake_generate)

    client = TestClient(app)
    response = client.post(
        "/ai/soap/suggest",
        headers={"Authorization": f"Bearer {_token()}"},
        json={
            "encounter_id": "enc-1",
            "transcript_chunk": "Patient reports cough and sore throat for three days.",
            "soap_field": "assessment",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("text/event-stream")
    assert '"chunk":' in response.text


def test_soap_suggest_fallback_on_llm_error(monkeypatch) -> None:
    _allow_consent(monkeypatch)

    import routers.soap_suggestions as soap_router

    async def broken_generate(_prompt: str) -> str:
        raise RuntimeError("model unavailable")

    monkeypatch.setattr(soap_router, "generate_completion", broken_generate)

    client = TestClient(app)
    response = client.post(
        "/ai/soap/suggest",
        headers={"Authorization": f"Bearer {_token()}"},
        json={
            "encounter_id": "enc-2",
            "transcript_chunk": "Patient denies chest pain, has mild fatigue.",
            "soap_field": "assessment",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"suggestion": None, "fallback": True}
