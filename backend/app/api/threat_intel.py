"""
Cyber Threat Intelligence endpoints (Module 10).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import ThreatIndicator, User
from app.schemas.schemas import ThreatCheckRequest, ThreatIndicatorOut
from app.services.threat_intel import enrich_indicator
from app.api.deps import require_permission

router = APIRouter(prefix="/api/threat-intel", tags=["Threat Intelligence"])


@router.post("/check", response_model=ThreatIndicatorOut)
async def check_indicator(payload: ThreatCheckRequest, db: Session = Depends(get_db),
                           user: User = Depends(require_permission("ANALYZE_EVIDENCE"))):
    result = await enrich_indicator(payload.indicator_type, payload.indicator_value)

    record = ThreatIndicator(
        case_id=payload.case_id,
        indicator_type=payload.indicator_type,
        indicator_value=payload.indicator_value,
        source=result.get("source"),
        verdict=result.get("verdict"),
        raw_response=result.get("raw_response"),
        enrichment_available=result.get("enrichment_available", False),
    )
    db.add(record)
    db.commit()

    return ThreatIndicatorOut(
        indicator_type=payload.indicator_type,
        indicator_value=payload.indicator_value,
        source=result.get("source"),
        verdict=result.get("verdict"),
        enrichment_available=result.get("enrichment_available", False),
        raw_response=result.get("raw_response") or result.get("message"),
    )


@router.get("/case/{case_id}")
def list_case_indicators(case_id: str, db: Session = Depends(get_db),
                          user: User = Depends(require_permission("VIEW_CASE"))):
    return db.query(ThreatIndicator).filter(ThreatIndicator.case_id == case_id).all()
