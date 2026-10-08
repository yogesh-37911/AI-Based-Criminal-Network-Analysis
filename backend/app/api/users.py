"""
User Management endpoints (Module 17 support — SUPER_ADMIN / CASE_ADMIN only).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import User, RoleEnum
from app.schemas.schemas import UserOut
from app.api.deps import require_permission

router = APIRouter(prefix="/api/users", tags=["User Management"])


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), user: User = Depends(require_permission("MANAGE_USERS"))):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.put("/{user_id}/role")
def update_role(user_id: str, role: str, db: Session = Depends(get_db),
                 admin: User = Depends(require_permission("MANAGE_USERS"))):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        target.role = RoleEnum(role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    db.commit()
    return {"id": target.id, "role": target.role.value}


@router.put("/{user_id}/deactivate")
def deactivate_user(user_id: str, db: Session = Depends(get_db),
                     admin: User = Depends(require_permission("MANAGE_USERS"))):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = False
    db.commit()
    return {"id": target.id, "is_active": target.is_active}
