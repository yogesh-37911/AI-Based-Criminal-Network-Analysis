"""
Pytest fixtures.

These tests run against a real PostgreSQL + pgvector instance — the
schema uses Postgres-specific column types (UUID, ARRAY, pgvector's
Vector) that have no SQLite equivalent, so a lightweight in-memory DB
substitute would silently test something other than the real schema.
Point DATABASE_URL at a disposable Postgres (the docker-compose
'postgres' service works) before running pytest, e.g.:

    docker compose up -d postgres
    DATABASE_URL=postgresql+psycopg2://forge:forge@localhost:5432/forge_ai_test \
        pytest

CI runs this automatically via a Postgres service container
(see .github/workflows/ci.yml).
"""
import os
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://forge:forge@localhost:5432/forge_ai_test",
)
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production-use-only"

from app.db.session import Base, engine, SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import User, RoleEnum  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from sqlalchemy import text  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    with engine.connect() as conn:
        if engine.dialect.name == "postgresql":
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def admin_user(db_session):
    existing = db_session.query(User).filter(User.email == "testadmin@forge-ai.local").first()
    if existing:
        return existing
    user = User(
        full_name="Test Admin",
        email="testadmin@forge-ai.local",
        hashed_password=hash_password("TestPass123!"),
        role=RoleEnum.SUPER_ADMIN,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, admin_user):
    resp = client.post("/api/auth/login", json={"email": "testadmin@forge-ai.local", "password": "TestPass123!"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
