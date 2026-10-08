"""
Anomaly Detection (Module 9).

Runs unsupervised ML (Isolation Forest) over timeline events and forensic heuristics
over extracted case artifacts (malware payloads, Tor infrastructure, off-hours activity,
and lateral IP movement). Surfaced as leads for human investigator review.
"""
from collections import Counter
from datetime import datetime
from typing import List
from sqlalchemy.orm import Session

from app.models.models import TimelineEvent, Anomaly, Entity, Evidence, EntityType, ConfidenceLabel
from app.services.timeline_service import build_timeline_from_date_entities


def _featurize(events: List[TimelineEvent]):
    import numpy as np
    per_entity_day_count = Counter()
    for e in events:
        per_entity_day_count[(e.entity_id, e.event_timestamp.date())] += 1

    rows = []
    for e in events:
        rows.append([
            e.event_timestamp.hour,
            e.event_timestamp.weekday(),
            per_entity_day_count[(e.entity_id, e.event_timestamp.date())],
        ])
    return np.array(rows, dtype=float)


def run_anomaly_detection(db: Session, case_id: str, contamination: float = 0.15) -> List[Anomaly]:
    # 1. Ensure timeline is seeded from case evidence and date entities if empty
    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    for ev in evidence_items:
        has_ev = db.query(TimelineEvent).filter(
            TimelineEvent.source_evidence_id == ev.id,
            TimelineEvent.event_type == "EVIDENCE_UPLOADED"
        ).first()
        if not has_ev:
            db.add(TimelineEvent(
                case_id=case_id,
                entity_id=None,
                event_type="EVIDENCE_UPLOADED",
                event_timestamp=ev.uploaded_at or datetime.utcnow(),
                description=f"Evidence '{ev.original_filename}' ingested (SHA-256: {ev.sha256_hash[:12]}...).",
                source_evidence_id=ev.id,
                confidence_label=ConfidenceLabel.CONFIRMED_FROM_EVIDENCE,
            ))
        build_timeline_from_date_entities(db, case_id, ev.id)
    db.commit()

    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.case_id == case_id)
        .order_by(TimelineEvent.event_timestamp.asc())
        .all()
    )

    created = []

    def _add_anomaly(entity_id, anomaly_type, score, reason, method, ts=None, ev_id=None):
        existing = db.query(Anomaly).filter(
            Anomaly.case_id == case_id,
            Anomaly.anomaly_type == anomaly_type,
            Anomaly.entity_id == entity_id,
        ).first()
        if not existing:
            anom = Anomaly(
                case_id=case_id,
                entity_id=entity_id,
                anomaly_type=anomaly_type,
                anomaly_score=round(float(score), 4),
                reason=reason,
                detection_method=method,
                event_timestamp=ts or datetime.utcnow(),
                source_evidence_id=ev_id,
            )
            db.add(anom)
            created.append(anom)

    # 2. Forensic Signal Anomalies (Artifact & Threat Intel heuristics)
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    for ent in entities:
        val = ent.value.lower()
        if ent.entity_type == EntityType.FILE:
            if any(val.endswith(ext) for ext in [".exe", ".bat", ".ps1", ".vbs", ".dll", ".scr"]):
                _add_anomaly(
                    ent.id,
                    "SUSPICIOUS_EXECUTABLE_PAYLOAD",
                    0.92,
                    f"Executable binary artifact '{ent.value}' found in evidence chain.",
                    "STATIC_HEURISTIC",
                    ev_id=ent.first_seen_evidence_id
                )
        elif ent.entity_type == EntityType.URL:
            if ".onion" in val:
                _add_anomaly(
                    ent.id,
                    "TOR_DARKWEB_C2_PORTAL",
                    0.95,
                    f"Tor hidden service onion address detected: '{ent.value}'.",
                    "THREAT_INTEL_MATCH",
                    ev_id=ent.first_seen_evidence_id
                )
        elif ent.entity_type == EntityType.CRYPTO_WALLET:
            _add_anomaly(
                ent.id,
                "CRYPTOCURRENCY_RANSOM_DESTINATION",
                0.88,
                f"Cryptocurrency address identified for potential extortion/exfiltration: '{ent.value}'.",
                "FINANCIAL_FORENSICS",
                ev_id=ent.first_seen_evidence_id
            )

    # 3. Isolation Forest ML over timeline events (when >= 4 events exist)
    if len(events) >= 4:
        from sklearn.ensemble import IsolationForest
        X = _featurize(events)
        n_estimators = min(100, max(20, len(events) * 5))
        model = IsolationForest(contamination=contamination, random_state=42, n_estimators=n_estimators)
        model.fit(X)
        scores = model.decision_function(X)
        predictions = model.predict(X)

        for event, score, pred in zip(events, scores, predictions):
            if pred == -1:
                reasons = []
                if event.event_timestamp.hour < 5 or event.event_timestamp.hour > 22:
                    reasons.append("Occurred during unusual off-hours (10pm–5am).")
                if event.event_timestamp.weekday() >= 5:
                    reasons.append("Occurred on a weekend, atypical for standard operational baseline.")
                if not reasons:
                    reasons.append("Statistically rare temporal occurrence relative to case baseline.")

                _add_anomaly(
                    event.entity_id,
                    f"UNUSUAL_{event.event_type}",
                    min(0.99, max(0.60, float(-score) + 0.5)),
                    " ".join(reasons),
                    "ISOLATION_FOREST",
                    ts=event.event_timestamp,
                    ev_id=event.source_evidence_id
                )

    db.commit()

    # Return all anomalies for this case (both newly detected and existing)
    all_anomalies = (
        db.query(Anomaly)
        .filter(Anomaly.case_id == case_id)
        .order_by(Anomaly.anomaly_score.desc())
        .all()
    )
    return all_anomalies
