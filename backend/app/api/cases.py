"""
Case Management endpoints (Module 1).
"""
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import (
    Case, CaseMember, Suspect, Victim, InvestigatorNote, CaseTask, CaseStatus, CasePriority, User,
    Evidence, ChainOfCustody, AIAnalysis, EvidenceChunk, Entity, EntityRelationship,
    EntityResolutionCandidate, TimelineEvent, Anomaly, Report
)


from app.schemas.schemas import (
    CaseCreate, CaseUpdate, CaseOut, SuspectCreate, VictimCreate, NoteCreate, TaskCreate
)
from app.api.deps import get_current_user, require_permission, write_audit_log

router = APIRouter(prefix="/api/cases", tags=["Case Management"])


def _generate_case_number() -> str:
    return f"FORGE-{datetime.utcnow().year}-{random.randint(10000, 99999)}"


@router.post("", response_model=CaseOut)
def create_case(payload: CaseCreate, request: Request, db: Session = Depends(get_db),
                 user: User = Depends(require_permission("CREATE_CASE"))):
    case = Case(
        case_number=_generate_case_number(),
        title=payload.title,
        description=payload.description,
        crime_type=payload.crime_type,
        priority=CasePriority(payload.priority),
        created_by=user.id,
        lead_investigator_id=user.id,
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    db.add(CaseMember(case_id=case.id, user_id=user.id, role_on_case="LEAD"))
    db.commit()

    write_audit_log(db, user, "CASE_CREATED", "case", case.id, request)
    return case


@router.get("", response_model=list[CaseOut])
def list_cases(status: str | None = None, db: Session = Depends(get_db),
               user: User = Depends(require_permission("VIEW_CASE"))):
    q = db.query(Case)
    if status:
        q = q.filter(Case.status == CaseStatus(status))
    return q.order_by(Case.created_at.desc()).all()


@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: str, db: Session = Depends(get_db),
             user: User = Depends(require_permission("VIEW_CASE"))):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.put("/{case_id}", response_model=CaseOut)
def update_case(case_id: str, payload: CaseUpdate, request: Request, db: Session = Depends(get_db),
                 user: User = Depends(require_permission("EDIT_CASE"))):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if payload.title is not None:
        case.title = payload.title
    if payload.description is not None:
        case.description = payload.description
    if payload.status is not None:
        case.status = CaseStatus(payload.status)
        if case.status == CaseStatus.CLOSED:
            case.closed_at = datetime.utcnow()
    if payload.priority is not None:
        case.priority = CasePriority(payload.priority)
    if payload.lead_investigator_id is not None:
        case.lead_investigator_id = payload.lead_investigator_id

    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    write_audit_log(db, user, "CASE_UPDATED", "case", case.id, request, {"fields": payload.model_dump(exclude_none=True)})
    return case


