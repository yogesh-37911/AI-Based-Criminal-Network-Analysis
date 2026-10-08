"""
Chain-of-Custody service (Module 3).

Every touch of an evidence item — upload, access, analysis, export,
transfer, or a failed/attempted modification — is written as an
append-only ChainOfCustody record. Records are never updated or
deleted by application code; that immutability (enforced at the DB
layer via no UPDATE/DELETE grants for the app role, in production)
is what makes the timeline trustworthy in court.
"""
from sqlalchemy.orm import Session
from app.models.models import ChainOfCustody, CustodyAction, Evidence


def log_custody_event(
    db: Session,
    evidence: Evidence,
    investigator_id: str,
    action: CustodyAction,
    ip_address: str = None,
    session_id: str = None,
    notes: str = None,
    previous_hash: str = None,
    current_hash: str = None,
) -> ChainOfCustody:
    record = ChainOfCustody(
        evidence_id=evidence.id,
        investigator_id=investigator_id,
        action=action,
        previous_hash=previous_hash,
        current_hash=current_hash or evidence.sha256_hash,
        ip_address=ip_address,
        session_id=session_id,
        notes=notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_custody_timeline(db: Session, evidence_id: str):
    return (
        db.query(ChainOfCustody)
        .filter(ChainOfCustody.evidence_id == evidence_id)
        .order_by(ChainOfCustody.timestamp.asc())
        .all()
    )
