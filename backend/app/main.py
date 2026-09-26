from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.routers.health import router as health_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real-time AI-orchestrated Watch Spaces with synchronized video playback, live chat, and timeline-grounded AI Co-Pilot.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(health_router)  # Also mount at root /health for convenience

@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "project_id": settings.PROJECT_ID,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_url": f"{settings.API_V1_STR}/health",
    }
