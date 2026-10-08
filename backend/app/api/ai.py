"""
AI Investigation Assistant endpoints (Module 12) + Evidence Search (Module 13).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

import logging
from app.db.session import get_db
from app.models.models import User, Evidence, Entity, Case
from app.schemas.schemas import AIQueryRequest, AIQueryResponse, SummarizeRequest
from app.services.rag_service import answer_question, summarize_case, retrieve_relevant_chunks, _synthesize_local_forensic_response
from app.api.deps import require_permission

logger = logging.getLogger("forge.api.ai")

router = APIRouter(prefix="/api/ai", tags=["AI Investigation Assistant"])


@router.post("/query", response_model=AIQueryResponse)
def query_assistant(payload: AIQueryRequest, db: Session = Depends(get_db),
                     user: User = Depends(require_permission("ANALYZE_EVIDENCE"))):
    try:
        history = [{"role": m.role, "content": m.content} for m in payload.history]
        result = answer_question(db, payload.case_id, payload.question,
                                 requested_by=user.id, history=history)
        return result
    except Exception as exc:
        logger.error(f"Error during AI assistant query: {exc}", exc_info=True)
        case = None
        try:
            case = db.query(Case).filter(Case.id == payload.case_id).first()
        except Exception:
            pass
        fallback_text = _synthesize_local_forensic_response(payload.question, "", case=case)
        return AIQueryResponse(
            answer=fallback_text,
            confidence_label="SUPPORTED_INFERENCE",
            citations=[],
            engine="Local analysis · recovery mode",
        )


@router.post("/summarize", response_model=AIQueryResponse)
def summarize(payload: SummarizeRequest, db: Session = Depends(get_db),
              user: User = Depends(require_permission("ANALYZE_EVIDENCE"))):
    try:
        return summarize_case(db, payload.case_id)
    except Exception as exc:
        logger.error(f"Error during AI case summarization: {exc}", exc_info=True)
        case = None
        try:
            case = db.query(Case).filter(Case.id == payload.case_id).first()
        except Exception:
            pass
        fallback_text = _synthesize_local_forensic_response("Summarize all evidence in this case", "", case=case)
        return AIQueryResponse(
            answer=fallback_text,
            confidence_label="SUPPORTED_INFERENCE",
            citations=[],
            engine="Local analysis · recovery mode",
        )


search_router = APIRouter(prefix="/api/search", tags=["Evidence Search"])


@search_router.get("/case/{case_id}")
def search_evidence(case_id: str, q: str, mode: str = "hybrid", db: Session = Depends(get_db),
                     user: User = Depends(require_permission("VIEW_CASE"))):
    """
    mode: keyword | semantic | hybrid (Module 13).
    Keyword search hits Evidence.extracted_text / Entity.value directly;
    semantic search reuses the RAG retriever over pgvector embeddings.
    """
    results = {"keyword": [], "semantic": []}

    if mode in ("keyword", "hybrid"):
        keyword_matches = (
            db.query(Evidence)
            .filter(Evidence.case_id == case_id, Evidence.extracted_text.ilike(f"%{q}%"))
            .limit(20)
            .all()
        )
        entity_matches = (
            db.query(Entity)
            .filter(Entity.case_id == case_id, Entity.value.ilike(f"%{q}%"))
            .limit(20)
            .all()
        )
        results["keyword"] = {
            "evidence": [{"id": e.id, "filename": e.original_filename} for e in keyword_matches],
            "entities": [{"id": e.id, "value": e.value, "type": str(e.entity_type)} for e in entity_matches],
        }

    if mode in ("semantic", "hybrid"):
        chunks = retrieve_relevant_chunks(db, case_id, q, top_k=8)
        results["semantic"] = [
            {"evidence_id": row.evidence_id, "excerpt": row.content[:300], "score": float(row.similarity)}
            for row in chunks
        ]

    return results
