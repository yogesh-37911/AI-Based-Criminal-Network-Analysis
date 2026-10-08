"""Integration tests for authentication (Module 18). Requires Postgres."""


def test_register_and_login(client):
    reg = client.post("/api/auth/register", json={
        "full_name": "Jane Investigator",
        "email": "jane@forge-ai.local",
        "password": "SecurePass123!",
        "role": "INVESTIGATOR",
    })
    assert reg.status_code == 200
    assert reg.json()["email"] == "jane@forge-ai.local"

    login = client.post("/api/auth/login", json={"email": "jane@forge-ai.local", "password": "SecurePass123!"})
    assert login.status_code == 200
    body = login.json()
    assert "access_token" in body
    assert "refresh_token" in body


def test_login_wrong_password_rejected(client):
    client.post("/api/auth/register", json={
        "full_name": "Bob Analyst",
        "email": "bob@forge-ai.local",
        "password": "CorrectPass123!",
        "role": "FORENSIC_ANALYST",
    })
    resp = client.post("/api/auth/login", json={"email": "bob@forge-ai.local", "password": "WrongPassword"})
    assert resp.status_code == 401


def test_duplicate_registration_rejected(client):
    payload = {
        "full_name": "Dup User",
        "email": "dup@forge-ai.local",
        "password": "SomePass123!",
        "role": "VIEWER",
    }
    first = client.post("/api/auth/register", json=payload)
    assert first.status_code == 200
    second = client.post("/api/auth/register", json=payload)
    assert second.status_code == 400


def test_protected_endpoint_requires_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "testadmin@forge-ai.local"


def test_refresh_token_issues_new_access_token(client):
    client.post("/api/auth/register", json={
        "full_name": "Refresh User", "email": "refresh@forge-ai.local",
        "password": "RefreshPass123!", "role": "VIEWER",
    })
    login = client.post("/api/auth/login", json={"email": "refresh@forge-ai.local", "password": "RefreshPass123!"})
    refresh_token = login.json()["refresh_token"]
    resp = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
