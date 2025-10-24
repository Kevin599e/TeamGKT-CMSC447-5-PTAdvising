from app import app

def test_health():
    client = app.test_client()
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json().get("ok") is True
