"""
Seed script — creates an initial SUPER_ADMIN account so the platform is
usable on first boot. Run with: python seed.py
"""
from sqlalchemy import text

from app.db.session import SessionLocal, Base, engine
from app.models.models import User, RoleEnum
from app.core.security import hash_password, verify_password
from app.core.config import settings

if engine.dialect.name == "postgresql":
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

Base.metadata.create_all(bind=engine)
db = SessionLocal()

admin = db.query(User).filter(User.email == "admin@forge-ai.local").first()
if not admin:
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
elif (
    settings.ADMIN_PASSWORD != "ChangeMe123!"
    and verify_password("ChangeMe123!", admin.hashed_password)
):
    # If first boot used the built-in default, allow an operator-provided
    # Render ADMIN_PASSWORD to replace it once. Never overwrite a password
    # that has already been changed from the built-in default.
    admin.hashed_password = hash_password(settings.ADMIN_PASSWORD)
    db.commit()
    print("Replaced the built-in SUPER_ADMIN password with ADMIN_PASSWORD.")
else:
    print("Admin already exists — skipping seed.")

db.close()
