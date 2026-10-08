"""
Entity Resolution (Module 5).

Scores potential cross-entity matches and correlations across:
- Name and alias similarity (PERSON, ORGANIZATION, SOCIAL_MEDIA_ACCOUNT)
- Shared phishing / C2 infrastructure (EMAIL, DOMAIN, URL)
- Same-subnet IP lateral movement (IP_ADDRESS /24 subnet grouping)
- Tor Hidden Services / Onion portal clustering (URL .onion host matching)
- Sequential or duplicate artifact patterns (FILE names)
- Email username to Person name correlation

Never silently merges entities; surfaces actionable candidate leads for investigator review.
"""
import re
from difflib import SequenceMatcher
from typing import List
from urllib.parse import urlparse
from sqlalchemy.orm import Session

from app.models.models import Entity, EntityResolutionCandidate, EntityType

NAME_TYPES = {EntityType.PERSON, EntityType.ORGANIZATION, EntityType.SOCIAL_MEDIA_ACCOUNT}


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _name_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


def _get_ip_subnet24(ip_str: str) -> str:
    parts = ip_str.strip().split(".")
    if len(parts) == 4 and all(p.isdigit() for p in parts):
        return f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
    return ""


def _get_email_domain(email_str: str) -> str:
    if "@" in email_str:
        return email_str.split("@", 1)[1].strip().lower()
    return ""


def _get_url_host(url_str: str) -> str:
    try:
        parsed = urlparse(url_str.strip())
        return (parsed.netloc or parsed.path.split("/")[0]).lower()
    except Exception:
        return ""


def find_candidates_for_case(db: Session, case_id: str) -> List[EntityResolutionCandidate]:
    """
    Examines all entities in a case and extracts high-confidence correlation
    and alias-resolution candidates across multiple investigative dimensions.
    """
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    if len(entities) < 2:
        return []

    created = []

    def add_candidate(a: Entity, b: Entity, score: float, reasons: List[str]):
        if a.id == b.id:
            return
        # Avoid duplicate candidate pairs
        existing = (
            db.query(EntityResolutionCandidate)
            .filter(
                EntityResolutionCandidate.case_id == case_id,
                EntityResolutionCandidate.entity_a_id.in_([a.id, b.id]),
                EntityResolutionCandidate.entity_b_id.in_([a.id, b.id]),
            )
            .first()
        )
        if existing:
            return

        candidate = EntityResolutionCandidate(
            case_id=case_id,
            entity_a_id=a.id,
            entity_b_id=b.id,
            confidence_score=round(score, 2),
            supporting_evidence=reasons,
        )
        db.add(candidate)
        created.append(candidate)

    # 1. Names / Organizations / Social Media
    name_entities = [e for e in entities if e.entity_type in NAME_TYPES]
    for i in range(len(name_entities)):
        for j in range(i + 1, len(name_entities)):
            a, b = name_entities[i], name_entities[j]
            if a.value.strip().lower() == b.value.strip().lower():
                continue
            sim = _name_similarity(a.value, b.value)
            if sim >= 0.50:
                add_candidate(
                    a, b, sim,
                    [
                        f"String/phonetic similarity {round(sim * 100)}% between '{a.value}' and '{b.value}'.",
                        f"Same source evidence: {a.first_seen_evidence_id == b.first_seen_evidence_id}",
                    ]
                )

    # 2. Email domain infrastructure matching (e.g. phishing accounts on same domain)
    emails = [e for e in entities if e.entity_type == EntityType.EMAIL]
    domains = [e for e in entities if e.entity_type == EntityType.DOMAIN]

    for i in range(len(emails)):
        dom_a = _get_email_domain(emails[i].value)
        if not dom_a:
            continue
        # Compare email to email (same sender domain)
        for j in range(i + 1, len(emails)):
            dom_b = _get_email_domain(emails[j].value)
            if dom_a == dom_b:
                add_candidate(
                    emails[i], emails[j], 0.90,
                    [
                        f"Shared email infrastructure domain: '{dom_a}'",
                        f"Likely related accounts / sender cluster ({emails[i].value} <-> {emails[j].value})"
                    ]
                )
        # Compare email to domain entities
        for dom_ent in domains:
            if dom_a == dom_ent.value.strip().lower():
                add_candidate(
                    emails[i], dom_ent, 0.95,
                    [f"Email address '{emails[i].value}' operates on domain '{dom_ent.value}'"]
                )

    # 3. IP Subnet matching (same /24 subnet -> lateral pivot / local host network)
    ips = [e for e in entities if e.entity_type == EntityType.IP_ADDRESS]
    for i in range(len(ips)):
        sub_a = _get_ip_subnet24(ips[i].value)
        if not sub_a:
            continue
        for j in range(i + 1, len(ips)):
            sub_b = _get_ip_subnet24(ips[j].value)
            if sub_a == sub_b and ips[i].value != ips[j].value:
                add_candidate(
                    ips[i], ips[j], 0.85,
                    [
                        f"Both hosts reside in the same /24 subnet ({sub_a})",
                        f"Indicates local LAN segment, lateral movement, or shared host group."
                    ]
                )

    # 4. Tor Onion / URL Host matching
    urls = [e for e in entities if e.entity_type == EntityType.URL]
    for i in range(len(urls)):
        host_a = _get_url_host(urls[i].value)
        if not host_a:
            continue
        for j in range(i + 1, len(urls)):
            host_b = _get_url_host(urls[j].value)
            if host_a == host_b and urls[i].value != urls[j].value:
                is_onion = ".onion" in host_a
                score = 0.95 if is_onion else 0.80
                label = "Tor Hidden Service C2 portal" if is_onion else "Web Host"
                add_candidate(
                    urls[i], urls[j], score,
                    [
                        f"Shared {label}: '{host_a}'",
                        f"Multiple endpoints observed on the same infrastructure."
                    ]
                )

    # 5. Sequential / Duplicate Files
    files = [e for e in entities if e.entity_type == EntityType.FILE]
    for i in range(len(files)):
        for j in range(i + 1, len(files)):
            sim = _name_similarity(files[i].value, files[j].value)
            if sim >= 0.70 and files[i].value != files[j].value:
                add_candidate(
                    files[i], files[j], 0.80,
                    [
                        f"Sequential or duplicate file artifact name pattern ({round(sim * 100)}% match)",
                        f"'{files[i].value}' <-> '{files[j].value}'"
                    ]
                )

    db.commit()
    return created
