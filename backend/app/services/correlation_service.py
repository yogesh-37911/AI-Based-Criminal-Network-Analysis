"""
Cross-evidence correlation (feeds Modules 4 & 6).

When a document is analyzed, this service:
  1. Persists each extracted entity as an Entity row (deduplicating by
     normalized value + type within the case).
  2. Creates ASSOCIATED_WITH / MENTIONED_IN relationship edges between
     entities that co-occur inside the same evidence item, which is
     the seed data for the investigation graph. Co-occurrence is a
     POTENTIAL_CONNECTION, not a confirmed relationship — investigators
     upgrade the label after review.
"""
import itertools
import re
from typing import List
from sqlalchemy.orm import Session

from app.models.models import Entity, EntityRelationship, RelationshipType, ConfidenceLabel
from app.schemas.schemas import ExtractedEntity


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def persist_entities(db: Session, case_id: str, evidence_id: str, extracted: List[ExtractedEntity]) -> List[Entity]:
    persisted = []
    for item in extracted:
        norm = _normalize(item.value)
        existing = (
            db.query(Entity)
            .filter(
                Entity.case_id == case_id,
                Entity.entity_type == item.entity_type,
                Entity.normalized_value == norm,
            )
            .first()
        )
        if existing:
            # Reinforce confidence slightly if seen again in another document
            existing.confidence_score = min(1.0, max(existing.confidence_score, item.confidence_score))
            persisted.append(existing)
            continue

        entity = Entity(
            case_id=case_id,
            entity_type=item.entity_type,
            value=item.value,
            normalized_value=norm,
            confidence_score=item.confidence_score,
            first_seen_evidence_id=evidence_id,
        )
        db.add(entity)
        db.flush()  # get entity.id without full commit
        persisted.append(entity)

    db.commit()
    return persisted


def build_cooccurrence_edges(db: Session, case_id: str, evidence_id: str, entities: List[Entity]) -> int:
    """Create/reinforce a weighted edge between every pair of entities that
    co-occurred in this evidence item. Caps pairwise combinations for very
    entity-dense documents to avoid a combinatorial blow-up."""
    count = 0
    capped = entities[:60]
    for a, b in itertools.combinations(capped, 2):
        if a.id == b.id:
            continue
        existing = (
            db.query(EntityRelationship)
            .filter(
                EntityRelationship.case_id == case_id,
                EntityRelationship.source_entity_id.in_([a.id, b.id]),
                EntityRelationship.target_entity_id.in_([a.id, b.id]),
            )
            .first()
        )
        if existing:
            existing.weight += 1
            existing.evidence_ids = list(set((existing.evidence_ids or []) + [evidence_id]))
            existing.last_observed = existing.last_observed
            continue

        rel = EntityRelationship(
            case_id=case_id,
            source_entity_id=a.id,
            target_entity_id=b.id,
            relationship_type=RelationshipType.MENTIONED_IN,
            confidence_label=ConfidenceLabel.POTENTIAL_CONNECTION,
            weight=1,
            evidence_ids=[evidence_id],
        )
        db.add(rel)
        count += 1

    db.commit()
    return count
