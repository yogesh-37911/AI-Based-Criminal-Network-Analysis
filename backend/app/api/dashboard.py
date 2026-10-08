"""
Visual Analytics Dashboard data endpoints (Module 15).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import (
    Case, Evidence, Entity, EntityRelationship, Anomaly, Suspect, Victim,
    CaseStatus, CasePriority, User, AuditLog
)
from app.api.deps import require_permission

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db), user: User = Depends(require_permission("VIEW_CASE"))):
    total_cases = db.query(func.count(Case.id)).scalar()
    active_cases = db.query(func.count(Case.id)).filter(
        Case.status.in_([CaseStatus.OPEN, CaseStatus.UNDER_INVESTIGATION, CaseStatus.EVIDENCE_REVIEW])
    ).scalar()
    high_priority = db.query(func.count(Case.id)).filter(
        Case.priority.in_([CasePriority.HIGH, CasePriority.CRITICAL]),
        Case.status != CaseStatus.CLOSED,
    ).scalar()

    evidence_items = db.query(func.count(Evidence.id)).scalar()
    suspects = db.query(func.count(Suspect.id)).scalar()
    victims = db.query(func.count(Victim.id)).scalar()
    entities = db.query(func.count(Entity.id)).scalar()
    relationships = db.query(func.count(EntityRelationship.id)).scalar()
    anomalies = db.query(func.count(Anomaly.id)).scalar()

    case_status_breakdown = dict(
        db.query(Case.status, func.count(Case.id)).group_by(Case.status).all()
    )
    case_status_breakdown = {k.value if hasattr(k, "value") else k: v for k, v in case_status_breakdown.items()}

    evidence_type_breakdown = dict(
        db.query(Evidence.evidence_type, func.count(Evidence.id)).group_by(Evidence.evidence_type).all()
    )

    recent_activity = (
        db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(15).all()
    )

    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "high_priority_cases": high_priority,
        "evidence_items": evidence_items,
        "suspects": suspects,
        "victims": victims,
        "entities": entities,
        "relationships": relationships,
        "anomalies": anomalies,
        "case_status_breakdown": case_status_breakdown,
        "evidence_type_breakdown": evidence_type_breakdown,
        "recent_activity": [
            {"action": a.action, "resource_type": a.resource_type, "timestamp": a.timestamp.isoformat()}
            for a in recent_activity
        ],
    }
