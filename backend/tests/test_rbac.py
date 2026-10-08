"""RBAC permission-boundary tests (Module 17)."""


def _register_and_login(client, role, email):
    client.post("/api/auth/register", json={
        "full_name": f"{role} User", "email": email, "password": "RolePass123!", "role": role,
    })
    login = client.post("/api/auth/login", json={"email": email, "password": "RolePass123!"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_viewer_cannot_create_case(client):
    headers = _register_and_login(client, "VIEWER", "viewer.rbac@forge-ai.local")
    resp = client.post("/api/cases", json={"title": "Should Fail", "priority": "LOW"}, headers=headers)
    assert resp.status_code == 403


def test_investigator_can_create_case(client):
    headers = _register_and_login(client, "INVESTIGATOR", "investigator.rbac@forge-ai.local")
    resp = client.post("/api/cases", json={"title": "Investigator Case", "priority": "MEDIUM"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Investigator Case"


def test_auditor_cannot_upload_evidence(client):
    headers = _register_and_login(client, "AUDITOR", "auditor.rbac@forge-ai.local")
    resp = client.post(
        "/api/evidence/upload",
        data={"case_id": "00000000-0000-0000-0000-000000000000"},
        files={"file": ("test.txt", b"content", "text/plain")},
        headers=headers,
    )
    assert resp.status_code == 403


def test_non_admin_cannot_manage_users(client):
    headers = _register_and_login(client, "INVESTIGATOR", "investigator2.rbac@forge-ai.local")
    resp = client.get("/api/users", headers=headers)
    assert resp.status_code == 403


def test_super_admin_can_manage_users(client, auth_headers):
    resp = client.get("/api/users", headers=auth_headers)
    assert resp.status_code == 200
