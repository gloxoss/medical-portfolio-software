from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_openapi_contains_all_ai_spec_routes() -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200

    paths = response.json().get("paths", {})
    expected_paths = {
        "/ai/copilot/summary",
        "/ai/copilot/differentials",
        "/ai/copilot/investigations",
        "/ai/ambient/start",
        "/ai/ambient/{sessionId}/stop",
        "/ai/optimize/schedule",
        "/ai/population/risk-scores",
        "/ai/trends/{patientId}",
    }

    missing = expected_paths.difference(paths.keys())
    assert not missing, f"Missing AI routes in sidecar surface: {sorted(missing)}"


def test_stubbed_ai_routes_return_not_implemented() -> None:
    checks = [
        ("post", "/ai/copilot/differentials", {}),
        ("post", "/ai/copilot/investigations", {}),
        ("post", "/ai/ambient/start", {}),
        ("post", "/ai/ambient/session-demo/stop", {}),
        ("post", "/ai/optimize/schedule", {}),
        ("get", "/ai/population/risk-scores", None),
        ("get", "/ai/trends/patient-demo", None),
    ]

    for method, path, payload in checks:
        if method == "post":
            resp = client.post(path, json=payload)
        else:
            resp = client.get(path)
        # Protected endpoints can return 401/403 before reaching the stub.
        assert resp.status_code in (401, 403, 501)

        if resp.status_code == 501:
            body = resp.json()
            assert body.get("status") == "not_implemented"
