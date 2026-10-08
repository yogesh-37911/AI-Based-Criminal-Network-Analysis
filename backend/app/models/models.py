"""
FORGE-AI Database Models (SQLAlchemy ORM)
Implements the full schema described in docs/database_schema.md
"""
import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey,
    Enum, JSON, UniqueConstraint, Index
)
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY as PG_ARRAY


class UniversalUUID(TypeDecorator):
    impl = String(36)
    cache_ok = True
    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=False))
        return dialect.type_descriptor(String(36))

def UUID(*args, **kwargs):
    return UniversalUUID()

class StringList(TypeDecorator):
    impl = JSON
    cache_ok = True
    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_ARRAY(String))
        return dialect.type_descriptor(JSON)

def ARRAY(*args, **kwargs):
    return StringList()

class VectorType(TypeDecorator):
    impl = JSON
    cache_ok = True
    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            try:
                from pgvector.sqlalchemy import Vector as PGVector
                return dialect.type_descriptor(PGVector(384))
            except Exception:
                pass
        return dialect.type_descriptor(JSON)

def Vector(*args, **kwargs):
    return VectorType()

from sqlalchemy.orm import relationship

from app.db.session import Base



def gen_uuid():
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# ENUMS
# ---------------------------------------------------------------------------

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    CASE_ADMIN = "CASE_ADMIN"
    INVESTIGATOR = "INVESTIGATOR"
    FORENSIC_ANALYST = "FORENSIC_ANALYST"
    INTELLIGENCE_ANALYST = "INTELLIGENCE_ANALYST"
    AUDITOR = "AUDITOR"
    VIEWER = "VIEWER"


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    EVIDENCE_REVIEW = "EVIDENCE_REVIEW"
    SUSPECT_IDENTIFIED = "SUSPECT_IDENTIFIED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class CasePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EvidenceStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    ANALYZED = "ANALYZED"
    FLAGGED = "FLAGGED"
    ARCHIVED = "ARCHIVED"


class CustodyAction(str, enum.Enum):
    ACQUIRED = "ACQUIRED"
    UPLOADED = "UPLOADED"
    ACCESSED = "ACCESSED"
    ANALYZED = "ANALYZED"
    TRANSFERRED = "TRANSFERRED"
    EXPORTED = "EXPORTED"
    MODIFICATION_ATTEMPT = "MODIFICATION_ATTEMPT"
    HASH_VERIFIED = "HASH_VERIFIED"


class EntityType(str, enum.Enum):
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    LOCATION = "LOCATION"
    PHONE_NUMBER = "PHONE_NUMBER"
    EMAIL = "EMAIL"
    IP_ADDRESS = "IP_ADDRESS"
    DOMAIN = "DOMAIN"
    URL = "URL"
    DEVICE = "DEVICE"
    VEHICLE = "VEHICLE"
    BANK_ACCOUNT = "BANK_ACCOUNT"
    TRANSACTION_ID = "TRANSACTION_ID"
    DATE = "DATE"
    TIME = "TIME"
    FILE = "FILE"
    MALWARE = "MALWARE"
    CRYPTO_WALLET = "CRYPTO_WALLET"
    SOCIAL_MEDIA_ACCOUNT = "SOCIAL_MEDIA_ACCOUNT"


class RelationshipType(str, enum.Enum):
    CALLED = "CALLED"
    EMAILED = "EMAILED"
    TRANSFERRED_MONEY = "TRANSFERRED_MONEY"
    LOGGED_IN_FROM = "LOGGED_IN_FROM"
    USED_DEVICE = "USED_DEVICE"
    VISITED = "VISITED"
    CONNECTED_TO = "CONNECTED_TO"
    OWNS = "OWNS"
    WORKED_FOR = "WORKED_FOR"
    LOCATED_AT = "LOCATED_AT"
    ASSOCIATED_WITH = "ASSOCIATED_WITH"
    MENTIONED_IN = "MENTIONED_IN"
    SHARED_FILE = "SHARED_FILE"
    COMMUNICATED_WITH = "COMMUNICATED_WITH"


class ConfidenceLabel(str, enum.Enum):
    CONFIRMED_FROM_EVIDENCE = "CONFIRMED_FROM_EVIDENCE"
    SUPPORTED_INFERENCE = "SUPPORTED_INFERENCE"
    POTENTIAL_CONNECTION = "POTENTIAL_CONNECTION"
    ANOMALY = "ANOMALY"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class DataProvenance(str, enum.Enum):
    ORIGINAL_EVIDENCE = "ORIGINAL_EVIDENCE"
    DERIVED_DATA = "DERIVED_DATA"
    AI_GENERATED_ANALYSIS = "AI_GENERATED_ANALYSIS"
    INVESTIGATOR_NOTES = "INVESTIGATOR_NOTES"


