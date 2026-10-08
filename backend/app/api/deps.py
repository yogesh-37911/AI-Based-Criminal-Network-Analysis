"""
Shared FastAPI dependencies: DB session, current-user resolution, RBAC guard.
"""
from typing import List
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_token_payload
from app.models.models import User, AuditLog

# RBAC — Module 17 permission matrix
ROLE_PERMISSIONS = {
    "SUPER_ADMIN": {"*"},
    "CASE_ADMIN": {
        "CREATE_CASE", "VIEW_CASE", "EDIT_CASE", "UPLOAD_EVIDENCE", "DELETE_EVIDENCE",
        "ANALYZE_EVIDENCE", "EXPORT_REPORT", "VIEW_CHAIN_OF_CUSTODY", "MANAGE_USERS",
    },
    "INVESTIGATOR": {
        "CREATE_CASE", "VIEW_CASE", "EDIT_CASE", "UPLOAD_EVIDENCE", "DELETE_EVIDENCE", "ANALYZE_EVIDENCE",
        "EXPORT_REPORT", "VIEW_CHAIN_OF_CUSTODY",
    },
    "FORENSIC_ANALYST": {
        "VIEW_CASE", "UPLOAD_EVIDENCE", "DELETE_EVIDENCE", "ANALYZE_EVIDENCE", "VIEW_CHAIN_OF_CUSTODY",
    },
    "INTELLIGENCE_ANALYST": {"VIEW_CASE", "ANALYZE_EVIDENCE", "EXPORT_REPORT"},
    "AUDITOR": {"VIEW_CASE", "VIEW_CHAIN_OF_CUSTODY"},
    "VIEWER": {"VIEW_CASE"},
}


def get_current_user(payload: dict = Depends(get_token_payload), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_permission(permission: str):
    def checker(user: User = Depends(get_current_user)):
        allowed = ROLE_PERMISSIONS.get(user.role.value if hasattr(user.role, "value") else user.role, set())
        if "*" not in allowed and permission not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' lacks permission '{permission}'",
            )
        return user
    return checker


def write_audit_log(db: Session, user: User, action: str, resource_type: str = None,
                     resource_id: str = None, request: Request = None, details: dict = None):
    log = AuditLog(
        user_id=user.id if user else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(log)
    db.commit()
