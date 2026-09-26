from datetime import datetime, timezone
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.database.session import check_db_health

router = APIRouter(tags=["Health"])

@router.get("/health", summary="Service Health and Status")
def get_health():
    db_health = check_db_health()
    return {
        "status": "healthy" if db_health.get("status") == "healthy" else "degraded",
        "service": settings.PROJECT_NAME,
        "project_id": settings.PROJECT_ID,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_health,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
