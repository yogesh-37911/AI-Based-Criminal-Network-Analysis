"""Unit tests for the regex/NER entity extraction pipeline (Module 4). No DB needed."""
from app.services.entity_extraction import extract_entities


def test_extracts_email():
    entities = extract_entities("Contact the suspect at rahul.kumar@gmail.com regarding the transfer.")
    values = [e.value for e in entities if e.entity_type == "EMAIL"]
    assert "rahul.kumar@gmail.com" in values


def test_extracts_ip_address():
    entities = extract_entities("The login originated from 192.168.1.45 at 3am.")
    values = [e.value for e in entities if e.entity_type == "IP_ADDRESS"]
    assert "192.168.1.45" in values


def test_extracts_phone_number():
    entities = extract_entities("Suspect's registered mobile is 9845012345.")
    values = [e.value for e in entities if e.entity_type == "PHONE_NUMBER"]
    assert any("9845012345" in v for v in values)


def test_extracts_url():
    entities = extract_entities("Malicious payload hosted at https://malicious-example.test/payload.exe")
    values = [e.value for e in entities if e.entity_type == "URL"]
    assert any("malicious-example.test" in v for v in values)


def test_no_entities_in_empty_text():
    assert extract_entities("") == []


def test_confidence_scores_are_bounded():
    entities = extract_entities("Email test@example.com and IP 10.0.0.1 both appear here.")
    for e in entities:
        assert 0.0 <= e.confidence_score <= 1.0
