"""
AI Document Analysis / Entity Extraction (Module 4).

Combines:
  - spaCy NER for PERSON / ORGANIZATION / LOCATION / DATE
  - Deterministic regex extractors for structured forensic identifiers
    (phone numbers, emails, IPs, domains, URLs, bank accounts, crypto
    wallets, transaction IDs, social media handles) where regex is more
    reliable and auditable than a language model.

Every extracted entity carries a confidence score. Regex-matched
structured entities get high, fixed confidence (they either match the
pattern or they don't); NER-based entities carry spaCy's implied
confidence, approximated here since spaCy's default pipeline does not
expose per-entity probabilities.
"""
import re
from typing import List

from app.schemas.schemas import ExtractedEntity

_NLP = None
_SPACY_AVAILABLE = None  # None = not yet checked


def get_nlp():
    global _NLP, _SPACY_AVAILABLE
    if _SPACY_AVAILABLE is False:
        return None
    if _NLP is None:
        try:
            import spacy  # lazy import — avoids DLL-load crash at module level
            try:
                _NLP = spacy.load("en_core_web_sm")
            except OSError:
                # Model not downloaded; blank pipeline still tokenises text.
                _NLP = spacy.blank("en")
            _SPACY_AVAILABLE = True
        except (ImportError, Exception) as exc:
            # Windows Application Control or missing wheel — degrade gracefully.
            import logging
            logging.getLogger(__name__).warning(
                "spaCy unavailable (%s). NER disabled; regex extraction still active.", exc
            )
            _SPACY_AVAILABLE = False
    return _NLP


# --- Regex patterns for structured forensic entities ---------------------

PATTERNS = {
    "EMAIL": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
    "IP_ADDRESS": re.compile(
        r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"
    ),
    "URL": re.compile(r"https?://[^\s\"'<>]+"),
    "DOMAIN": re.compile(
        r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|in|io|co|gov|edu|info|biz|xyz|ru|cn)\b"
    ),
    "PHONE_NUMBER": re.compile(
        r"(?:\+91[\-\s]?)?[6-9]\d{9}\b|\+\d{1,3}[\-\s]?\d{6,12}"
    ),
    "BANK_ACCOUNT": re.compile(r"\b\d{9,18}\b"),
    "CRYPTO_WALLET": re.compile(
        r"\b(?:bc1[a-zA-HJ-NP-Z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40})\b"
    ),
    "TRANSACTION_ID": re.compile(r"\b(?:TXN|UTR|REF)[A-Z0-9]{6,20}\b", re.IGNORECASE),
    "SOCIAL_MEDIA_ACCOUNT": re.compile(r"(?<!\w)@[A-Za-z0-9_.]{3,30}\b"),
    "FILE": re.compile(
        r"\b[\w,\s-]+\.(?:exe|dll|pdf|docx|xlsx|zip|rar|jpg|png|txt|log|csv|py|sh|bat)\b",
        re.IGNORECASE,
    ),
}

# Confidence for pure regex matches is high but not 1.0, to signal "matched a
# structural pattern" rather than "semantically verified".
REGEX_CONFIDENCE = 0.90

SPACY_LABEL_MAP = {
    "PERSON": "PERSON",
    "ORG": "ORGANIZATION",
    "GPE": "LOCATION",
    "LOC": "LOCATION",
    "DATE": "DATE",
    "TIME": "TIME",
    "FAC": "LOCATION",
    "NORP": "ORGANIZATION",
}


def extract_entities(text: str) -> List[ExtractedEntity]:
    """Run the full entity extraction pipeline over a block of evidence text."""
    if not text:
        return []

    results: List[ExtractedEntity] = []
    seen = set()

    # 1. Structured / regex entities first — most forensically reliable.
    #    BANK_ACCOUNT is deliberately checked last & only if no other
    #    pattern already claimed the same span, since a bare 9-18 digit
    #    run is a very weak signal and easily collides with phone/txn ids.
    ordered_types = [t for t in PATTERNS if t != "BANK_ACCOUNT"] + ["BANK_ACCOUNT"]
    claimed_spans = []

    for etype in ordered_types:
        pattern = PATTERNS[etype]
        for m in pattern.finditer(text):
            start, end = m.start(), m.end()
            if any(not (end <= s or start >= e) for s, e in claimed_spans):
                continue
            value = m.group().strip()
            key = (etype, value.lower())
            if key in seen:
                continue
            seen.add(key)
            claimed_spans.append((start, end))
            results.append(
                ExtractedEntity(
                    entity_type=etype,
                    value=value,
                    confidence_score=REGEX_CONFIDENCE,
                    span_start=start,
                    span_end=end,
                )
            )

    # 2. spaCy NER for unstructured entities (people, orgs, locations, dates)
    nlp = get_nlp()
    if nlp is None:
        return results  # spaCy blocked by OS policy; regex results are still returned
    doc = nlp(text[:100_000])  # guard against pathologically large documents
    for ent in getattr(doc, "ents", []):
        mapped = SPACY_LABEL_MAP.get(ent.label_)
        if not mapped:
            continue
        key = (mapped, ent.text.strip().lower())
        if key in seen or not ent.text.strip():
            continue
        seen.add(key)
        results.append(
            ExtractedEntity(
                entity_type=mapped,
                value=ent.text.strip(),
                confidence_score=0.75,  # heuristic — spaCy sm model, no native prob
                span_start=ent.start_char,
                span_end=ent.end_char,
            )
        )

    return results
