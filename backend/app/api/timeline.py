"""
Forensic Timeline endpoints (Module 8).
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import TimelineEvent, User
from app.schemas.schemas import TimelineEventOut
from app.api.deps import require_permission

router = APIRouter(prefix="/api/timeline", tags=["Forensic Timeline"])


@router.get("/case/{case_id}", response_model=list[TimelineEventOut])
def get_timeline(
    case_id: str,
    entity_id: Optional[str] = None,
    event_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("VIEW_CASE")),
):
    q = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id)
    if entity_id:
        q = q.filter(TimelineEvent.entity_id == entity_id)
    if event_type:
        q = q.filter(TimelineEvent.event_type == event_type)
    if start_date:
        q = q.filter(TimelineEvent.event_timestamp >= start_date)
    if end_date:
        q = q.filter(TimelineEvent.event_timestamp <= end_date)
    return q.order_by(TimelineEvent.event_timestamp.asc()).all()
