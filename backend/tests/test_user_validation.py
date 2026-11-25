import pytest

from tests.conftest import auth


@pytest.mark.parametrize("name", ["", "   ", "x" * 101])
def test_profile_rejects_a_blank_or_too_long_display_name(client, make_user, name):
    u = make_user("henry")
    assert client.patch("/api/v1/users/profile", json={"display_name": name}, headers=auth(u)).status_code == 422


def test_profile_display_name_is_trimmed(client, make_user):
    u = make_user("henry")
    r = client.patch("/api/v1/users/profile", json={"display_name": "  Henry  "}, headers=auth(u))
    assert r.status_code == 200 and r.json()["display_name"] == "Henry"


def test_new_password_needs_six_characters(client, make_user):
    u = make_user("henry", "secret-pass")
    body = {"current_password": "secret-pass", "new_password": "12345"}
    assert client.patch("/api/v1/users/profile", json=body, headers=auth(u)).status_code == 422
    assert client.post("/api/v1/auth/login", json={"username": "henry", "password": "secret-pass"}).status_code == 200


@pytest.mark.parametrize("body", [
    {"username": "", "display_name": "A", "password": "secret1"},
    {"username": "   ", "display_name": "A", "password": "secret1"},
    {"username": "x" * 51, "display_name": "A", "password": "secret1"},
    {"username": "anna", "display_name": " ", "password": "secret1"},
    {"username": "anna", "display_name": "A", "password": ""},
    {"username": "anna", "display_name": "A", "password": "12345"},
])
def test_admin_cannot_create_an_invalid_user(client, make_user, body):
    admin = make_user("boss", is_admin=True)
    assert client.post("/api/v1/admin/users", json=body, headers=auth(admin)).status_code == 422


def test_admin_cannot_set_a_short_password(client, make_user):
    admin, u = make_user("boss", is_admin=True), make_user("henry")
    r = client.patch(f"/api/v1/admin/users/{u.id}", json={"new_password": "123"}, headers=auth(admin))
    assert r.status_code == 422


@pytest.mark.parametrize("body", [{"name": ""}, {"name": "   "}, {"name": "x" * 101}, {"name": "ok", "description": "x" * 151}])
def test_notebook_name_and_description_limits(client, make_user, body):
    assert client.post("/api/v1/notebooks", json=body, headers=auth(make_user("henry"))).status_code == 422


@pytest.mark.parametrize("body", [{"title": ""}, {"title": "  "}, {"title": "x" * 51}, {"title": "ok", "detail": "x" * 251}])
def test_note_title_and_detail_limits(client, make_user, body):
    assert client.post("/api/v1/dictionary/学/notes", json=body, headers=auth(make_user("henry"))).status_code == 422