# ---------------------------------------------------------------------------
# USERS / RBAC / AUDIT
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    badge_id = Column(String(50), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.VIEWER)
    department = Column(String(150), nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    sessions = relationship("UserSession", back_populates="user")


class UserSession(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    refresh_token_hash = Column(String(255), nullable=False)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)

    user = relationship("User", back_populates="sessions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(64), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# CASE MANAGEMENT
# ---------------------------------------------------------------------------

class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    crime_type = Column(String(100), nullable=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN)
    priority = Column(Enum(CasePriority), default=CasePriority.MEDIUM)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    lead_investigator_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    members = relationship("CaseMember", back_populates="case", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")


class CaseMember(Base):
    __tablename__ = "case_members"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    role_on_case = Column(String(50), default="INVESTIGATOR")
    added_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="members")
    __table_args__ = (UniqueConstraint("case_id", "user_id", name="uq_case_member"),)


class Suspect(Base):
    __tablename__ = "suspects"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    name = Column(String(150), nullable=False)
    aliases = Column(ARRAY(String), nullable=True)
    description = Column(Text, nullable=True)
    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.id"), nullable=True)
    added_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Victim(Base):
    __tablename__ = "victims"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    name = Column(String(150), nullable=False)
    contact_info = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.id"), nullable=True)
    added_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class InvestigatorNote(Base):
    __tablename__ = "investigator_notes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    author_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    provenance = Column(Enum(DataProvenance), default=DataProvenance.INVESTIGATOR_NOTES)
    created_at = Column(DateTime, default=datetime.utcnow)


class CaseTask(Base):
    __tablename__ = "case_tasks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    title = Column(String(200), nullable=False)
    assigned_to = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    status = Column(String(30), default="OPEN")
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    author_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# EVIDENCE / CHAIN OF CUSTODY
# ---------------------------------------------------------------------------

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    evidence_type = Column(String(50), nullable=False)  # PDF, CSV, PCAP, LOG, IMAGE, etc.
    original_filename = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    uploaded_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    source = Column(String(150), nullable=True)  # e.g. "Seized device", "ISP records"
    description = Column(Text, nullable=True)
    status = Column(Enum(EvidenceStatus), default=EvidenceStatus.UPLOADED)
    extracted_text = Column(Text, nullable=True)
    provenance = Column(Enum(DataProvenance), default=DataProvenance.ORIGINAL_EVIDENCE)

    case = relationship("Case", back_populates="evidence_items")
    hashes = relationship("EvidenceHash", back_populates="evidence", cascade="all, delete-orphan")
    custody_records = relationship("ChainOfCustody", back_populates="evidence", cascade="all, delete-orphan")


class EvidenceHash(Base):
    """Versioned hash history — supports tamper detection across re-verification events."""
    __tablename__ = "evidence_hashes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    evidence_id = Column(UUID(as_uuid=False), ForeignKey("evidence.id"), nullable=False)
    algorithm = Column(String(20), default="SHA-256")
    hash_value = Column(String(128), nullable=False)
    computed_at = Column(DateTime, default=datetime.utcnow)
    matches_original = Column(Boolean, default=True)

    evidence = relationship("Evidence", back_populates="hashes")


class ChainOfCustody(Base):
    __tablename__ = "chain_of_custody"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    evidence_id = Column(UUID(as_uuid=False), ForeignKey("evidence.id"), nullable=False)
    investigator_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    action = Column(Enum(CustodyAction), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    previous_hash = Column(String(128), nullable=True)
    current_hash = Column(String(128), nullable=True)
    ip_address = Column(String(64), nullable=True)
    session_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    evidence = relationship("Evidence", back_populates="custody_records")


class EvidenceChunk(Base):
    """Chunked + embedded evidence text for the RAG pipeline (pgvector)."""
    __tablename__ = "evidence_chunks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    evidence_id = Column(UUID(as_uuid=False), ForeignKey("evidence.id"), nullable=False)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=True)  # all-MiniLM-L6-v2 dim
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index("ix_evidence_chunks_case", "case_id"),)


# ---------------------------------------------------------------------------
# ENTITIES / RELATIONSHIPS / TIMELINE
# ---------------------------------------------------------------------------

class Entity(Base):
    __tablename__ = "entities"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    entity_type = Column(Enum(EntityType), nullable=False)
    value = Column(String(500), nullable=False)  # canonical/display value
    normalized_value = Column(String(500), nullable=True, index=True)  # lower/stripped form for matching
    confidence_score = Column(Float, default=1.0)
    first_seen_evidence_id = Column(UUID(as_uuid=False), ForeignKey("evidence.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    aliases = relationship("EntityAlias", back_populates="entity", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_entities_case_type", "case_id", "entity_type"),)


class EntityAlias(Base):
    """Different surface forms across sources that may refer to the same real-world entity."""
    __tablename__ = "entity_aliases"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.id"), nullable=False)
    alias_value = Column(String(500), nullable=False)
    source_evidence_id = Column(UUID(as_uuid=False), ForeignKey("evidence.id"), nullable=True)

    entity = relationship("Entity", back_populates="aliases")


class EntityResolutionCandidate(Base):
    """Potential-match suggestions between two entities — never auto-merged."""
    __tablename__ = "entity_resolution_candidates"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    entity_a_id = Column(UUID(as_uuid=False), ForeignKey("entities.id"), nullable=False)
    entity_b_id = Column(UUID(as_uuid=False), ForeignKey("entities.id"), nullable=False)
    confidence_score = Column(Float, nullable=False)
    supporting_evidence = Column(JSON, nullable=True)  # list of reasons/evidence ids
    reviewed = Column(Boolean, default=False)
    reviewer_decision = Column(String(20), nullable=True)  # CONFIRMED / REJECTED / null
    created_at = Column(DateTime, default=datetime.utcnow)


class EntityRelationship(Base):
    __tablename__ = "relationships"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    source_entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.id"), nullable=False)
    target_entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.id"), nullable=False)
    relationship_type = Column(Enum(RelationshipType), nullable=False)
    confidence_label = Column(Enum(ConfidenceLabel), default=ConfidenceLabel.POTENTIAL_CONNECTION)
    weight = Column(Integer, default=1)  # number of co-occurrences / supporting mentions
    evidence_ids = Column(ARRAY(String), nullable=True)
    first_observed = Column(DateTime, nullable=True)
    last_observed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index("ix_relationships_case", "case_id"),)


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.id"), nullable=True)
    event_type = Column(String(80), nullable=False)  # CALL, EMAIL, LOGIN, TRANSACTION, FILE_CREATED...
    event_timestamp = Column(DateTime, nullable=False, index=True)
    description = Column(Text, nullable=True)
    source_evidence_id = Column(UUID(as_uuid=False), ForeignKey("evidence.id"), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    confidence_label = Column(Enum(ConfidenceLabel), default=ConfidenceLabel.CONFIRMED_FROM_EVIDENCE)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index("ix_timeline_case_ts", "case_id", "event_timestamp"),)


# ---------------------------------------------------------------------------
# AI ANALYSIS / ANOMALIES / THREAT INTEL
# ---------------------------------------------------------------------------

class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    analysis_type = Column(String(50), nullable=False)  # SUMMARY, QUERY, REPORT_SECTION
    query_text = Column(Text, nullable=True)
    result_text = Column(Text, nullable=False)
    confidence_label = Column(Enum(ConfidenceLabel), default=ConfidenceLabel.SUPPORTED_INFERENCE)
    cited_evidence_ids = Column(ARRAY(String), nullable=True)
    provenance = Column(Enum(DataProvenance), default=DataProvenance.AI_GENERATED_ANALYSIS)
    requested_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    entity_id = Column(UUID(as_uuid=False), ForeignKey("entities.id"), nullable=True)
    anomaly_type = Column(String(80), nullable=False)
    anomaly_score = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    detection_method = Column(String(50), nullable=False)  # ISOLATION_FOREST, DBSCAN, STATISTICAL
    event_timestamp = Column(DateTime, nullable=True)
    source_evidence_id = Column(UUID(as_uuid=False), ForeignKey("evidence.id"), nullable=True)
    reviewed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ThreatIndicator(Base):
    __tablename__ = "threat_indicators"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    indicator_type = Column(String(30), nullable=False)  # IP, DOMAIN, URL, HASH, EMAIL
    indicator_value = Column(String(500), nullable=False)
    source = Column(String(50), nullable=True)  # VirusTotal, AbuseIPDB, WHOIS...
    verdict = Column(String(30), nullable=True)  # MALICIOUS, SUSPICIOUS, CLEAN, UNKNOWN
    raw_response = Column(JSON, nullable=True)
    enrichment_available = Column(Boolean, default=False)
    checked_at = Column(DateTime, default=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    case_id = Column(UUID(as_uuid=False), ForeignKey("cases.id"), nullable=False)
    generated_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content_json = Column(JSON, nullable=False)
    file_path = Column(String(500), nullable=True)
    format = Column(String(10), default="JSON")  # PDF, DOCX, JSON
    created_at = Column(DateTime, default=datetime.utcnow)