@router.delete("/{case_id}")
def delete_case(case_id: str, permanent: bool = False, request: Request = None, db: Session = Depends(get_db),
                user: User = Depends(require_permission("EDIT_CASE"))):
    """Archives case by default; permanently removes all case data if permanent=True."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if permanent:
        # Delete dependent data across all forensic modules
        db.query(CaseMember).filter(CaseMember.case_id == case_id).delete(synchronize_session=False)
        db.query(Suspect).filter(Suspect.case_id == case_id).delete(synchronize_session=False)
        db.query(Victim).filter(Victim.case_id == case_id).delete(synchronize_session=False)
        db.query(InvestigatorNote).filter(InvestigatorNote.case_id == case_id).delete(synchronize_session=False)
        db.query(CaseTask).filter(CaseTask.case_id == case_id).delete(synchronize_session=False)
        db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).delete(synchronize_session=False)
        db.query(Anomaly).filter(Anomaly.case_id == case_id).delete(synchronize_session=False)
        db.query(EntityRelationship).filter(EntityRelationship.case_id == case_id).delete(synchronize_session=False)
        db.query(EntityResolutionCandidate).filter(EntityResolutionCandidate.case_id == case_id).delete(synchronize_session=False)
        db.query(Entity).filter(Entity.case_id == case_id).delete(synchronize_session=False)
        db.query(EvidenceChunk).filter(EvidenceChunk.case_id == case_id).delete(synchronize_session=False)
        db.query(AIAnalysis).filter(AIAnalysis.case_id == case_id).delete(synchronize_session=False)

        ev_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
        ev_ids = [e.id for e in ev_items]
        if ev_ids:
            db.query(ChainOfCustody).filter(ChainOfCustody.evidence_id.in_(ev_ids)).delete(synchronize_session=False)
        db.query(Evidence).filter(Evidence.case_id == case_id).delete(synchronize_session=False)
        db.query(Report).filter(Report.case_id == case_id).delete(synchronize_session=False)


        db.delete(case)
        db.commit()
        write_audit_log(db, user, "CASE_PERMANENTLY_DELETED", "case", case_id, request)
        return {"detail": "Case permanently deleted"}

    case.status = CaseStatus.ARCHIVED
    db.commit()
    write_audit_log(db, user, "CASE_ARCHIVED", "case", case.id, request)
    return {"detail": "Case archived"}


@router.get("/{case_id}/suspects")
def list_suspects(case_id: str, db: Session = Depends(get_db),
                  user: User = Depends(require_permission("VIEW_CASE"))):
    return db.query(Suspect).filter(Suspect.case_id == case_id).order_by(Suspect.created_at.asc()).all()


@router.post("/{case_id}/suspects")
def add_suspect(case_id: str, payload: SuspectCreate, db: Session = Depends(get_db),
                 user: User = Depends(require_permission("EDIT_CASE"))):
    suspect = Suspect(case_id=case_id, name=payload.name, aliases=payload.aliases,
                       description=payload.description, added_by=user.id)
    db.add(suspect)
    db.commit()
    db.refresh(suspect)
    return {"id": suspect.id, "name": suspect.name, "description": suspect.description}


@router.delete("/{case_id}/suspects/{suspect_id}")
def delete_suspect(case_id: str, suspect_id: str, db: Session = Depends(get_db),
                   user: User = Depends(require_permission("EDIT_CASE"))):
    s = db.query(Suspect).filter(Suspect.id == suspect_id, Suspect.case_id == case_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suspect not found")
    db.delete(s)
    db.commit()
    return {"detail": "Suspect removed"}


@router.get("/{case_id}/victims")
def list_victims(case_id: str, db: Session = Depends(get_db),
                 user: User = Depends(require_permission("VIEW_CASE"))):
    return db.query(Victim).filter(Victim.case_id == case_id).order_by(Victim.created_at.asc()).all()


@router.post("/{case_id}/victims")
def add_victim(case_id: str, payload: VictimCreate, db: Session = Depends(get_db),
               user: User = Depends(require_permission("EDIT_CASE"))):
    victim = Victim(case_id=case_id, name=payload.name, contact_info=payload.contact_info,
                     description=payload.description, added_by=user.id)
    db.add(victim)
    db.commit()
    db.refresh(victim)
    return {"id": victim.id, "name": victim.name, "contact_info": victim.contact_info, "description": victim.description}


@router.delete("/{case_id}/victims/{victim_id}")
def delete_victim(case_id: str, victim_id: str, db: Session = Depends(get_db),
                  user: User = Depends(require_permission("EDIT_CASE"))):
    v = db.query(Victim).filter(Victim.id == victim_id, Victim.case_id == case_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Victim not found")
    db.delete(v)
    db.commit()
    return {"detail": "Victim removed"}


@router.get("/{case_id}/notes")
def list_notes(case_id: str, db: Session = Depends(get_db),
               user: User = Depends(require_permission("VIEW_CASE"))):
    return db.query(InvestigatorNote).filter(InvestigatorNote.case_id == case_id).order_by(InvestigatorNote.created_at.desc()).all()


@router.post("/{case_id}/notes")
def add_note(case_id: str, payload: NoteCreate, db: Session = Depends(get_db),
             user: User = Depends(require_permission("EDIT_CASE"))):
    note = InvestigatorNote(case_id=case_id, author_id=user.id, content=payload.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "content": note.content, "created_at": note.created_at}


@router.delete("/{case_id}/notes/{note_id}")
def delete_note(case_id: str, note_id: str, db: Session = Depends(get_db),
                user: User = Depends(require_permission("EDIT_CASE"))):
    n = db.query(InvestigatorNote).filter(InvestigatorNote.id == note_id, InvestigatorNote.case_id == case_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(n)
    db.commit()
    return {"detail": "Note deleted"}


@router.get("/{case_id}/tasks")
def list_tasks(case_id: str, db: Session = Depends(get_db),
               user: User = Depends(require_permission("VIEW_CASE"))):
    return db.query(CaseTask).filter(CaseTask.case_id == case_id).order_by(CaseTask.created_at.desc()).all()


@router.post("/{case_id}/tasks")
def add_task(case_id: str, payload: TaskCreate, db: Session = Depends(get_db),
             user: User = Depends(require_permission("EDIT_CASE"))):
    task = CaseTask(case_id=case_id, title=payload.title, assigned_to=payload.assigned_to,
                     due_date=payload.due_date)
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"id": task.id, "title": task.title, "status": task.status}

