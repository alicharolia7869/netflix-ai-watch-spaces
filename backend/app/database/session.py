import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

def get_engine():
    # Attempt connecting to configured primary database (PostgreSQL)
    try:
        connect_args = {}
        if "sqlite" in settings.DATABASE_URL:
            connect_args = {"check_same_thread": False}
            
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            connect_args=connect_args
        )
        # Test connection immediately
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Connected successfully to primary database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
        return engine, settings.DATABASE_URL
    except Exception as e:
        logger.warning(f"Could not connect to configured database ({settings.DATABASE_URL}): {e}")
        logger.info(f"Falling back to local SQLite engine: {settings.SQLITE_FALLBACK_URL}")
        fallback_engine = create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True
        )
        return fallback_engine, settings.SQLITE_FALLBACK_URL

engine, active_db_url = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "type": "postgresql" if "postgresql" in active_db_url else "sqlite",
            "active_url": active_db_url.split("@")[-1] if "@" in active_db_url else active_db_url
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
