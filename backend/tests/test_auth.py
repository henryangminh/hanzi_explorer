import pytest

from tests.conftest import auth


def test_login_with_the_right_password(client, make_user):
    make_user("henry", "secret-pass")
    r = client.post("/api/v1/auth/login", json={"username": "henry", "password": "secret-pass"})
    assert r.status_code == 200 and r.json()["access_token"]


@pytest.mark.parametrize("username, password", [
    ("henry", "wrong"),
    ("henry' --", "x"),
    ("' OR '1'='1", "' OR '1'='1"),
])
def test_login_rejects_wrong_credentials_and_injection(client, make_user, username, password):
    make_user("henry", "secret-pass")
    r = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert r.status_code == 401


def test_deleted_user_cannot_log_in_or_use_a_token(client, session, make_user):
    u = make_user("henry", "secret-pass")
    headers = auth(u)
    u.is_deleted = True
    session.add(u)
    session.commit()
    assert client.post("/api/v1/auth/login", json={"username": "henry", "password": "secret-pass"}).status_code == 401
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_requests_without_a_token_are_rejected(client):
    assert client.get("/api/v1/notebooks").status_code == 401


def test_admin_routes_are_admin_only(client, make_user):
    assert client.get("/api/v1/admin/users", headers=auth(make_user("henry"))).status_code == 403
    assert client.get("/api/v1/admin/users", headers=auth(make_user("boss", is_admin=True))).status_code == 200


def test_locked_user_cannot_log_in_or_use_a_token(client, session, make_user):
    u = make_user("henry", "secret-pass")
    headers = auth(u)
    u.is_active = False
    session.add(u)
    session.commit()
    r = client.post("/api/v1/auth/login", json={"username": "henry", "password": "secret-pass"})
    assert r.status_code == 403
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
    # A wrong password still says nothing about the account being locked
    assert client.post("/api/v1/auth/login", json={"username": "henry", "password": "wrong"}).status_code == 401


def test_unlocked_user_can_log_in_again(client, session, make_user):
    u = make_user("henry", "secret-pass")
    u.is_active = False
    session.add(u)
    session.commit()
    u.is_active = True
    session.add(u)
    session.commit()
    assert client.post("/api/v1/auth/login", json={"username": "henry", "password": "secret-pass"}).status_code == 200
