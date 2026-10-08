"""
Demo data seeder — creates realistic sample cases, evidence references,
entities, relationships, timeline events, and anomalies so the platform
has meaningful data on first boot.

Run with:  python seed_demo.py
"""
from datetime import datetime, timedelta
from hashlib import sha256
from pathlib import Path
import random

from app.db.session import SessionLocal
from app.models.models import (
    User, Case, CaseMember, Evidence, Entity, EntityRelationship,
    TimelineEvent, Anomaly, Suspect, Victim, InvestigatorNote,
    EvidenceHash, ChainOfCustody, EvidenceChunk,
    CaseStatus, CasePriority, EvidenceStatus, EntityType,
    RelationshipType, ConfidenceLabel, DataProvenance, RoleEnum, CustodyAction,
)
from app.core.security import hash_password
from app.core.config import settings

db = SessionLocal()

# ---------- Helpers ----------

def _ago(days: int, hours: int = 0) -> datetime:
    return datetime.utcnow() - timedelta(days=days, hours=hours)


def _seed_rich_case(spec):
    """Create one idempotent, fully searchable synthetic case fixture."""
    if db.query(Case).filter(Case.case_number == spec["case_number"]).first():
        print(f"  [=] Case {spec['case_number']} already exists; skipping.")
        return

    case = Case(
        case_number=spec["case_number"], title=spec["title"],
        description=spec["description"], crime_type=spec["crime_type"],
        status=spec["status"], priority=spec["priority"],
        created_by=admin.id, lead_investigator_id=spec["lead"].id,
        created_at=_ago(spec["created_days_ago"]),
    )
    db.add(case)
    db.flush()

    member_ids = {admin.id, spec["lead"].id, *[u.id for u in spec.get("members", [])]}
    for user_id in member_ids:
        db.add(CaseMember(case_id=case.id, user_id=user_id))

    upload_root = Path(settings.UPLOAD_DIR)
    if not upload_root.is_absolute():
        upload_root = Path(__file__).resolve().parent / upload_root
    case_dir = upload_root / case.case_number
    case_dir.mkdir(parents=True, exist_ok=True)

    evidence_by_key = {}
    for item in spec["evidence"]:
        content = item["content"].strip() + "\n"
        content_bytes = content.encode("utf-8")
        stored_path = case_dir / item["filename"]
        stored_path.write_bytes(content_bytes)
        digest = sha256(content_bytes).hexdigest()
        evidence = Evidence(
            case_id=case.id,
            evidence_type=item["type"],
            original_filename=item["filename"],
            stored_path=str(stored_path),
            file_size_bytes=len(content_bytes),
            sha256_hash=digest,
            uploaded_by=spec["lead"].id,
            uploaded_at=_ago(item["days_ago"]),
            source=item["source"],
            description=item["description"],
            status=EvidenceStatus.ANALYZED,
            extracted_text=content,
        )
        db.add(evidence)
        db.flush()
        evidence_by_key[item["key"]] = evidence

        db.add(EvidenceHash(evidence_id=evidence.id, hash_value=digest, matches_original=True))
        db.add(ChainOfCustody(
            evidence_id=evidence.id,
            investigator_id=spec["lead"].id,
            action=CustodyAction.UPLOADED,
            timestamp=evidence.uploaded_at,
            current_hash=digest,
            notes="Synthetic demo fixture seeded locally; this is not a real acquisition.",
        ))

        # Pre-index chunks without requiring a model download. The RAG service
        # can rank these lexically when local embeddings are unavailable.
        text_value = content
        start = 0
        chunk_index = 0
        while start < len(text_value):
            end = min(start + 800, len(text_value))
            db.add(EvidenceChunk(
                evidence_id=evidence.id, case_id=case.id,
                chunk_index=chunk_index, content=text_value[start:end],
                embedding=None,
            ))
            if end == len(text_value):
                break
            start += 680
            chunk_index += 1

    entities_by_value = {}
    for item in spec["entities"]:
        entity = Entity(
            case_id=case.id,
            entity_type=EntityType(item["type"]),
            value=item["value"],
            normalized_value=item["value"].strip().lower(),
            confidence_score=item.get("confidence", 0.95),
            first_seen_evidence_id=evidence_by_key[item["evidence"]].id if item.get("evidence") else None,
        )
        db.add(entity)
        db.flush()
        entities_by_value[item["value"]] = entity

    for src, target, rel_type, confidence, evidence_keys, weight in spec["relationships"]:
        days_by_key = {entry["key"]: entry["days_ago"] for entry in spec["evidence"]}
        observed = [_ago(days_by_key[key]) for key in evidence_keys]
        db.add(EntityRelationship(
            case_id=case.id,
            source_entity_id=entities_by_value[src].id,
            target_entity_id=entities_by_value[target].id,
            relationship_type=RelationshipType(rel_type),
            confidence_label=ConfidenceLabel(confidence),
            weight=weight,
            evidence_ids=[str(evidence_by_key[key].id) for key in evidence_keys],
            first_observed=min(observed) if observed else None,
            last_observed=max(observed) if observed else None,
        ))

    for days_ago, hours_ago, event_type, description, evidence_key, entity_value, confidence in spec["timeline"]:
        db.add(TimelineEvent(
            case_id=case.id,
            entity_id=entities_by_value[entity_value].id if entity_value else None,
            event_type=event_type,
            event_timestamp=_ago(days_ago, hours_ago),
            description=description,
            source_evidence_id=evidence_by_key[evidence_key].id if evidence_key else None,
            confidence_label=ConfidenceLabel(confidence),
        ))

    for entity_value, anomaly_type, score, reason, evidence_key in spec.get("anomalies", []):
        db.add(Anomaly(
            case_id=case.id,
            entity_id=entities_by_value[entity_value].id if entity_value else None,
            anomaly_type=anomaly_type,
            anomaly_score=score,
            reason=reason,
            detection_method="DEMO_REVIEW_RULE",
            source_evidence_id=evidence_by_key[evidence_key].id if evidence_key else None,
        ))

    for name, entity_value, description, aliases in spec.get("suspects", []):
        db.add(Suspect(
            case_id=case.id, name=name,
            entity_id=entities_by_value[entity_value].id if entity_value else None,
            description=description, added_by=spec["lead"].id, aliases=aliases,
        ))
    for name, entity_value, description in spec.get("victims", []):
        db.add(Victim(
            case_id=case.id, name=name,
            entity_id=entities_by_value[entity_value].id if entity_value else None,
            description=description, added_by=spec["lead"].id,
        ))
    for note in spec.get("notes", []):
        db.add(InvestigatorNote(
            case_id=case.id, author_id=spec["lead"].id,
            content=note, provenance=DataProvenance.INVESTIGATOR_NOTES,
        ))

    db.flush()
    print(f"  [+] Case {case.case_number} seeded: {case.title} ({len(evidence_by_key)} evidence files)")


# ---------- Additional Users ----------

def get_or_create_user(email, full_name, role, dept):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            full_name=full_name,
            email=email,
            hashed_password=hash_password("ChangeMe123!"),
            role=role,
            department=dept,
        )
        db.add(user)
        db.flush()
    return user


admin = db.query(User).filter(User.email == "admin@forge-ai.local").first()
if not admin:
    print("Run 'python seed.py' first to create the admin user.")
    exit(1)

investigator1 = get_or_create_user(
    "j.martinez@forge-ai.local", "Det. Julia Martinez",
    RoleEnum.INVESTIGATOR, "Cybercrime Division"
)
investigator2 = get_or_create_user(
    "r.chen@forge-ai.local", "Agent Robert Chen",
    RoleEnum.FORENSIC_ANALYST, "Digital Forensics Lab"
)
analyst = get_or_create_user(
    "s.patel@forge-ai.local", "Analyst Sneha Patel",
    RoleEnum.INTELLIGENCE_ANALYST, "Threat Intelligence"
)


# ============================================================
# CASE 1 — Ransomware Attack on Municipal Network
# ============================================================

