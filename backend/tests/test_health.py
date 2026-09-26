from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == settings.PROJECT_NAME
    assert data["project_id"] == settings.PROJECT_ID
    assert data["status"] == "online"
    assert "docs_url" in data
    assert "health_url" in data

def test_health_endpoint():
    response = client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == settings.PROJECT_NAME
    assert data["project_id"] == settings.PROJECT_ID
    assert data["version"] == settings.VERSION
    assert "database" in data
    assert data["database"]["status"] in ["healthy", "degraded"]
    assert "timestamp" in data

def test_health_root_shortcut():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == settings.PROJECT_NAME
