from fastapi.testclient import TestClient

from app.main import app


def test_health():
    with TestClient(app) as c:
        r = c.get("/health")
        assert r.status_code == 200
        assert r.json()["ok"] is True


def test_wake_requires_secret():
    with TestClient(app) as c:
        assert c.post("/wake").status_code == 401
