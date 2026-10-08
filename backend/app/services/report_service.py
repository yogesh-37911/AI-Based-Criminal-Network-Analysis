"""
AI Forensic Report Generator (Module 14).

Assembles the 15-section structured report from data already in the
database plus one AI-generated narrative summary (clearly labeled as
AI-generated analysis, distinct from original evidence or investigator
notes — Module 19's provenance requirement).
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import (
    Case, Evidence, Entity, EntityRelationship, TimelineEvent, Anomaly,
    InvestigatorNote, ChainOfCustody, Suspect, Victim, Report
)
from app.services.rag_service import summarize_case


def generate_report(db: Session, case_id: str, generated_by: str) -> Report:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError("Case not found")

    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    relationships = db.query(EntityRelationship).filter(EntityRelationship.case_id == case_id).all()
    timeline = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.case_id == case_id)
        .order_by(TimelineEvent.event_timestamp.asc())
        .all()
    )
    anomalies = db.query(Anomaly).filter(Anomaly.case_id == case_id).all()
    notes = db.query(InvestigatorNote).filter(InvestigatorNote.case_id == case_id).all()
    suspects = db.query(Suspect).filter(Suspect.case_id == case_id).all()
    victims = db.query(Victim).filter(Victim.case_id == case_id).all()

    custody_count = (
        db.query(ChainOfCustody)
        .join(Evidence, ChainOfCustody.evidence_id == Evidence.id)
        .filter(Evidence.case_id == case_id)
        .count()
    )

    ai_summary = None
    try:
        ai_summary = summarize_case(db, case_id)
    except Exception as e:
        ai_summary = {
            "answer": f"AI summary unavailable: {e}",
            "confidence_label": "INSUFFICIENT_EVIDENCE",
            "citations": [],
        }

    entity_type_counts = {}
    for e in entities:
        key = e.entity_type.value if hasattr(e.entity_type, "value") else e.entity_type
        entity_type_counts[key] = entity_type_counts.get(key, 0) + 1

    def _str_id(v):
        return str(v) if v is not None else None

    content = {
        "1_case_information": {
            "case_number": case.case_number,
            "title": case.title,
            "status": case.status.value if hasattr(case.status, "value") else str(case.status),
            "priority": case.priority.value if hasattr(case.priority, "value") else str(case.priority),
            "crime_type": case.crime_type,
            "created_at": case.created_at.isoformat() if case.created_at else datetime.utcnow().isoformat(),
        },
        "2_investigation_summary": {
            "description": case.description,
            "lead_investigator_id": _str_id(case.lead_investigator_id),
        },
        "3_evidence_summary": {
            "total_evidence_items": len(evidence_items),
            "items": [
                {
                    "id": _str_id(ev.id),
                    "filename": ev.original_filename,
                    "type": ev.evidence_type,
                    "sha256": ev.sha256_hash,
                    "status": ev.status.value if hasattr(ev.status, "value") else str(ev.status),
                }
                for ev in evidence_items
            ],
        },
        "4_entities_identified": {
            "total": len(entities),
            "by_type": entity_type_counts,
        },
        "5_communication_analysis": {
            "relationship_count": len(
                [r for r in relationships if "CALL" in str(r.relationship_type) or "EMAIL" in str(r.relationship_type)]
            ),
        },
        "6_financial_analysis": {
            "transaction_related_entities": len(
                [e for e in entities if str(e.entity_type) in ("EntityType.BANK_ACCOUNT", "EntityType.TRANSACTION_ID", "EntityType.CRYPTO_WALLET")]
            ),
        },
        "7_network_analysis": {
            "total_relationships": len(relationships),
        },
        "8_timeline": [
            {
                "timestamp": t.event_timestamp.isoformat() if t.event_timestamp else datetime.utcnow().isoformat(),
                "event_type": t.event_type,
                "description": t.description,
                "confidence_label": t.confidence_label.value if hasattr(t.confidence_label, "value") else str(t.confidence_label),
            }
            for t in timeline
        ],
        "9_anomalies": [
            {
                "type": a.anomaly_type,
                "score": a.anomaly_score,
                "reason": a.reason,
                "method": a.detection_method,
            }
            for a in anomalies
        ],
        "10_key_findings": {
            "suspects": [{"name": s.name, "aliases": s.aliases} for s in suspects],
            "victims": [{"name": v.name} for v in victims],
        },
        "11_supporting_evidence": [_str_id(ev.id) for ev in evidence_items],
        "12_ai_analysis": {
            **ai_summary,
            "provenance": "AI_GENERATED_ANALYSIS",
        },
        "13_investigator_notes": [
            {"content": n.content, "author_id": _str_id(n.author_id), "created_at": n.created_at.isoformat() if n.created_at else datetime.utcnow().isoformat()}
            for n in notes
        ],
        "14_chain_of_custody": {
            "total_custody_events": custody_count,
        },
        "15_disclaimer": (
            "This report was partially generated with AI assistance from indexed "
            "case evidence. AI-generated content (Section 12) is clearly separated "
            "from original evidence, derived data, and investigator notes. This "
            "report is an investigative aid and does not constitute a legal or "
            "forensic conclusion. All findings must be independently verified by "
            "a qualified investigator before use in legal proceedings."
        ),
    }
    def _sanitize_for_json(obj):
        if isinstance(obj, dict):
            return {str(k): _sanitize_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple, set)):
            return [_sanitize_for_json(x) for x in obj]
        elif hasattr(obj, "hex"):  # UUID
            return str(obj)
        elif hasattr(obj, "value"):  # Enum
            return obj.value
        elif hasattr(obj, "isoformat"):  # datetime
            return obj.isoformat()
        elif isinstance(obj, (int, float, str, bool)) or obj is None:
            return obj
        return str(obj)

    clean_content = _sanitize_for_json(content)

    report = Report(
        case_id=str(case_id),
        generated_by=str(generated_by),
        title=f"Forensic Investigation Report — {case.case_number}",
        content_json=clean_content,
        format="JSON",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
