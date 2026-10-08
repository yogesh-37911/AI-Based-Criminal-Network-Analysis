"""
Seed script — creates an initial SUPER_ADMIN account so the platform is
usable on first boot. Run with: python seed.py
"""
from sqlalchemy import text

from app.db.session import SessionLocal, Base, engine
from app.models.models import User, RoleEnum
from app.core.security import hash_password
from app.core.config import settings

if engine.dialect.name == "postgresql":
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if not db.query(User).filter(User.email == "admin@forge-ai.local").first():
    admin = User(
        full_name="System Administrator",
        email="admin@forge-ai.local",
        hashed_password=hash_password(settings.ADMIN_PASSWORD),
        role=RoleEnum.SUPER_ADMIN,
        department="Platform Administration",
    )
    db.add(admin)
    db.commit()
    if settings.ADMIN_PASSWORD != "ChangeMe123!":
        print("Seeded SUPER_ADMIN: admin@forge-ai.local (password provided through ADMIN_PASSWORD).")
    else:
        print("Seeded SUPER_ADMIN: admin@forge-ai.local / ChangeMe123! (change immediately)")
else:
    print("Admin already exists — skipping seed.")

db.close()
