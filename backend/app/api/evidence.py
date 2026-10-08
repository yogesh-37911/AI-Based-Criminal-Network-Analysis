"""
Digital Evidence Management + Chain of Custody endpoints (Modules 2 & 3).
"""
import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.config import settings
from app.models.models import (
    Evidence, EvidenceHash, EvidenceStatus, User, CustodyAction,
    EvidenceChunk, Entity, EntityAlias, TimelineEvent
)
from app.schemas.schemas import EvidenceOut, HashVerifyOut, CustodyRecordOut
from app.services.hashing import sha256_file, verify_integrity
from app.services.chain_of_custody import log_custody_event, get_custody_timeline
from app.api.deps import get_current_user, require_permission, write_audit_log

router = APIRouter(prefix="/api/evidence", tags=["Evidence Management"])


def _validate_upload(file: UploadFile):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not permitted")
    # Reject path traversal in the original filename
    if ".." in file.filename or file.filename.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid filename")


@router.post("/upload", response_model=EvidenceOut)
def upload_evidence(
    request: Request,
    case_id: str = Form(...),
    source: str = Form(None),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("UPLOAD_EVIDENCE")),
):
    _validate_upload(file)

    ext = os.path.splitext(file.filename)[1].lower().lstrip(".")
    safe_name = f"{uuid.uuid4()}.{ext}"
    case_dir = os.path.join(settings.UPLOAD_DIR, case_id)
    os.makedirs(case_dir, exist_ok=True)
    stored_path = os.path.join(case_dir, safe_name)

    size = 0
    with open(stored_path, "wb") as out:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                out.close()
                os.remove(stored_path)
                raise HTTPException(status_code=413, detail="File exceeds max upload size")
            out.write(chunk)

    file_hash = sha256_file(stored_path)

    evidence = Evidence(
        case_id=case_id,
        evidence_type=ext.upper(),
        original_filename=file.filename,
        stored_path=stored_path,
        file_size_bytes=size,
        sha256_hash=file_hash,
        uploaded_by=user.id,
        source=source,
        description=description,
        status=EvidenceStatus.UPLOADED,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    db.add(EvidenceHash(evidence_id=evidence.id, hash_value=file_hash, matches_original=True))
    db.commit()

    log_custody_event(
        db, evidence, user.id, CustodyAction.UPLOADED,
        ip_address=request.client.host if request.client else None,
        current_hash=file_hash,
        notes=f"Initial upload of '{file.filename}'.",
    )

    write_audit_log(db, user, "EVIDENCE_UPLOADED", "evidence", evidence.id, request)
    return evidence


@router.get("/{evidence_id}", response_model=EvidenceOut)
def get_evidence(evidence_id: str, request: Request, db: Session = Depends(get_db),
                  user: User = Depends(require_permission("VIEW_CASE"))):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    log_custody_event(db, evidence, user.id, CustodyAction.ACCESSED,
                       ip_address=request.client.host if request.client else None)
    return evidence


@router.get("/case/{case_id}", response_model=list[EvidenceOut])
def list_case_evidence(case_id: str, db: Session = Depends(get_db),
                        user: User = Depends(require_permission("VIEW_CASE"))):
    return db.query(Evidence).filter(Evidence.case_id == case_id).order_by(Evidence.uploaded_at.desc()).all()


@router.get("/{evidence_id}/hash", response_model=HashVerifyOut)
def verify_hash(evidence_id: str, request: Request, db: Session = Depends(get_db),
                 user: User = Depends(require_permission("VIEW_CHAIN_OF_CUSTODY"))):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    if not os.path.exists(evidence.stored_path):
        raise HTTPException(status_code=410, detail="Evidence file missing from storage")

    current_hash = sha256_file(evidence.stored_path)
    matches = current_hash == evidence.sha256_hash

    action = CustodyAction.HASH_VERIFIED if matches else CustodyAction.MODIFICATION_ATTEMPT
    log_custody_event(
        db, evidence, user.id, action,
        ip_address=request.client.host if request.client else None,
        previous_hash=evidence.sha256_hash,
        current_hash=current_hash,
        notes="Automated integrity re-verification." if matches else "TAMPER DETECTED: hash mismatch on re-verification.",
    )

    from datetime import datetime
    return HashVerifyOut(
        evidence_id=evidence_id,
        original_hash=evidence.sha256_hash,
        current_hash=current_hash,
        matches=matches,
        checked_at=datetime.utcnow(),
    )


@router.get("/{evidence_id}/chain-of-custody", response_model=list[CustodyRecordOut])
def chain_of_custody(evidence_id: str, db: Session = Depends(get_db),
                      user: User = Depends(require_permission("VIEW_CHAIN_OF_CUSTODY"))):
    return get_custody_timeline(db, evidence_id)


@router.delete("/{evidence_id}")
def delete_evidence(
    evidence_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("DELETE_EVIDENCE")),
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    # 1. Clean up associated chunks in pgvector
    db.query(EvidenceChunk).filter(EvidenceChunk.evidence_id == evidence_id).delete(synchronize_session=False)

    # 2. Disassociate entities, aliases, and timeline events originating from this evidence
    db.query(Entity).filter(Entity.first_seen_evidence_id == evidence_id).update(
        {Entity.first_seen_evidence_id: None}, synchronize_session=False
    )
    db.query(EntityAlias).filter(EntityAlias.source_evidence_id == evidence_id).update(
        {EntityAlias.source_evidence_id: None}, synchronize_session=False
    )
    db.query(TimelineEvent).filter(TimelineEvent.source_evidence_id == evidence_id).update(
        {TimelineEvent.source_evidence_id: None}, synchronize_session=False
    )

    # 3. Clean up physical file on disk if exists
    if evidence.stored_path and os.path.exists(evidence.stored_path):
        try:
            os.remove(evidence.stored_path)
        except OSError:
            pass

    # 4. Audit log
    write_audit_log(
        db,
        user,
        "EVIDENCE_DELETED",
        "evidence",
        evidence.id,
        request,
        details={"filename": evidence.original_filename, "case_id": str(evidence.case_id)},
    )

    # 5. Delete evidence record (EvidenceHash and ChainOfCustody cascade automatically via DB/ORM)
    db.delete(evidence)
    db.commit()

    return {"detail": "Evidence deleted successfully", "id": evidence_id}

