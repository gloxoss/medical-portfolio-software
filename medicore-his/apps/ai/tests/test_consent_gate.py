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

    def flushdb(self) -> None:
        self.store.clear()


def _token(patient_id: str = "pat-1", org_id: str = "org-1") -> str:
    return jwt.encode(
        {"patient_id": patient_id, "org_id": org_id, "sub": "user-1"},
        consent_gate.JWT_SECRET,
        algorithm="HS256",
    )


def test_ambient_route_without_consent_returns_403(monkeypatch) -> None:
    async def fake_fetch(patient_id: str, org_id: str) -> bool:
        return False

    monkeypatch.setattr(consent_gate, "fetch_consent_status_from_api", fake_fetch)
    fake_redis = FakeRedis()
    monkeypatch.setattr(consent_gate, "redis_client", fake_redis)

    client = TestClient(app)
    resp = client.post(
        "/ai/ambient/start",
        headers={"Authorization": f"Bearer {_token()}"},
        json={"encounter_id": "enc-1"},
    )

    assert resp.status_code == 403
    body = resp.json()
    assert body["code"] == "CONSENT_REQUIRED"


def test_ambient_route_with_consent_passes_gate(monkeypatch) -> None:
    async def fake_fetch(patient_id: str, org_id: str) -> bool:
        return True

    monkeypatch.setattr(consent_gate, "fetch_consent_status_from_api", fake_fetch)
    fake_redis = FakeRedis()
    monkeypatch.setattr(consent_gate, "redis_client", fake_redis)

    client = TestClient(app)
    resp = client.post(
        "/ai/ambient/start",
        headers={"Authorization": f"Bearer {_token()}"},
        json={"encounter_id": "enc-1"},
    )

    # Route itself is currently a T1 stub; gate pass means we reach 501 instead of 403.
    assert resp.status_code == 501


def test_revoked_event_invalidates_cache_and_blocks_within_ttl(monkeypatch) -> None:
    state = {"granted": True}

    async def fake_fetch(patient_id: str, org_id: str) -> bool:
        return state["granted"]

    monkeypatch.setattr(consent_gate, "fetch_consent_status_from_api", fake_fetch)
    fake_redis = FakeRedis()
    monkeypatch.setattr(consent_gate, "redis_client", fake_redis)

    token = _token("pat-2", "org-2")
    client = TestClient(app)

    first = client.post(
        "/ai/ambient/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"encounter_id": "enc-2"},
    )
    assert first.status_code == 501

    # Remote consent flips to revoked, but cache still says granted.
    state["granted"] = False

    second = client.post(
        "/ai/ambient/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"encounter_id": "enc-2"},
    )
    assert second.status_code == 501

    consent_gate.process_consent_revocation_event({"patient_id": "pat-2", "org_id": "org-2"})

    third = client.post(
        "/ai/ambient/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"encounter_id": "enc-2"},
    )
    assert third.status_code == 403
