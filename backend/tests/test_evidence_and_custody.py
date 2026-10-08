"""
Integration tests for evidence upload, hash integrity, and chain of
custody (Modules 2, 3, 19).
"""


def _create_case(client, headers):
    resp = client.post("/api/cases", json={"title": "Evidence Test Case", "priority": "HIGH"}, headers=headers)
    return resp.json()["id"]


def test_evidence_upload_computes_hash_and_logs_custody(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    resp = client.post(
        "/api/evidence/upload",
        data={"case_id": case_id, "source": "Test upload"},
        files={"file": ("note.txt", b"Suspect met contact at 5pm.", "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["sha256_hash"]) == 64
    assert body["status"] == "UPLOADED"

    custody = client.get(f"/api/evidence/{body['id']}/chain-of-custody", headers=auth_headers)
    assert custody.status_code == 200
    actions = [c["action"] for c in custody.json()]
    assert "UPLOADED" in actions


def test_hash_verification_matches_after_upload(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    upload = client.post(
        "/api/evidence/upload",
        data={"case_id": case_id},
        files={"file": ("evidence.txt", b"unmodified content", "text/plain")},
        headers=auth_headers,
    )
    evidence_id = upload.json()["id"]

    verify = client.get(f"/api/evidence/{evidence_id}/hash", headers=auth_headers)
    assert verify.status_code == 200
    assert verify.json()["matches"] is True


def test_rejected_file_extension(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    resp = client.post(
        "/api/evidence/upload",
        data={"case_id": case_id},
        files={"file": ("malware.exe.bin", b"x", "application/octet-stream")},
        headers=auth_headers,
    )
    # .bin is not in ALLOWED_EXTENSIONS
    assert resp.status_code == 400


def test_full_analysis_pipeline_extracts_entities(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    upload = client.post(
        "/api/evidence/upload",
        data={"case_id": case_id},
        files={"file": ("chat_log.txt", b"Contact rahul@example.com from IP 10.0.0.5 immediately.", "text/plain")},
        headers=auth_headers,
    )
    evidence_id = upload.json()["id"]

    analysis = client.post(f"/api/analysis/document/{evidence_id}", headers=auth_headers)
    assert analysis.status_code == 200
    body = analysis.json()
    assert body["entities_extracted"] >= 2

    graph = client.get(f"/api/graph/case/{case_id}", headers=auth_headers)
    assert graph.status_code == 200
    assert len(graph.json()["nodes"]) >= 2


def test_delete_evidence(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    upload = client.post(
        "/api/evidence/upload",
        data={"case_id": case_id, "source": "Temporary mistakenly uploaded file"},
        files={"file": ("mistake.txt", b"Accidentally uploaded item", "text/plain")},
        headers=auth_headers,
    )
    assert upload.status_code == 200
    evidence_id = upload.json()["id"]

    del_resp = client.delete(f"/api/evidence/{evidence_id}", headers=auth_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["detail"] == "Evidence deleted successfully"

    # Verify 404 on get
    get_resp = client.get(f"/api/evidence/{evidence_id}", headers=auth_headers)
    assert get_resp.status_code == 404

