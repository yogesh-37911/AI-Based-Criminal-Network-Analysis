"""
Audit Log endpoints (Module 18 — AUDITOR role).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import AuditLog, User
from app.api.deps import require_permission

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


@router.get("")
def list_audit_logs(limit: int = 100, db: Session = Depends(get_db),
                     user: User = Depends(require_permission("VIEW_CHAIN_OF_CUSTODY"))):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id, "user_id": l.user_id, "action": l.action,
            "resource_type": l.resource_type, "resource_id": l.resource_id,
            "ip_address": l.ip_address, "timestamp": l.timestamp.isoformat(),
        }
        for l in logs
    ]
