def test_healthz_returns_ok(client):
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_districts_endpoint_returns_14(client):
    res = client.get("/api/districts")
    assert res.status_code == 200
    payload = res.json()
    assert len(payload["data"]) == 14
    assert "Bekobod tumani" in payload["data"]


def test_me_requires_auth(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401
