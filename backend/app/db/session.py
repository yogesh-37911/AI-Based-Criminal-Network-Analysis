"""
Database session management (SQLAlchemy engine + session factory).
"""
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

logger = logging.getLogger("forge.db")


def _set_sqlite_pragmas(dbapi_conn, _connection_record):
    """Enable WAL mode and a generous busy_timeout on every SQLite connection."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=30000")   # 30 seconds
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


def _make_sqlite_engine(url: str):
    eng = create_engine(url, connect_args={"check_same_thread": False}, future=True)
    event.listen(eng, "connect", _set_sqlite_pragmas)
    return eng


def init_engine():
    url = settings.DATABASE_URL
    if url and url.startswith("postgresql"):
        # Never silently use ephemeral SQLite in production. A temporary
        # Postgres outage should fail startup and be retried by the platform.
        if settings.ENV.lower() == "production":
            return create_engine(
                url, pool_pre_ping=True, future=True,
                connect_args={"connect_timeout": 5},
            )
        try:
            eng = create_engine(url, pool_pre_ping=True, future=True, connect_args={"connect_timeout": 1})
            with eng.connect() as conn:
                pass
            return eng
        except Exception as e:
            logger.warning(f"PostgreSQL connection to {url} failed ({e}). Falling back to local SQLite database.")
            return _make_sqlite_engine("sqlite:///./forge_ai.db")
    elif url and url.startswith("sqlite"):
        return _make_sqlite_engine(url)
    return _make_sqlite_engine(url or "sqlite:///./forge_ai.db")


engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

