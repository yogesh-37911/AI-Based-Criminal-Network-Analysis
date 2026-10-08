"""
Pydantic request/response schemas for the FORGE-AI API.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field


# ---------------- Auth ----------------

class UserRegister(BaseModel):
    full_name: str
    email: str
    password: str = Field(min_length=8)
    role: str = "VIEWER"
    department: Optional[str] = None
    badge_id: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str
    mfa_code: Optional[str] = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    department: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------- Cases ----------------

class CaseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    crime_type: Optional[str] = None
    priority: str = "MEDIUM"


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    lead_investigator_id: Optional[str] = None


class CaseOut(BaseModel):
    id: str
    case_number: str
    title: str
    description: Optional[str]
    crime_type: Optional[str]
    status: str
    priority: str
    created_by: str
    lead_investigator_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SuspectCreate(BaseModel):
    name: str
    aliases: Optional[List[str]] = None
    description: Optional[str] = None


class VictimCreate(BaseModel):
    name: str
    contact_info: Optional[str] = None
    description: Optional[str] = None


class NoteCreate(BaseModel):
    content: str


class TaskCreate(BaseModel):
    title: str
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None


# ---------------- Evidence ----------------

class EvidenceOut(BaseModel):
    id: str
    case_id: str
    evidence_type: str
    original_filename: str
    file_size_bytes: int
    sha256_hash: str
    uploaded_by: str
    uploaded_at: datetime
    source: Optional[str]
    description: Optional[str]
    status: str

    class Config:
        from_attributes = True


class HashVerifyOut(BaseModel):
    evidence_id: str
    original_hash: str
    current_hash: str
    matches: bool
    checked_at: datetime


class CustodyRecordOut(BaseModel):
    id: str
    evidence_id: str
    investigator_id: str
    action: str
    timestamp: datetime
    previous_hash: Optional[str]
    current_hash: Optional[str]
    ip_address: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


# ---------------- Entities / Graph ----------------

class EntityOut(BaseModel):
    id: str
    entity_type: str
    value: str
    confidence_score: float

    class Config:
        from_attributes = True


class ExtractedEntity(BaseModel):
    entity_type: str
    value: str
    confidence_score: float
    span_start: Optional[int] = None
    span_end: Optional[int] = None


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    weight: int = 1


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    confidence_label: str
    weight: int = 1


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    metrics: Optional[Dict[str, Any]] = None


class ResolutionCandidateOut(BaseModel):
    id: str
    entity_a_id: str
    entity_b_id: str
    confidence_score: float
    supporting_evidence: Optional[Any]
    reviewed: bool


# ---------------- Timeline ----------------

class TimelineEventOut(BaseModel):
    id: str
    entity_id: Optional[str]
    event_type: str
    event_timestamp: datetime
    description: Optional[str]
    source_evidence_id: Optional[str]
    confidence_label: str

    class Config:
        from_attributes = True


# ---------------- Anomalies ----------------

class AnomalyOut(BaseModel):
    id: str
    entity_id: Optional[str]
    anomaly_type: str
    anomaly_score: float
    reason: str
    detection_method: str
    event_timestamp: Optional[datetime]

    class Config:
        from_attributes = True


# ---------------- AI / RAG ----------------

class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class AIQueryRequest(BaseModel):
    case_id: str
    question: str
    history: List[ChatMessage] = []  # previous turns for multi-turn chat


class EvidenceCitation(BaseModel):
    evidence_id: str
    excerpt: str
    relevance_score: float


class AIQueryResponse(BaseModel):
    answer: str
    confidence_label: str
    citations: List[EvidenceCitation]
    engine: Optional[str] = None
    disclaimer: str = (
        "This response was generated by an AI assistant strictly from indexed "
        "case evidence. It is an investigative aid, not a legal or forensic "
        "conclusion, and must be verified by a qualified investigator."
    )


class SummarizeRequest(BaseModel):
    case_id: str
    scope: str = "case"  # case | evidence
    evidence_id: Optional[str] = None


# ---------------- Reports ----------------

class ReportGenerateRequest(BaseModel):
    case_id: str
    format: str = "JSON"  # JSON | DOCX | PDF


class ReportOut(BaseModel):
    id: str
    case_id: str
    title: str
    format: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------- Threat Intel ----------------

class ThreatCheckRequest(BaseModel):
    case_id: str
    indicator_type: str  # IP | DOMAIN | URL | HASH | EMAIL
    indicator_value: str


class ThreatIndicatorOut(BaseModel):
    indicator_type: str
    indicator_value: str
    source: Optional[str]
    verdict: Optional[str]
    enrichment_available: bool
    raw_response: Optional[Any]
