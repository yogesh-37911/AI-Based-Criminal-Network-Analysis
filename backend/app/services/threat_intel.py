"""
Cyber Threat Intelligence enrichment (Module 10).

Wraps optional external integrations (VirusTotal, AbuseIPDB, WHOIS).
If an API key isn't configured, the service returns
enrichment_available=False and a clear "unavailable" message —
it NEVER fabricates a verdict.
"""
from typing import Optional
import httpx

from app.core.config import settings
from app.models.models import ThreatIndicator


async def check_virustotal(indicator_type: str, value: str) -> Optional[dict]:
    if not settings.VIRUSTOTAL_API_KEY:
        return None
    endpoint_map = {
        "IP": f"https://www.virustotal.com/api/v3/ip_addresses/{value}",
        "DOMAIN": f"https://www.virustotal.com/api/v3/domains/{value}",
        "URL": "https://www.virustotal.com/api/v3/urls",
        "HASH": f"https://www.virustotal.com/api/v3/files/{value}",
    }
    url = endpoint_map.get(indicator_type)
    if not url:
        return None
    headers = {"x-apikey": settings.VIRUSTOTAL_API_KEY}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
        except httpx.HTTPError:
            return None
    return None


async def check_abuseipdb(value: str) -> Optional[dict]:
    if not settings.ABUSEIPDB_API_KEY:
        return None
    headers = {"Key": settings.ABUSEIPDB_API_KEY, "Accept": "application/json"}
    params = {"ipAddress": value, "maxAgeInDays": 90}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                "https://api.abuseipdb.com/api/v2/check", headers=headers, params=params
            )
            if resp.status_code == 200:
                return resp.json()
        except httpx.HTTPError:
            return None
    return None


async def enrich_indicator(indicator_type: str, value: str) -> dict:
    """
    Returns a normalized enrichment result. If no provider is configured
    or reachable, explicitly reports unavailability rather than guessing.
    """
    result = {
        "indicator_type": indicator_type,
        "indicator_value": value,
        "source": None,
        "verdict": None,
        "enrichment_available": False,
        "raw_response": None,
        "message": "Threat intelligence unavailable.",
    }

    if indicator_type in ("IP", "DOMAIN", "URL", "HASH"):
        vt = await check_virustotal(indicator_type, value)
        if vt:
            stats = (
                vt.get("data", {})
                .get("attributes", {})
                .get("last_analysis_stats", {})
            )
            malicious = stats.get("malicious", 0)
            verdict = "MALICIOUS" if malicious > 0 else "CLEAN"
            result.update(
                source="VirusTotal",
                verdict=verdict,
                enrichment_available=True,
                raw_response=stats,
                message=None,
            )
            return result

    if indicator_type == "IP":
        ab = await check_abuseipdb(value)
        if ab:
            score = ab.get("data", {}).get("abuseConfidenceScore", 0)
            verdict = "MALICIOUS" if score > 50 else ("SUSPICIOUS" if score > 10 else "CLEAN")
            result.update(
                source="AbuseIPDB",
                verdict=verdict,
                enrichment_available=True,
                raw_response=ab.get("data"),
                message=None,
            )
            return result

    return result
