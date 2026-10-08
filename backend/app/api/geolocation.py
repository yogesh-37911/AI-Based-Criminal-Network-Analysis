"""
Geolocation Analysis endpoints (Module 16).

Surfaces any timeline events that carry location_lat/location_lng
(populated where evidence — e.g. IP geolocation records, device GPS
logs, transaction branch locations — actually contains coordinates).
No location is ever invented; events without real coordinates are
simply excluded, not estimated.
"""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import TimelineEvent, User
from app.api.deps import require_permission

router = APIRouter(prefix="/api/geolocation", tags=["Geolocation Analysis"])


@router.get("/case/{case_id}")
def get_case_locations(case_id: str, entity_id: Optional[str] = None, db: Session = Depends(get_db),
                        user: User = Depends(require_permission("VIEW_CASE"))):
    q = db.query(TimelineEvent).filter(
        TimelineEvent.case_id == case_id,
        TimelineEvent.location_lat.isnot(None),
        TimelineEvent.location_lng.isnot(None),
    )
    if entity_id:
        q = q.filter(TimelineEvent.entity_id == entity_id)

    events = q.order_by(TimelineEvent.event_timestamp.asc()).all()
    return [
        {
            "id": e.id,
            "entity_id": e.entity_id,
            "event_type": e.event_type,
            "timestamp": e.event_timestamp.isoformat(),
            "lat": e.location_lat,
            "lng": e.location_lng,
            "description": e.description,
        }
        for e in events
    ]
