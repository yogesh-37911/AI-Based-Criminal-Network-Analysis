"""
Investigation Graph + Suspect Network Analysis endpoints (Modules 6 & 7).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Entity, EntityRelationship, User, EntityResolutionCandidate
from app.schemas.schemas import GraphResponse, GraphNode, GraphEdge
from app.services.graph_service import build_networkx_graph, compute_network_metrics, shortest_path
from app.api.deps import require_permission

router = APIRouter(prefix="/api/graph", tags=["Investigation Graph"])


@router.get("/case/{case_id}", response_model=GraphResponse)
def get_case_graph(case_id: str, include_metrics: bool = True, db: Session = Depends(get_db),
                    user: User = Depends(require_permission("VIEW_CASE"))):
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    rels = db.query(EntityRelationship).filter(EntityRelationship.case_id == case_id).all()

    nodes = [
        GraphNode(
            id=e.id, label=e.value,
            type=e.entity_type.value if hasattr(e.entity_type, "value") else str(e.entity_type),
        )
        for e in entities
    ]
    edges = [
        GraphEdge(
            id=r.id, source=r.source_entity_id, target=r.target_entity_id,
            type=r.relationship_type.value if hasattr(r.relationship_type, "value") else str(r.relationship_type),
            confidence_label=r.confidence_label.value if hasattr(r.confidence_label, "value") else str(r.confidence_label),
            weight=r.weight,
        )
        for r in rels
    ]

    metrics = None
    if include_metrics:
        g = build_networkx_graph(db, case_id)
        metrics = compute_network_metrics(g)

    return GraphResponse(nodes=nodes, edges=edges, metrics=metrics)


@router.get("/entity/{entity_id}")
def get_entity_neighborhood(entity_id: str, db: Session = Depends(get_db),
                             user: User = Depends(require_permission("VIEW_CASE"))):
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    rels = (
        db.query(EntityRelationship)
        .filter(
            (EntityRelationship.source_entity_id == entity_id)
            | (EntityRelationship.target_entity_id == entity_id)
        )
        .all()
    )
    neighbor_ids = {r.source_entity_id for r in rels} | {r.target_entity_id for r in rels}
    neighbor_ids.discard(entity_id)
    neighbors = db.query(Entity).filter(Entity.id.in_(neighbor_ids)).all()

    return {
        "entity": {"id": entity.id, "value": entity.value, "type": str(entity.entity_type)},
        "neighbors": [{"id": n.id, "value": n.value, "type": str(n.entity_type)} for n in neighbors],
        "relationships": [
            {"id": r.id, "source": r.source_entity_id, "target": r.target_entity_id,
             "type": str(r.relationship_type), "weight": r.weight} for r in rels
        ],
    }


@router.get("/case/{case_id}/path")
def get_shortest_path(case_id: str, source_id: str, target_id: str, db: Session = Depends(get_db),
                       user: User = Depends(require_permission("VIEW_CASE"))):
    g = build_networkx_graph(db, case_id)
    path = shortest_path(g, source_id, target_id)
    if path is None:
        return {"path": None, "message": "No connecting path found in current evidence graph."}
    return {"path": path}


@router.get("/case/{case_id}/resolution-candidates")
def get_resolution_candidates(case_id: str, db: Session = Depends(get_db),
                               user: User = Depends(require_permission("VIEW_CASE"))):
    candidates = (
        db.query(EntityResolutionCandidate)
        .filter(EntityResolutionCandidate.case_id == case_id, EntityResolutionCandidate.reviewed == False)
        .order_by(EntityResolutionCandidate.confidence_score.desc())
        .all()
    )
    entity_ids = {c.entity_a_id for c in candidates} | {c.entity_b_id for c in candidates}
    entities = {e.id: e for e in db.query(Entity).filter(Entity.id.in_(entity_ids)).all()}

    return [
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
        for c in candidates
    ]


@router.post("/resolution-candidates/{candidate_id}/decide")
def decide_candidate(candidate_id: str, decision: str, db: Session = Depends(get_db),
                      user: User = Depends(require_permission("EDIT_CASE"))):
    if decision not in ("CONFIRMED", "REJECTED"):
        raise HTTPException(status_code=400, detail="decision must be CONFIRMED or REJECTED")
    candidate = db.query(EntityResolutionCandidate).filter(EntityResolutionCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.reviewed = True
    candidate.reviewer_decision = decision
    db.commit()
    return {"id": candidate.id, "decision": decision}
