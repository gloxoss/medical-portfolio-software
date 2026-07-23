from fastapi.testclient import TestClient

from main import app


def test_health_returns_status_version_uptime() -> None:
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()

    assert body["status"] == "ok"
    assert isinstance(body["version"], str)
    assert isinstance(body["uptime"], float)
    assert body["uptime"] >= 0.0
