"""
AI Forensic Report Generator endpoints (Module 14).
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Report, User
from app.schemas.schemas import ReportGenerateRequest, ReportOut
from app.services.report_service import generate_report
from app.api.deps import require_permission

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.post("", response_model=ReportOut)
def create_report(payload: ReportGenerateRequest, db: Session = Depends(get_db),
                   user: User = Depends(require_permission("EXPORT_REPORT"))):
    report = generate_report(db, payload.case_id, user.id)

    if payload.format in ("DOCX", "PDF"):
        # Export path — implemented via the docx/pdf generation skill at
        # authoring time; JSON is always available as the canonical source.
        report.format = payload.format

    return report


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: str, db: Session = Depends(get_db),
                user: User = Depends(require_permission("EXPORT_REPORT"))):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/content")
def get_report_content(report_id: str, db: Session = Depends(get_db),
                        user: User = Depends(require_permission("EXPORT_REPORT"))):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report.content_json


@router.get("/case/{case_id}", response_model=list[ReportOut])
def list_case_reports(case_id: str, db: Session = Depends(get_db),
                       user: User = Depends(require_permission("EXPORT_REPORT"))):
    return db.query(Report).filter(Report.case_id == case_id).order_by(Report.created_at.desc()).all()