def seed_case_1():
    if db.query(Case).filter(Case.case_number == "FORGE-2024-0001").first():
        return
    case = Case(
        case_number="FORGE-2024-0001",
        title="BlackVeil Ransomware Attack — City of Westridge Municipal Network",
        description=(
            "On Jan 12 2024, the City of Westridge IT department detected a ransomware "
            "infection spreading across 47 endpoints in the municipal network. The strain "
            "has been identified as BlackVeil v3. Attackers demanded 15 BTC via a Tor-hosted "
            "portal. Initial vector appears to be a spear-phishing email targeting the HR dept."
        ),
        crime_type="Ransomware / Cyber Extortion",
        status=CaseStatus.UNDER_INVESTIGATION,
        priority=CasePriority.CRITICAL,
        created_by=admin.id,
        lead_investigator_id=investigator1.id,
        created_at=_ago(90),
    )
    db.add(case)
    db.flush()

    # Members
    for uid in [admin.id, investigator1.id, investigator2.id, analyst.id]:
        db.add(CaseMember(case_id=case.id, user_id=uid))

    # Evidence items (metadata-only — no real files)
    ev1 = Evidence(
        case_id=case.id, evidence_type="EMAIL", original_filename="phishing_email_hr_dept.eml",
        stored_path="uploads/FORGE-2024-0001/phishing_email_hr_dept.eml",
        file_size_bytes=245_800, sha256_hash="a3f5c9d1e7b248f6901234567890abcdef1234567890abcdef12345678901234",
        uploaded_by=investigator1.id, uploaded_at=_ago(88),
        source="Seized workstation — HR-PC-07", description="Spear-phishing email with malicious .docm attachment.",
        status=EvidenceStatus.ANALYZED, extracted_text="Subject: Urgent — Updated Benefits Enrollment\nFrom: hr-benefits@westridge-gov.org..."
    )
    ev2 = Evidence(
        case_id=case.id, evidence_type="BINARY", original_filename="blackveil_payload.exe",
        stored_path="uploads/FORGE-2024-0001/blackveil_payload.exe",
        file_size_bytes=1_248_000, sha256_hash="d4e5f6a7b8c9012345678901abcdef234567890abcdef234567890abcdef1234",
        uploaded_by=investigator2.id, uploaded_at=_ago(87),
        source="Memory dump — DC-MAIN-01", description="Extracted ransomware binary from infected domain controller.",
        status=EvidenceStatus.FLAGGED
    )
    ev3 = Evidence(
        case_id=case.id, evidence_type="LOG", original_filename="firewall_logs_jan12.csv",
        stored_path="uploads/FORGE-2024-0001/firewall_logs_jan12.csv",
        file_size_bytes=5_600_000, sha256_hash="b2c3d4e5f6a78901234567890abcdef1234567890abcdef1234567890abcdef1",
        uploaded_by=investigator1.id, uploaded_at=_ago(86),
        source="Palo Alto FW — perimeter", description="Firewall connection logs showing C2 beaconing traffic.",
        status=EvidenceStatus.ANALYZED
    )
    ev4 = Evidence(
        case_id=case.id, evidence_type="PDF", original_filename="ransom_note_screenshot.pdf",
        stored_path="uploads/FORGE-2024-0001/ransom_note_screenshot.pdf",
        file_size_bytes=312_000, sha256_hash="c1d2e3f4a5b6789012345678abcdef901234567890abcdef1234567890abcdef",
        uploaded_by=investigator1.id, uploaded_at=_ago(85),
        source="Affected endpoint — FIN-WS-03", description="Screenshot of ransomware lock screen with BTC address.",
        status=EvidenceStatus.ANALYZED, extracted_text="YOUR FILES HAVE BEEN ENCRYPTED. Send 15 BTC to bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh..."
    )
    for ev in [ev1, ev2, ev3, ev4]:
        db.add(ev)
    db.flush()

    # Entities
    entities = {}
    entity_data = [
        ("PERSON", "Viktor Sorokin", ev1.id),
        ("EMAIL", "hr-benefits@westridge-gov.org", ev1.id),
        ("IP_ADDRESS", "185.220.101.45", ev3.id),
        ("IP_ADDRESS", "91.219.237.12", ev3.id),
        ("DOMAIN", "blackveil-unlock.onion", ev4.id),
        ("CRYPTO_WALLET", "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", ev4.id),
        ("FILE", "blackveil_payload.exe", ev2.id),
        ("FILE", "UpdatedBenefits.docm", ev1.id),
        ("ORGANIZATION", "City of Westridge IT", None),
        ("DEVICE", "HR-PC-07", ev1.id),
        ("DEVICE", "DC-MAIN-01", ev2.id),
        ("URL", "http://blackveil-unlock.onion/pay/WR-2024", ev4.id),
    ]
    for etype, val, ev_id in entity_data:
        ent = Entity(
            case_id=case.id, entity_type=EntityType(etype), value=val,
            normalized_value=val.lower(), first_seen_evidence_id=ev_id,
        )
        db.add(ent)
        db.flush()
        entities[val] = ent

    # Relationships
    rels = [
        ("hr-benefits@westridge-gov.org", "HR-PC-07", RelationshipType.EMAILED),
        ("HR-PC-07", "DC-MAIN-01", RelationshipType.CONNECTED_TO),
        ("blackveil_payload.exe", "DC-MAIN-01", RelationshipType.ASSOCIATED_WITH),
        ("185.220.101.45", "DC-MAIN-01", RelationshipType.CONNECTED_TO),
        ("91.219.237.12", "blackveil-unlock.onion", RelationshipType.ASSOCIATED_WITH),
        ("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "blackveil-unlock.onion", RelationshipType.ASSOCIATED_WITH),
        ("Viktor Sorokin", "hr-benefits@westridge-gov.org", RelationshipType.OWNS),
        ("UpdatedBenefits.docm", "blackveil_payload.exe", RelationshipType.ASSOCIATED_WITH),
    ]
    for src, tgt, rtype in rels:
        db.add(EntityRelationship(
            case_id=case.id, source_entity_id=entities[src].id,
            target_entity_id=entities[tgt].id, relationship_type=rtype,
            confidence_label=ConfidenceLabel.SUPPORTED_INFERENCE,
        ))

    # Timeline
    timeline = [
        (_ago(90, 14), "EMAIL_RECEIVED", "Spear-phishing email received by HR-PC-07.", ev1.id, entities.get("HR-PC-07")),
        (_ago(90, 13), "FILE_OPENED", "User opened UpdatedBenefits.docm attachment.", ev1.id, entities.get("UpdatedBenefits.docm")),
        (_ago(90, 13), "MALWARE_EXECUTION", "blackveil_payload.exe dropped and executed.", ev2.id, entities.get("blackveil_payload.exe")),
        (_ago(90, 12), "C2_BEACON", "Outbound C2 beacon to 185.220.101.45:443 detected.", ev3.id, entities.get("185.220.101.45")),
        (_ago(90, 10), "LATERAL_MOVEMENT", "RDP connection from HR-PC-07 to DC-MAIN-01 using stolen creds.", ev3.id, entities.get("DC-MAIN-01")),
        (_ago(90, 8), "ENCRYPTION", "Mass file encryption began on DC-MAIN-01 (47 shares affected).", ev2.id, entities.get("DC-MAIN-01")),
        (_ago(90, 6), "RANSOM_NOTE", "Ransom note displayed — 15 BTC demanded via Tor portal.", ev4.id, entities.get("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")),
        (_ago(89), "INCIDENT_REPORTED", "IT staff reported ransomware to CISO.", None, entities.get("City of Westridge IT")),
        (_ago(88), "EVIDENCE_ACQUIRED", "Forensic image of HR-PC-07 acquired.", ev1.id, entities.get("HR-PC-07")),
    ]
    for ts, etype, desc, ev_id, ent in timeline:
        db.add(TimelineEvent(
            case_id=case.id, entity_id=ent.id if ent else None, event_type=etype,
            event_timestamp=ts, description=desc, source_evidence_id=ev_id,
            confidence_label=ConfidenceLabel.CONFIRMED_FROM_EVIDENCE,
        ))

    # Anomalies
    anomalies = [
        (entities["blackveil_payload.exe"].id, "SUSPICIOUS_EXECUTABLE_PAYLOAD", 0.96,
         "Known ransomware binary 'BlackVeil v3' identified via static analysis.", "STATIC_HEURISTIC"),
        (entities["blackveil-unlock.onion"].id, "TOR_DARKWEB_C2_PORTAL", 0.98,
         "Tor hidden-service payment portal linked to BlackVeil ransomware gang.", "THREAT_INTEL_MATCH"),
        (entities["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"].id, "CRYPTOCURRENCY_RANSOM_DESTINATION", 0.94,
         "BTC address used in ransom demand, linked to previous BlackVeil campaigns.", "FINANCIAL_FORENSICS"),
        (entities["185.220.101.45"].id, "KNOWN_TOR_EXIT_NODE", 0.91,
         "IP flagged as Tor exit node used for C2 communication.", "THREAT_INTEL_MATCH"),
    ]
    for ent_id, atype, score, reason, method in anomalies:
        db.add(Anomaly(
            case_id=case.id, entity_id=ent_id, anomaly_type=atype,
            anomaly_score=score, reason=reason, detection_method=method,
        ))

    # Suspects & Victims
    db.add(Suspect(
        case_id=case.id, name="Viktor Sorokin", entity_id=entities["Viktor Sorokin"].id,
        description="Suspected operator of BlackVeil RaaS platform. Known aliases: 'DarkVeil', 'v0rt3x'.",
        added_by=investigator1.id, aliases=["DarkVeil", "v0rt3x"],
    ))
    db.add(Victim(
        case_id=case.id, name="City of Westridge Municipal Government",
        description="47 endpoints encrypted, HR and Finance departments impacted.",
        added_by=investigator1.id,
    ))

    # Investigator notes
    db.add(InvestigatorNote(
        case_id=case.id, author_id=investigator1.id,
        content="Initial triage complete. The phishing email bypassed the Barracuda gateway due to a spoofed internal sender domain. The .docm macro dropped a PowerShell stager that fetched the main payload from 185.220.101.45. Lateral movement to DC was via RDP with credentials harvested by Mimikatz.",
        provenance=DataProvenance.INVESTIGATOR_NOTES,
    ))

    print(f"  [+] Case {case.case_number} seeded: {case.title}")


# ============================================================
# CASE 2 — Financial Fraud & Money Laundering Ring
# ============================================================

def seed_case_2():
    if db.query(Case).filter(Case.case_number == "FORGE-2024-0042").first():
        return
    case = Case(
        case_number="FORGE-2024-0042",
        title="Operation Shadow Ledger — Corporate Embezzlement & Crypto Laundering",
        description=(
            "Investigation into Marcus Webb, CFO of Nextera Solutions Inc., suspected of "
            "embezzling $2.3M through fraudulent vendor invoices and laundering proceeds via "
            "cryptocurrency mixing services. Suspicious wire transfers flagged by FinCEN SAR."
        ),
        crime_type="Financial Fraud / Money Laundering",
        status=CaseStatus.EVIDENCE_REVIEW,
        priority=CasePriority.HIGH,
        created_by=admin.id,
        lead_investigator_id=analyst.id,
        created_at=_ago(45),
    )
    db.add(case)
    db.flush()

    for uid in [admin.id, investigator1.id, analyst.id]:
        db.add(CaseMember(case_id=case.id, user_id=uid))

    ev1 = Evidence(
        case_id=case.id, evidence_type="PDF", original_filename="fincen_sar_report.pdf",
        stored_path="uploads/FORGE-2024-0042/fincen_sar_report.pdf",
        file_size_bytes=890_000, sha256_hash="e5f6a7b8c9d0123456789012abcdef3456789012abcdef3456789012abcdef34",
        uploaded_by=analyst.id, uploaded_at=_ago(44),
        source="FinCEN SAR Filing", description="Suspicious Activity Report flagging unusual wire transfers.",
        status=EvidenceStatus.ANALYZED
    )
    ev2 = Evidence(
        case_id=case.id, evidence_type="CSV", original_filename="nextera_bank_statements_q1q2.csv",
        stored_path="uploads/FORGE-2024-0042/nextera_bank_statements_q1q2.csv",
        file_size_bytes=2_100_000, sha256_hash="f6a7b8c9d0e1234567890123abcdef4567890123abcdef4567890123abcdef45",
        uploaded_by=analyst.id, uploaded_at=_ago(43),
        source="Subpoena — First National Bank", description="6 months of corporate account statements.",
        status=EvidenceStatus.ANALYZED
    )
    ev3 = Evidence(
        case_id=case.id, evidence_type="PDF", original_filename="shell_company_invoices.pdf",
        stored_path="uploads/FORGE-2024-0042/shell_company_invoices.pdf",
        file_size_bytes=456_000, sha256_hash="a7b8c9d0e1f23456789012345abcdef56789012345abcdef56789012345abcde",
        uploaded_by=investigator1.id, uploaded_at=_ago(40),
        source="Nextera AP records", description="Invoices from 'Apex Consulting LLC' — suspected shell company.",
        status=EvidenceStatus.FLAGGED
    )
    for ev in [ev1, ev2, ev3]:
        db.add(ev)
    db.flush()

    entities = {}
    entity_data = [
        ("PERSON", "Marcus Webb", ev1.id),
        ("ORGANIZATION", "Nextera Solutions Inc.", ev2.id),
        ("ORGANIZATION", "Apex Consulting LLC", ev3.id),
        ("BANK_ACCOUNT", "FNB-****4891 (Nextera Corp)", ev2.id),
        ("BANK_ACCOUNT", "CBK-****7723 (Apex Consulting)", ev3.id),
        ("CRYPTO_WALLET", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", ev2.id),
        ("TRANSACTION_ID", "WIRE-2024-03-15-0891", ev2.id),
        ("TRANSACTION_ID", "WIRE-2024-04-22-1247", ev2.id),
        ("EMAIL", "m.webb@nextera-solutions.com", ev1.id),
        ("EMAIL", "accounts@apex-consulting.net", ev3.id),
    ]
    for etype, val, ev_id in entity_data:
        ent = Entity(
            case_id=case.id, entity_type=EntityType(etype), value=val,
            normalized_value=val.lower(), first_seen_evidence_id=ev_id,
        )
        db.add(ent)
        db.flush()
        entities[val] = ent

    rels = [
        ("Marcus Webb", "Nextera Solutions Inc.", RelationshipType.WORKED_FOR),
        ("Marcus Webb", "m.webb@nextera-solutions.com", RelationshipType.OWNS),
        ("Marcus Webb", "Apex Consulting LLC", RelationshipType.OWNS),
        ("FNB-****4891 (Nextera Corp)", "CBK-****7723 (Apex Consulting)", RelationshipType.TRANSFERRED_MONEY),
        ("Apex Consulting LLC", "accounts@apex-consulting.net", RelationshipType.OWNS),
        ("CBK-****7723 (Apex Consulting)", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", RelationshipType.TRANSFERRED_MONEY),
    ]
    for src, tgt, rtype in rels:
        db.add(EntityRelationship(
            case_id=case.id, source_entity_id=entities[src].id,
            target_entity_id=entities[tgt].id, relationship_type=rtype,
            confidence_label=ConfidenceLabel.SUPPORTED_INFERENCE, weight=3,
        ))

    timeline = [
        (_ago(120), "WIRE_TRANSFER", "Wire $185,000 from Nextera Corp to Apex Consulting LLC.", ev2.id, entities.get("WIRE-2024-03-15-0891")),
        (_ago(95), "WIRE_TRANSFER", "Wire $240,000 from Nextera Corp to Apex Consulting LLC.", ev2.id, entities.get("WIRE-2024-04-22-1247")),
        (_ago(80), "CRYPTO_TRANSFER", "Funds converted to ETH and routed through Tornado Cash mixer.", ev2.id, entities.get("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D")),
        (_ago(60), "SAR_FILED", "FinCEN SAR filed by First National Bank compliance officer.", ev1.id, entities.get("FNB-****4891 (Nextera Corp)")),
        (_ago(44), "EVIDENCE_ACQUIRED", "Bank statements subpoenaed and ingested.", ev2.id, None),
    ]
    for ts, etype, desc, ev_id, ent in timeline:
        db.add(TimelineEvent(
            case_id=case.id, entity_id=ent.id if ent else None, event_type=etype,
            event_timestamp=ts, description=desc, source_evidence_id=ev_id,
            confidence_label=ConfidenceLabel.CONFIRMED_FROM_EVIDENCE,
        ))

    anomalies = [
        (entities["Apex Consulting LLC"].id, "SHELL_COMPANY_INDICATOR", 0.93,
         "Apex Consulting LLC registered 2 weeks before first invoice; no employees, no website, registered agent only.", "FINANCIAL_FORENSICS"),
        (entities["0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"].id, "CRYPTOCURRENCY_LAUNDERING", 0.89,
         "ETH wallet routed funds through Tornado Cash mixing service within 48h of fiat conversion.", "FINANCIAL_FORENSICS"),
    ]
    for ent_id, atype, score, reason, method in anomalies:
        db.add(Anomaly(
            case_id=case.id, entity_id=ent_id, anomaly_type=atype,
            anomaly_score=score, reason=reason, detection_method=method,
        ))

    db.add(Suspect(
        case_id=case.id, name="Marcus Webb", entity_id=entities["Marcus Webb"].id,
        description="CFO of Nextera Solutions. Created shell company 'Apex Consulting LLC' to siphon funds.",
        added_by=analyst.id,
    ))
    db.add(Victim(
        case_id=case.id, name="Nextera Solutions Inc. (Shareholders)",
        description="$2.3M embezzled from corporate accounts via fraudulent invoices.",
        added_by=analyst.id,
    ))

    print(f"  [+] Case {case.case_number} seeded: {case.title}")


# ============================================================
# CASE 3 — Child Exploitation / Dark Web Marketplace
# ============================================================

def seed_case_3():
    if db.query(Case).filter(Case.case_number == "FORGE-2024-0107").first():
        return
    case = Case(
        case_number="FORGE-2024-0107",
        title="Operation Iron Gate — Dark Web Marketplace Takedown",
        description=(
            "Multi-agency investigation into 'IronMarket', a Tor-hosted marketplace "
            "facilitating sale of stolen credentials, malware kits, and counterfeit documents. "
            "Server infrastructure traced to hosting provider in Moldova. Coordinating with "
            "Europol and FBI Cyber Division."
        ),
        crime_type="Cybercrime / Dark Web Marketplace",
        status=CaseStatus.SUSPECT_IDENTIFIED,
        priority=CasePriority.CRITICAL,
        created_by=admin.id,
        lead_investigator_id=investigator2.id,
        created_at=_ago(30),
    )
    db.add(case)
    db.flush()

    for uid in [admin.id, investigator1.id, investigator2.id, analyst.id]:
        db.add(CaseMember(case_id=case.id, user_id=uid))

    ev1 = Evidence(
        case_id=case.id, evidence_type="LOG", original_filename="ironmarket_access_logs.json",
        stored_path="uploads/FORGE-2024-0107/ironmarket_access_logs.json",
        file_size_bytes=8_900_000, sha256_hash="1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
        uploaded_by=investigator2.id, uploaded_at=_ago(28),
        source="Server seizure — Chisinau DC", description="Web server access logs from seized IronMarket infrastructure.",
        status=EvidenceStatus.ANALYZED
    )
    ev2 = Evidence(
        case_id=case.id, evidence_type="CSV", original_filename="stolen_credentials_dump.csv",
        stored_path="uploads/FORGE-2024-0107/stolen_credentials_dump.csv",
        file_size_bytes=15_400_000, sha256_hash="2b3c4d5e6f7890ab1cdef2345678901abcdef2345678901abcdef2345678901a",
        uploaded_by=investigator2.id, uploaded_at=_ago(27),
        source="Server seizure — database dump", description="MySQL dump containing 250K+ stolen credential records.",
        status=EvidenceStatus.FLAGGED
    )
    for ev in [ev1, ev2]:
        db.add(ev)
    db.flush()

    entities = {}
    entity_data = [
        ("PERSON", "Dmitri Volkov", ev1.id),
        ("DOMAIN", "ironmarket.onion", ev1.id),
        ("IP_ADDRESS", "37.235.54.89", ev1.id),
        ("IP_ADDRESS", "194.88.104.22", ev1.id),
        ("CRYPTO_WALLET", "bc1q9h0yjdupyfpfcm2m5e4a5mqfzc3e3rjk7g3k4l", ev1.id),
        ("EMAIL", "admin@ironmarket.onion", ev1.id),
        ("ORGANIZATION", "MoldHost SRL", ev1.id),
        ("URL", "http://ironmarket.onion/login", ev1.id),
    ]
    for etype, val, ev_id in entity_data:
        ent = Entity(
            case_id=case.id, entity_type=EntityType(etype), value=val,
            normalized_value=val.lower(), first_seen_evidence_id=ev_id,
        )
        db.add(ent)
        db.flush()
        entities[val] = ent

    rels = [
        ("Dmitri Volkov", "admin@ironmarket.onion", RelationshipType.OWNS),
        ("Dmitri Volkov", "ironmarket.onion", RelationshipType.OWNS),
        ("ironmarket.onion", "37.235.54.89", RelationshipType.ASSOCIATED_WITH),
        ("37.235.54.89", "MoldHost SRL", RelationshipType.ASSOCIATED_WITH),
        ("bc1q9h0yjdupyfpfcm2m5e4a5mqfzc3e3rjk7g3k4l", "ironmarket.onion", RelationshipType.ASSOCIATED_WITH),
    ]
    for src, tgt, rtype in rels:
        db.add(EntityRelationship(
            case_id=case.id, source_entity_id=entities[src].id,
            target_entity_id=entities[tgt].id, relationship_type=rtype,
            confidence_label=ConfidenceLabel.CONFIRMED_FROM_EVIDENCE,
        ))

    db.add(Suspect(
        case_id=case.id, name="Dmitri Volkov", entity_id=entities["Dmitri Volkov"].id,
        description="Alleged administrator of IronMarket. Identified via OPSEC failure — SSH key linked to GitHub account.",
        added_by=investigator2.id, aliases=["IronAdmin", "d_v0lk"],
    ))

    print(f"  [+] Case {case.case_number} seeded: {case.title}")


# ============================================================
# CASE 4 — Homicide / Cold Case with Digital Evidence
# ============================================================

def seed_case_4():
    if db.query(Case).filter(Case.case_number == "FORGE-2023-0219").first():
        return
    case = Case(
        case_number="FORGE-2023-0219",
        title="Homicide of Elena Vasquez — Digital Evidence Re-analysis",
        description=(
            "Cold case reopened after new cell tower data and social media evidence emerged. "
            "Victim found deceased Nov 2023. Original investigation stalled due to lack of "
            "physical evidence. New analysis of cell tower pings and deleted Instagram DMs "
            "provides timeline reconstruction."
        ),
        crime_type="Homicide",
        status=CaseStatus.OPEN,
        priority=CasePriority.HIGH,
        created_by=admin.id,
        lead_investigator_id=investigator1.id,
        created_at=_ago(180),
    )
    db.add(case)
    db.flush()

    for uid in [admin.id, investigator1.id]:
        db.add(CaseMember(case_id=case.id, user_id=uid))

    ev1 = Evidence(
        case_id=case.id, evidence_type="CSV", original_filename="cell_tower_pings_nov2023.csv",
        stored_path="uploads/FORGE-2023-0219/cell_tower_pings_nov2023.csv",
        file_size_bytes=340_000, sha256_hash="3c4d5e6f7890ab12cdef34567890123abcdef34567890123abcdef34567890ab",
        uploaded_by=investigator1.id, uploaded_at=_ago(15),
        source="Subpoena — T-Mobile", description="Cell tower connection records for suspect and victim phones.",
        status=EvidenceStatus.ANALYZED
    )
    ev2 = Evidence(
        case_id=case.id, evidence_type="PDF", original_filename="deleted_instagram_dms.pdf",
        stored_path="uploads/FORGE-2023-0219/deleted_instagram_dms.pdf",
        file_size_bytes=125_000, sha256_hash="4d5e6f7890ab123cdef456789012345abcdef456789012345abcdef456789012",
        uploaded_by=investigator1.id, uploaded_at=_ago(12),
        source="Instagram Legal Response", description="Recovered deleted DMs between victim and person of interest.",
        status=EvidenceStatus.ANALYZED, extracted_text="[DM] @carlos_reyes94: meet me at the warehouse at 11pm. don't tell anyone..."
    )
    for ev in [ev1, ev2]:
        db.add(ev)
    db.flush()

    entities = {}
    entity_data = [
        ("PERSON", "Elena Vasquez", ev1.id),
        ("PERSON", "Carlos Reyes", ev2.id),
        ("PHONE_NUMBER", "+1-555-0147 (Elena)", ev1.id),
        ("PHONE_NUMBER", "+1-555-0293 (Carlos)", ev1.id),
        ("LOCATION", "Warehouse District — 4th & Industrial", ev2.id),
        ("SOCIAL_MEDIA_ACCOUNT", "@carlos_reyes94", ev2.id),
        ("SOCIAL_MEDIA_ACCOUNT", "@elena_v_official", ev2.id),
    ]
    for etype, val, ev_id in entity_data:
        ent = Entity(
            case_id=case.id, entity_type=EntityType(etype), value=val,
            normalized_value=val.lower(), first_seen_evidence_id=ev_id,
        )
        db.add(ent)
        db.flush()
        entities[val] = ent

    rels = [
        ("Carlos Reyes", "@carlos_reyes94", RelationshipType.OWNS),
        ("Elena Vasquez", "@elena_v_official", RelationshipType.OWNS),
        ("Carlos Reyes", "Elena Vasquez", RelationshipType.COMMUNICATED_WITH),
        ("Carlos Reyes", "+1-555-0293 (Carlos)", RelationshipType.OWNS),
        ("Elena Vasquez", "+1-555-0147 (Elena)", RelationshipType.OWNS),
        ("+1-555-0293 (Carlos)", "Warehouse District — 4th & Industrial", RelationshipType.LOCATED_AT),
    ]
    for src, tgt, rtype in rels:
        db.add(EntityRelationship(
            case_id=case.id, source_entity_id=entities[src].id,
            target_entity_id=entities[tgt].id, relationship_type=rtype,
            confidence_label=ConfidenceLabel.SUPPORTED_INFERENCE,
        ))

    timeline = [
        (_ago(185, 20), "SOCIAL_MEDIA_DM", "Carlos Reyes sent DM to Elena: 'meet me at the warehouse at 11pm'.", ev2.id, entities.get("@carlos_reyes94")),
        (_ago(185, 14), "CELL_TOWER_PING", "Elena's phone pinged tower near Warehouse District.", ev1.id, entities.get("+1-555-0147 (Elena)")),
        (_ago(185, 13), "CELL_TOWER_PING", "Carlos's phone pinged same tower — co-location confirmed.", ev1.id, entities.get("+1-555-0293 (Carlos)")),
        (_ago(185, 12), "CELL_TOWER_PING", "Carlos's phone moved to I-95 corridor — rapid movement away.", ev1.id, entities.get("+1-555-0293 (Carlos)")),
        (_ago(185, 6), "PHONE_OFFLINE", "Elena's phone went offline — last ping at Warehouse District.", ev1.id, entities.get("+1-555-0147 (Elena)")),
        (_ago(184), "BODY_DISCOVERED", "Victim found by warehouse security guard.", None, entities.get("Elena Vasquez")),
    ]
    for ts, etype, desc, ev_id, ent in timeline:
        db.add(TimelineEvent(
            case_id=case.id, entity_id=ent.id if ent else None, event_type=etype,
            event_timestamp=ts, description=desc, source_evidence_id=ev_id,
            confidence_label=ConfidenceLabel.CONFIRMED_FROM_EVIDENCE,
        ))

    db.add(Suspect(
        case_id=case.id, name="Carlos Reyes", entity_id=entities["Carlos Reyes"].id,
        description="Person of interest. Cell tower data places him at scene. Deleted DMs show he arranged meeting with victim.",
        added_by=investigator1.id, aliases=["@carlos_reyes94"],
    ))
    db.add(Victim(
        case_id=case.id, name="Elena Vasquez", entity_id=entities["Elena Vasquez"].id,
        description="Victim, age 28. Found deceased at Warehouse District.",
        added_by=investigator1.id,
    ))

    print(f"  [+] Case {case.case_number} seeded: {case.title}")


# ============================================================
# CASE 5 — Insider Threat / Data Exfiltration
# ============================================================

def seed_case_5():
    if db.query(Case).filter(Case.case_number == "FORGE-2024-0088").first():
        return
    case = Case(
        case_number="FORGE-2024-0088",
        title="Insider Threat — Classified Data Exfiltration at Meridian Defense Corp",
        description=(
            "Senior engineer Dr. Alan Frost suspected of exfiltrating classified project files "
            "to personal cloud storage and forwarding to unknown foreign contact. DLP alerts "
            "triggered by anomalous USB and cloud upload activity."
        ),
        crime_type="Espionage / Insider Threat",
        status=CaseStatus.UNDER_INVESTIGATION,
        priority=CasePriority.CRITICAL,
        created_by=admin.id,
        lead_investigator_id=investigator2.id,
        created_at=_ago(14),
    )
    db.add(case)
    db.flush()

    for uid in [admin.id, investigator2.id, analyst.id]:
        db.add(CaseMember(case_id=case.id, user_id=uid))

    ev1 = Evidence(
        case_id=case.id, evidence_type="LOG", original_filename="dlp_alerts_sept2024.json",
        stored_path="uploads/FORGE-2024-0088/dlp_alerts_sept2024.json",
        file_size_bytes=1_200_000, sha256_hash="5e6f7890ab1234cdef5678901234567abcdef5678901234567abcdef567890ab",
        uploaded_by=investigator2.id, uploaded_at=_ago(13),
        source="Symantec DLP Console", description="Data Loss Prevention alerts showing classified file transfers.",
        status=EvidenceStatus.ANALYZED
    )
    ev2 = Evidence(
        case_id=case.id, evidence_type="LOG", original_filename="vpn_connection_logs.csv",
        stored_path="uploads/FORGE-2024-0088/vpn_connection_logs.csv",
        file_size_bytes=670_000, sha256_hash="6f7890ab12345cdef67890123456789abcdef67890123456789abcdef6789012",
        uploaded_by=investigator2.id, uploaded_at=_ago(12),
        source="Cisco AnyConnect VPN Logs", description="Off-hours VPN connections from Dr. Frost's credentials.",
        status=EvidenceStatus.ANALYZED
    )
    for ev in [ev1, ev2]:
        db.add(ev)
    db.flush()

    entities = {}
    entity_data = [
        ("PERSON", "Dr. Alan Frost", ev1.id),
        ("EMAIL", "a.frost@meridian-defense.com", ev1.id),
        ("EMAIL", "contact.zhukov@proton.me", ev1.id),
        ("DEVICE", "FROST-LAPTOP-01", ev1.id),
        ("IP_ADDRESS", "10.0.15.42", ev2.id),
        ("IP_ADDRESS", "203.0.113.77", ev2.id),
        ("FILE", "Project_Sentinel_Specs_v4.2.pdf", ev1.id),
        ("FILE", "radar_algorithms_source.zip", ev1.id),
        ("ORGANIZATION", "Meridian Defense Corp", None),
    ]
    for etype, val, ev_id in entity_data:
        ent = Entity(
            case_id=case.id, entity_type=EntityType(etype), value=val,
            normalized_value=val.lower(), first_seen_evidence_id=ev_id,
        )
        db.add(ent)
        db.flush()
        entities[val] = ent

    rels = [
        ("Dr. Alan Frost", "a.frost@meridian-defense.com", RelationshipType.OWNS),
        ("Dr. Alan Frost", "FROST-LAPTOP-01", RelationshipType.USED_DEVICE),
        ("Dr. Alan Frost", "Meridian Defense Corp", RelationshipType.WORKED_FOR),
        ("a.frost@meridian-defense.com", "contact.zhukov@proton.me", RelationshipType.EMAILED),
        ("FROST-LAPTOP-01", "Project_Sentinel_Specs_v4.2.pdf", RelationshipType.SHARED_FILE),
        ("FROST-LAPTOP-01", "radar_algorithms_source.zip", RelationshipType.SHARED_FILE),
    ]
    for src, tgt, rtype in rels:
        db.add(EntityRelationship(
            case_id=case.id, source_entity_id=entities[src].id,
            target_entity_id=entities[tgt].id, relationship_type=rtype,
            confidence_label=ConfidenceLabel.CONFIRMED_FROM_EVIDENCE,
        ))

    timeline = [
        (_ago(20, 2), "VPN_LOGIN", "Off-hours VPN login from external IP 203.0.113.77 at 2:14 AM.", ev2.id, entities.get("Dr. Alan Frost")),
        (_ago(20, 1), "FILE_ACCESS", "Accessed Project_Sentinel_Specs_v4.2.pdf — classified TOP SECRET.", ev1.id, entities.get("Project_Sentinel_Specs_v4.2.pdf")),
        (_ago(19, 22), "USB_COPY", "DLP alert: classified file copied to USB device (SanDisk Ultra 128GB).", ev1.id, entities.get("FROST-LAPTOP-01")),
        (_ago(18, 3), "CLOUD_UPLOAD", "DLP alert: radar_algorithms_source.zip uploaded to personal Mega.nz account.", ev1.id, entities.get("radar_algorithms_source.zip")),
        (_ago(17), "EMAIL_SENT", "Email with encrypted attachment sent to contact.zhukov@proton.me.", ev1.id, entities.get("contact.zhukov@proton.me")),
    ]
    for ts, etype, desc, ev_id, ent in timeline:
        db.add(TimelineEvent(
            case_id=case.id, entity_id=ent.id if ent else None, event_type=etype,
            event_timestamp=ts, description=desc, source_evidence_id=ev_id,
            confidence_label=ConfidenceLabel.CONFIRMED_FROM_EVIDENCE,
        ))

    anomalies = [
        (entities["Dr. Alan Frost"].id, "OFF_HOURS_ACCESS", 0.94,
         "VPN login at 2:14 AM — outside normal work hours. 3 similar off-hours sessions in past 2 weeks.", "ISOLATION_FOREST"),
        (entities["Project_Sentinel_Specs_v4.2.pdf"].id, "CLASSIFIED_FILE_EXFIL", 0.97,
         "TOP SECRET document copied to USB and uploaded to personal cloud — critical DLP violation.", "STATIC_HEURISTIC"),
        (entities["contact.zhukov@proton.me"].id, "SUSPICIOUS_FOREIGN_CONTACT", 0.88,
         "Encrypted email to unknown ProtonMail address shortly after classified file access.", "THREAT_INTEL_MATCH"),
    ]
    for ent_id, atype, score, reason, method in anomalies:
        db.add(Anomaly(
            case_id=case.id, entity_id=ent_id, anomaly_type=atype,
            anomaly_score=score, reason=reason, detection_method=method,
        ))

    db.add(Suspect(
        case_id=case.id, name="Dr. Alan Frost", entity_id=entities["Dr. Alan Frost"].id,
        description="Senior radar systems engineer at Meridian Defense. 12-year employee with TOP SECRET clearance. Recently denied promotion.",
        added_by=investigator2.id,
    ))

    print(f"  [+] Case {case.case_number} seeded: {case.title}")


# ============================================================
# CASES 6–7 — Rich synthetic fixtures for AI, graph, and timeline demos
# ============================================================

def seed_case_6():
    """Vendor identity compromise with conflicting access and audit records."""
    _seed_rich_case({
        "case_number": "FORGE-2026-0106",
        "title": "Operation Glass Harbor — Vendor Identity and Cloud Access Review",
        "description": "Synthetic training scenario: a vendor account shows unusual sign-in and bulk cloud reads. Evidence contains timing and attribution gaps; account use alone does not identify the operator.",
        "crime_type": "Cybercrime / Identity and Data Access",
        "status": CaseStatus.UNDER_INVESTIGATION, "priority": CasePriority.HIGH,
        "lead": investigator1, "members": [investigator2, analyst], "created_days_ago": 12,
        "evidence": [
            {"key":"signin", "filename":"vendor_identity_signins.json", "type":"LOG", "source":"Synthetic identity-provider export", "description":"Sign-in and MFA events for a vendor identity.", "days_ago":10, "content":"""SYNTHETIC TRAINING DATA — all names, organizations, and events are fictional.\n2026-09-28T02:11:04Z user=svc.northstar@northstar.example event=MFA_DENIED device=VND-LT-044 ip=203.0.113.44\n2026-09-28T02:14:51Z user=svc.northstar@northstar.example event=TOKEN_ACCEPTED device=unknown ip=198.51.100.27 session=SS-8841\n2026-09-28T02:21:09Z user=svc.northstar@northstar.example event=TOKEN_REFRESH device=unknown ip=198.51.100.27 session=SS-8841\nIdentity export does not establish the human operator. Clock source: UTC; ingestion lag may be up to 90 seconds."""},
            {"key":"cloud", "filename":"cloud_object_audit.log", "type":"LOG", "source":"Synthetic cloud audit export", "description":"Object access records with a delayed-ingestion warning.", "days_ago":10, "content":"""SYNTHETIC TRAINING DATA — fictional cloud audit records.\n2026-09-28T02:19:38Z session=SS-8841 action=LIST bucket=meridian-archive objects=312\n2026-09-28T02:24:02Z session=SS-8841 action=GET prefix=projects/shoreline bytes=2816000000 objects=312\n2026-09-28T02:26:17Z session=SS-8841 action=GET object=projects/shoreline/index.csv result=SUCCESS\n2026-09-28T02:30:00Z session=SS-8841 action=REVOKE result=QUEUED\nAudit pipeline note: timestamps are event time; delivery can lag by 4–7 minutes. Object reads do not confirm successful external transfer."""},
            {"key":"endpoint", "filename":"vendor_endpoint_events.csv", "type":"CSV", "source":"Synthetic managed endpoint export", "description":"Endpoint and removable-media events for the registered vendor laptop.", "days_ago":9, "content":"""SYNTHETIC TRAINING DATA\ntimestamp,device,user,event,detail\n2026-09-28T01:58:12Z,VND-LT-044,svc.northstar@northstar.example,USB_MOUNT,serial=DEMO-771\n2026-09-28T02:07:33Z,VND-LT-044,svc.northstar@northstar.example,SCREEN_LOCK,reason=idle\n2026-09-28T02:13:57Z,VND-LT-044,svc.northstar@northstar.example,NETWORK_CHANGE,interface=wifi\n2026-09-28T02:14:02Z,VND-LT-044,unknown,LOCAL_LOGIN,result=NOT_LOGGED\nAgent health gap: telemetry unavailable 02:08–02:17Z. USB mount indicates connection only, not copied data."""},
            {"key":"ticket", "filename":"vendor_support_ticket.txt", "type":"TXT", "source":"Synthetic support ticket", "description":"Vendor report of lost access and a possible laptop handoff.", "days_ago":9, "content":"""SYNTHETIC TRAINING DATA — fictional support conversation.\nTicket VND-2208 opened 2026-09-28 02:42Z by Northstar support. Reporter says the service account stopped working and a shared laptop was left at a regional office on 2026-09-27. No person names the person who collected it.\nTicket agent reset the credential at 03:10Z. Attachment list is empty. The reporter's identity is not independently verified."""},
            {"key":"network", "filename":"egress_gateway_summary.txt", "type":"TXT", "source":"Synthetic gateway summary", "description":"Outbound gateway summary with incomplete byte accounting.", "days_ago":8, "content":"""SYNTHETIC TRAINING DATA — fictional gateway observations.\n2026-09-28 02:20–02:35Z UTC: 198.51.100.27 connected to storage-gw.northstar.example over TLS. Estimated outbound 184 MB; counters reset at 02:29Z. Destination is a vendor-managed relay shared by several tenants. No payload capture is available."""},
            {"key":"review", "filename":"investigator_review_glass_harbor.txt", "type":"TXT", "source":"Synthetic investigator review", "description":"Open questions and alternative hypotheses for the case.", "days_ago":7, "content":"""SYNTHETIC TRAINING DATA — preliminary review, not a finding.\nQuestions: Was session SS-8841 created by a stolen refresh token, a vendor relay, or an authorized automation? Can cloud event time be reconciled with gateway ingestion time? Is the USB event related? Preserve alternatives. Do not infer a named operator from a shared account or IP. Seek vendor roster, token issuance records, and object-level transfer confirmation."""},
        ],
        "entities": [
            {"type":"EMAIL","value":"svc.northstar@northstar.example","evidence":"signin"},
            {"type":"ORGANIZATION","value":"Northstar Vendor Services","evidence":"ticket"},
            {"type":"ORGANIZATION","value":"Meridian Archive Unit","evidence":"cloud"},
            {"type":"DEVICE","value":"VND-LT-044","evidence":"endpoint"},
            {"type":"IP_ADDRESS","value":"203.0.113.44","evidence":"signin"},
            {"type":"IP_ADDRESS","value":"198.51.100.27","evidence":"signin"},
            {"type":"FILE","value":"projects/shoreline/index.csv","evidence":"cloud"},
            {"type":"TRANSACTION_ID","value":"SS-8841","evidence":"signin"},
            {"type":"DOMAIN","value":"storage-gw.northstar.example","evidence":"network"},
        ],
        "relationships": [
            ("Northstar Vendor Services","svc.northstar@northstar.example","OWNS","CONFIRMED_FROM_EVIDENCE",["signin","ticket"],4),
            ("svc.northstar@northstar.example","VND-LT-044","USED_DEVICE","CONFIRMED_FROM_EVIDENCE",["endpoint"],3),
            ("svc.northstar@northstar.example","SS-8841","ASSOCIATED_WITH","CONFIRMED_FROM_EVIDENCE",["signin","cloud"],5),
            ("SS-8841","198.51.100.27","LOGGED_IN_FROM","CONFIRMED_FROM_EVIDENCE",["signin"],4),
            ("198.51.100.27","storage-gw.northstar.example","CONNECTED_TO","POTENTIAL_CONNECTION",["network"],2),
            ("Meridian Archive Unit","projects/shoreline/index.csv","ASSOCIATED_WITH","CONFIRMED_FROM_EVIDENCE",["cloud"],3),
            ("SS-8841","projects/shoreline/index.csv","SHARED_FILE","SUPPORTED_INFERENCE",["cloud"],3),
        ],
        "timeline": [
            (10, 8, "USB_MOUNT", "USB device mounted on VND-LT-044; no copy is established.", "endpoint", "VND-LT-044", "CONFIRMED_FROM_EVIDENCE"),
            (10, 6, "MFA_DENIED", "MFA denial recorded for the vendor service identity.", "signin", "svc.northstar@northstar.example", "CONFIRMED_FROM_EVIDENCE"),
            (10, 6, "TOKEN_ACCEPTED", "Token accepted from 198.51.100.27; human operator remains unknown.", "signin", "SS-8841", "CONFIRMED_FROM_EVIDENCE"),
            (10, 6, "BULK_OBJECT_READ", "Cloud audit reports 312 objects and 2.816 GB read; external transfer is unconfirmed.", "cloud", "projects/shoreline/index.csv", "CONFIRMED_FROM_EVIDENCE"),
            (9, 2, "SUPPORT_TICKET", "Vendor reports shared laptop may have been left at an office; collector not identified.", "ticket", "Northstar Vendor Services", "CONFIRMED_FROM_EVIDENCE"),
            (7, 4, "REVIEW_OPENED", "Investigator records competing explanations and requests additional records.", "review", None, "CONFIRMED_FROM_EVIDENCE"),
        ],
        "anomalies": [("SS-8841","UNUSUAL_TOKEN_AND_BULK_READ",0.86,"Token accepted shortly after MFA denial and followed by bulk reads. This is a review lead, not proof of exfiltration or operator identity.","cloud")],
        "suspects": [("Unknown session operator","SS-8841","Operator not identified. Shared service identity and incomplete endpoint telemetry prevent attribution.",[])],
        "victims": [("Meridian Archive Unit","Meridian Archive Unit","Synthetic organization whose archive objects were accessed.")],
        "notes": ["Synthetic training scenario. Distinguish account, session, device, and human operator. Current records establish access events but do not prove external transfer or identify a person."]
    })


def seed_case_7():
    """Payment diversion scenario with conflicting amounts and competing explanations."""
    _seed_rich_case({
        "case_number": "FORGE-2026-0107",
        "title": "Operation Lantern Bridge — Payment Diversion Review",
        "description": "Synthetic training scenario: a supplier bank change and a mismatched payment appear near a mailbox rule change. Conflicting records require careful attribution and reconciliation.",
        "crime_type": "Financial Fraud / Business Email Compromise",
        "status": CaseStatus.EVIDENCE_REVIEW, "priority": CasePriority.HIGH,
        "lead": analyst, "members": [investigator1, investigator2], "created_days_ago": 8,
        "evidence": [
            {"key":"email", "filename":"supplier_bank_change.eml", "type":"EMAIL", "source":"Synthetic mail archive", "description":"Supplier bank-change email with reply-to mismatch.", "days_ago":7, "content":"""SYNTHETIC TRAINING DATA — all entities and records are fictional.\nFrom: billing@harbor-supply.example\nReply-To: harbor.ap@relay.example\nTo: ap@cedar.example\nDate: 2026-10-01T09:12:00Z\nSubject: Updated remittance details for invoice INV-44018\nPlease use account alias HARBOR-NEW for the next scheduled payment. The attached letter is referenced but was not retained in this export. Sender authentication: SPF=pass, DKIM=none, DMARC=quarantine. Message archive does not prove who controlled either mailbox."""},
            {"key":"erp", "filename":"erp_change_audit.log", "type":"LOG", "source":"Synthetic ERP audit", "description":"Vendor master change and actor/session metadata.", "days_ago":7, "content":"""SYNTHETIC TRAINING DATA\n2026-10-01T09:26:14Z actor=ap.clerk@cedar.example action=VENDOR_BANK_EDIT vendor=HARBOR-SUPPLY old=HARBOR-01 new=HARBOR-NEW ticket=FIN-8821\n2026-10-01T09:26:19Z actor=ap.clerk@cedar.example session=ERP-772 source_ip=203.0.113.18 mfa=PASS\n2026-10-01T09:28:02Z action=SECOND_APPROVAL result=NOT_REQUIRED policy_version=2026.09\nAudit records the authenticated account and configured policy; it does not establish who was at the keyboard."""},
            {"key":"payment", "filename":"payment_batch.csv", "type":"CSV", "source":"Synthetic treasury export", "description":"Payment batch record and beneficiary alias.", "days_ago":6, "content":"""SYNTHETIC TRAINING DATA\nbatch_id,invoice_id,beneficiary_alias,amount,currency,created_utc,status\nPAY-66102,INV-44018,HARBOR-NEW,84160,USD,2026-10-02T14:04:11Z,SETTLED\nPAY-66103,INV-44019,HARBOR-01,12600,USD,2026-10-02T14:06:02Z,SETTLED\nTreasury export lists payment instructions; settlement confirmation and beneficiary ownership require separate bank records."""},
            {"key":"invoice", "filename":"invoice_reconciliation.csv", "type":"CSV", "source":"Synthetic accounts-payable archive", "description":"Invoice amount versions and approval status.", "days_ago":6, "content":"""SYNTHETIC TRAINING DATA\nrecorded_utc,invoice_id,version,amount,currency,approval\n2026-09-25T11:02:00Z,INV-44018,v1,81460,USD,APPROVED\n2026-10-01T09:40:00Z,INV-44018,v2,84160,USD,ATTACHMENT_MISSING\n2026-10-01T09:44:00Z,INV-44018,v2,84160,USD,APPROVED_BY=ap.supervisor@cedar.example\nSource archive lacks the original supplier attachment; do not assume which version is valid."""},
            {"key":"identity", "filename":"mailbox_signins_and_rules.json", "type":"LOG", "source":"Synthetic mail security export", "description":"Sign-ins and mailbox rule activity around the bank-change email.", "days_ago":7, "content":"""SYNTHETIC TRAINING DATA\n2026-10-01T08:51:09Z mailbox=ap.clerk@cedar.example signin=SUCCESS device=CEDAR-AP-12 ip=10.20.4.18\n2026-10-01T09:17:42Z mailbox=ap.clerk@cedar.example rule_created=MoveRepliesToArchive condition=subject:INV-44018\n2026-10-01T09:18:10Z mailbox=ap.clerk@cedar.example client=mobile-sync ip=198.51.100.91 session=MAIL-331\n2026-10-01T09:34:22Z mailbox=ap.clerk@cedar.example rule_disabled=MoveRepliesToArchive\nIP may be a shared carrier gateway. Mailbox activity does not identify a human operator."""},
            {"key":"ticket", "filename":"finance_ticket_notes.txt", "type":"TXT", "source":"Synthetic finance helpdesk tickets", "description":"Conflicting reports about a phone verification and approval workflow.", "days_ago":5, "content":"""SYNTHETIC TRAINING DATA — preliminary notes.\nFIN-8821: Clerk says they received a phone call from someone claiming to be the supplier and were told the change was urgent. Caller ID unavailable.\nFIN-8830: Supervisor says approval was completed from a mobile device while traveling; no device identifier retained.\nSupplier contact on file says their standard bank-change procedure requires a call-back to a known number. Call-back log is absent. These statements are unverified and conflict with the automated ERP audit trail."""},
        ],
        "entities": [
            {"type":"ORGANIZATION","value":"Cedar Manufacturing","evidence":"erp"},
            {"type":"ORGANIZATION","value":"Harbor Supply","evidence":"email"},
            {"type":"EMAIL","value":"billing@harbor-supply.example","evidence":"email"},
            {"type":"EMAIL","value":"harbor.ap@relay.example","evidence":"email"},
            {"type":"EMAIL","value":"ap.clerk@cedar.example","evidence":"identity"},
            {"type":"EMAIL","value":"ap.supervisor@cedar.example","evidence":"invoice"},
            {"type":"TRANSACTION_ID","value":"INV-44018","evidence":"invoice"},
            {"type":"TRANSACTION_ID","value":"PAY-66102","evidence":"payment"},
            {"type":"BANK_ACCOUNT","value":"HARBOR-NEW","evidence":"erp"},
            {"type":"BANK_ACCOUNT","value":"HARBOR-01","evidence":"payment"},
            {"type":"DEVICE","value":"CEDAR-AP-12","evidence":"identity"},
            {"type":"IP_ADDRESS","value":"198.51.100.91","evidence":"identity"},
        ],
        "relationships": [
            ("Harbor Supply","billing@harbor-supply.example","OWNS","CONFIRMED_FROM_EVIDENCE",["email"],2),
            ("billing@harbor-supply.example","harbor.ap@relay.example","EMAILED","CONFIRMED_FROM_EVIDENCE",["email"],3),
            ("Cedar Manufacturing","ap.clerk@cedar.example","OWNS","CONFIRMED_FROM_EVIDENCE",["erp","identity"],3),
            ("ap.clerk@cedar.example","CEDAR-AP-12","USED_DEVICE","CONFIRMED_FROM_EVIDENCE",["identity"],2),
            ("ap.clerk@cedar.example","INV-44018","ASSOCIATED_WITH","CONFIRMED_FROM_EVIDENCE",["erp","invoice"],4),
            ("INV-44018","HARBOR-NEW","ASSOCIATED_WITH","CONFIRMED_FROM_EVIDENCE",["erp","payment"],3),
            ("PAY-66102","INV-44018","ASSOCIATED_WITH","CONFIRMED_FROM_EVIDENCE",["payment"],4),
            ("ap.clerk@cedar.example","198.51.100.91","LOGGED_IN_FROM","CONFIRMED_FROM_EVIDENCE",["identity"],2),
        ],
        "timeline": [
            (7, 15, "EMAIL_RECEIVED", "Bank-change request received with a differing reply-to address.", "email", "billing@harbor-supply.example", "CONFIRMED_FROM_EVIDENCE"),
            (7, 8, "MAILBOX_RULE_CREATED", "Rule created to move replies matching the invoice subject; operator not established.", "identity", "ap.clerk@cedar.example", "CONFIRMED_FROM_EVIDENCE"),
            (7, 7, "VENDOR_BANK_EDIT", "ERP audit records change from HARBOR-01 to HARBOR-NEW.", "erp", "HARBOR-NEW", "CONFIRMED_FROM_EVIDENCE"),
            (7, 7, "INVOICE_VERSION_CONFLICT", "Invoice records show $81,460 approved and a later $84,160 version with missing attachment.", "invoice", "INV-44018", "CONFIRMED_FROM_EVIDENCE"),
            (6, 10, "PAYMENT_SETTLED", "Treasury export lists $84,160 payment to HARBOR-NEW; beneficiary ownership not verified.", "payment", "PAY-66102", "CONFIRMED_FROM_EVIDENCE"),
            (5, 6, "CONFLICTING_WITNESS_NOTES", "Helpdesk notes provide inconsistent account of phone verification and approval.", "ticket", None, "CONFIRMED_FROM_EVIDENCE"),
        ],
        "anomalies": [("INV-44018","INVOICE_AMOUNT_AND_BENEFICIARY_CHANGE",0.82,"Payment amount differs from the earlier approved version and used a newly configured beneficiary. Reconcile original documents and bank settlement before drawing conclusions.","invoice"), ("ap.clerk@cedar.example","MAILBOX_RULE_NEAR_VENDOR_CHANGE",0.74,"A subject-based rule was created shortly before the vendor master edit. Temporal proximity is a review lead and does not identify the rule creator.","identity")],
        "suspects": [("Unknown account operator","ap.clerk@cedar.example","Account activity is present, but available records do not establish who operated the account or whether the events were authorized.",[])],
        "victims": [("Cedar Manufacturing","Cedar Manufacturing","Synthetic organization reviewing a disputed supplier payment.")],
        "notes": ["Synthetic training scenario. Compare invoice versions, verify the beneficiary with independent bank records, preserve the possibility of process error or compromised accounts, and do not attribute actions based solely on mailbox or ERP account logs."]
    })


# ============================================================
# Run all seeders
# ============================================================

print("\n[*] Seeding demo cases...\n")
seed_case_1()
seed_case_2()
seed_case_3()
seed_case_4()
seed_case_5()
seed_case_6()
seed_case_7()
db.commit()
db.close()
print("\n[OK] Demo data seeding complete! 7 cases; cases 6–7 include 12 synthetic, searchable evidence files.\n")
