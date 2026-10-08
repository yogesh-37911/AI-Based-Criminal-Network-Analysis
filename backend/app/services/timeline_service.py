"""
Forensic Timeline construction (Module 8).

Pulls DATE/TIME-bearing signals already extracted during document
analysis (Module 4) plus evidence upload events, and normalizes them
into TimelineEvent rows so the case has one unified, filterable
timeline instead of N disconnected evidence files.
"""
from datetime import datetime
import dateutil.parser as dateparser
from sqlalchemy.orm import Session

from app.models.models import (
    Evidence, Entity, EntityType, TimelineEvent, ConfidenceLabel
)


def seed_timeline_from_evidence_upload(db: Session, evidence: Evidence) -> TimelineEvent:
    event = TimelineEvent(
        case_id=evidence.case_id,
        entity_id=None,
        event_type="EVIDENCE_UPLOADED",
        event_timestamp=evidence.uploaded_at or datetime.utcnow(),
        description=f"Evidence '{evidence.original_filename}' uploaded and hashed.",
        source_evidence_id=evidence.id,
        confidence_label=ConfidenceLabel.CONFIRMED_FROM_EVIDENCE,
    )
    db.add(event)
    db.commit()
    return event


def build_timeline_from_date_entities(db: Session, case_id: str, evidence_id: str) -> int:
    """Turn extracted DATE entities tied to this evidence item into
    timeline events. Dates that fail to parse are skipped rather than
    guessed at."""
    date_entities = (
        db.query(Entity)
        .filter(
            Entity.case_id == case_id,
            Entity.entity_type == EntityType.DATE,
            Entity.first_seen_evidence_id == evidence_id,
        )
        .all()
    )
    created = 0
    for ent in date_entities:
        try:
            parsed = dateparser.parse(ent.value, fuzzy=True, default=datetime(1970, 1, 1))
        except (ValueError, OverflowError):
            continue
        if parsed.year < 1990 or parsed.year > 2100:
            continue  # implausible parse, likely noise

        db.add(
            TimelineEvent(
                case_id=case_id,
                entity_id=ent.id,
                event_type="DATE_MENTIONED_IN_EVIDENCE",
                event_timestamp=parsed,
                description=f"Date reference '{ent.value}' found in evidence.",
                source_evidence_id=evidence_id,
                confidence_label=ConfidenceLabel.SUPPORTED_INFERENCE,
            )
        )
        created += 1
    db.commit()
    return created
