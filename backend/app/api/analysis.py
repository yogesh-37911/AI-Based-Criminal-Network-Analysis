"""
AI Document Analysis / entity extraction / timeline / anomaly / graph
trigger endpoints (Modules 4, 5, 8, 9).

Kept synchronous for MVP simplicity; in the full spec's architecture
these are queued to Celery workers (see docs/architecture.md) so large
evidence batches don't block the request thread.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Evidence, EvidenceStatus, User, CustodyAction, Entity, EntityResolutionCandidate
from app.services.text_extraction import extract_text
from app.services.entity_extraction import extract_entities
from app.services.correlation_service import persist_entities, build_cooccurrence_edges
from app.services.timeline_service import build_timeline_from_date_entities
from app.services.entity_resolution import find_candidates_for_case
from app.services.anomaly_service import run_anomaly_detection
from app.services.rag_service import index_evidence
from app.services.chain_of_custody import log_custody_event
from app.api.deps import get_current_user, require_permission, write_audit_log
from app.schemas.schemas import ExtractedEntity, AnomalyOut

router = APIRouter(prefix="/api/analysis", tags=["Forensic Analysis"])


@router.post("/document/{evidence_id}")
def analyze_document(evidence_id: str, request: Request, db: Session = Depends(get_db),
                      user: User = Depends(require_permission("ANALYZE_EVIDENCE"))):
    """Runs the full per-document pipeline: text extraction -> NER/regex
    entity extraction -> persistence -> co-occurrence graph edges ->
    timeline seeding -> RAG indexing."""
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    evidence.status = EvidenceStatus.PROCESSING
    db.commit()

    text = extract_text(evidence.stored_path, evidence.evidence_type)
    evidence.extracted_text = text
    db.commit()

    extracted = extract_entities(text)
    entities = persist_entities(db, evidence.case_id, evidence.id, extracted)
    edge_count = build_cooccurrence_edges(db, evidence.case_id, evidence.id, entities)
    date_events = build_timeline_from_date_entities(db, evidence.case_id, evidence.id)
    chunks_indexed = index_evidence(db, evidence)

    evidence.status = EvidenceStatus.ANALYZED
    db.commit()

    log_custody_event(db, evidence, user.id, CustodyAction.ANALYZED,
                       ip_address=request.client.host if request.client else None,
                       notes=f"Automated analysis: {len(entities)} entities, {edge_count} edges.")
    write_audit_log(db, user, "EVIDENCE_ANALYZED", "evidence", evidence.id, request,
                     {"entities": len(entities), "edges": edge_count})

    return {
        "evidence_id": evidence.id,
        "entities_extracted": len(entities),
        "relationship_edges_created": edge_count,
        "timeline_events_created": date_events,
        "rag_chunks_indexed": chunks_indexed,
        "entities": [ExtractedEntity(entity_type=str(e.entity_type.value if hasattr(e.entity_type, 'value') else e.entity_type), value=e.value, confidence_score=e.confidence_score) for e in entities],
    }


@router.post("/entities/{case_id}/resolve")
def resolve_entities(case_id: str, db: Session = Depends(get_db),
                      user: User = Depends(require_permission("ANALYZE_EVIDENCE"))):
    """Module 5 — Entity Resolution: score potential-match candidates
    across the case's extracted entities."""
    new_candidates = find_candidates_for_case(db, case_id)
    all_candidates = (
        db.query(EntityResolutionCandidate)
        .filter(EntityResolutionCandidate.case_id == case_id, EntityResolutionCandidate.reviewed == False)
        .order_by(EntityResolutionCandidate.confidence_score.desc())
        .all()
    )

    entity_ids = {c.entity_a_id for c in all_candidates} | {c.entity_b_id for c in all_candidates}
    from app.models.models import Entity
    entities = {e.id: e for e in db.query(Entity).filter(Entity.id.in_(entity_ids)).all()}

    return {
        "candidates_created": len(new_candidates),
        "candidates": [
            {
                "id": c.id,
                "entity_a_id": c.entity_a_id,
                "entity_b_id": c.entity_b_id,
                "entity_a_value": entities.get(c.entity_a_id).value if entities.get(c.entity_a_id) else "Unknown",
                "entity_b_value": entities.get(c.entity_b_id).value if entities.get(c.entity_b_id) else "Unknown",
                "entity_a_type": str(entities.get(c.entity_a_id).entity_type.value if hasattr(entities.get(c.entity_a_id).entity_type, 'value') else entities.get(c.entity_a_id).entity_type) if entities.get(c.entity_a_id) else "",
                "entity_b_type": str(entities.get(c.entity_b_id).entity_type.value if hasattr(entities.get(c.entity_b_id).entity_type, 'value') else entities.get(c.entity_b_id).entity_type) if entities.get(c.entity_b_id) else "",
                "confidence_score": c.confidence_score,
                "supporting_evidence": c.supporting_evidence,
            }
            for c in all_candidates
        ],
    }


@router.get("/anomaly/{case_id}", response_model=list[AnomalyOut])
def get_anomalies(case_id: str, db: Session = Depends(get_db),
                  user: User = Depends(require_permission("VIEW_CASE"))):
    return db.query(Anomaly).filter(Anomaly.case_id == case_id).order_by(Anomaly.anomaly_score.desc()).all()


@router.post("/anomaly/{case_id}", response_model=list[AnomalyOut])
def detect_anomalies(case_id: str, db: Session = Depends(get_db),
                      user: User = Depends(require_permission("ANALYZE_EVIDENCE"))):
    return run_anomaly_detection(db, case_id)


@router.post("/malware/{evidence_id}")
def analyze_malware(evidence_id: str, request: Request, db: Session = Depends(get_db),
                     user: User = Depends(require_permission("ANALYZE_EVIDENCE"))):
    """Module 11 — safe static file analysis. Never executes the uploaded file."""
    from app.services.malware_analysis import static_analyze_file

    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    result = static_analyze_file(evidence.stored_path)

    log_custody_event(db, evidence, user.id, CustodyAction.ANALYZED,
                       ip_address=request.client.host if request.client else None,
                       notes="Static malware/file analysis executed (read-only).")
    write_audit_log(db, user, "MALWARE_ANALYSIS_RUN", "evidence", evidence.id, request)

    return result
