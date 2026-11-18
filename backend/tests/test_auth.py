import time

import pytest

from app.core import login_throttle
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


def _login(client, password):
    return client.post("/api/v1/auth/login", json={"username": "henry", "password": password})


def test_too_many_wrong_passwords_lock_out_even_the_right_one(client, make_user):
    make_user("henry", "secret-pass")
    for _ in range(5):
        assert _login(client, "wrong").status_code == 401
    r = _login(client, "secret-pass")
    assert r.status_code == 429 and int(r.headers["Retry-After"]) > 0


def test_a_successful_login_forgets_earlier_failures(client, make_user):
    make_user("henry", "secret-pass")
    for _ in range(4):
        _login(client, "wrong")
    assert _login(client, "secret-pass").status_code == 200
    for _ in range(4):
        assert _login(client, "wrong").status_code == 401
    assert _login(client, "secret-pass").status_code == 200


def test_the_lockout_ends_after_the_window(client, make_user, monkeypatch):
    make_user("henry", "secret-pass")
    for _ in range(5):
        _login(client, "wrong")
    later = time.monotonic() + login_throttle.WINDOW_SECONDS + 1
    monkeypatch.setattr(login_throttle.time, "monotonic", lambda: later)
    assert _login(client, "secret-pass").status_code == 200
