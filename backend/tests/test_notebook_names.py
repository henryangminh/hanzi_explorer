from tests.conftest import auth

URL = "/api/v1/notebooks"


def test_a_user_cannot_have_two_notebooks_with_the_same_name(client, make_user):
    h = auth(make_user("a"))
    assert client.post(URL, json={"name": "HSK 3"}, headers=h).status_code == 201
    assert client.post(URL, json={"name": "hsk 3"}, headers=h).status_code == 409
    assert client.post(URL, json={"name": "  HSK 3 "}, headers=h).status_code == 409


def test_different_users_may_use_the_same_name(client, make_user):
    assert client.post(URL, json={"name": "HSK 3"}, headers=auth(make_user("a"))).status_code == 201
    assert client.post(URL, json={"name": "HSK 3"}, headers=auth(make_user("b"))).status_code == 201


def test_renaming_to_a_taken_name_is_refused_but_keeping_ones_own_name_is_fine(client, make_user):
    h = auth(make_user("a"))
    client.post(URL, json={"name": "One"}, headers=h)
    two = client.post(URL, json={"name": "Two"}, headers=h).json()
    assert client.patch(f"{URL}/{two['id']}", json={"name": "ONE"}, headers=h).status_code == 409
    assert client.patch(f"{URL}/{two['id']}", json={"name": "two", "description": "x"}, headers=h).status_code == 200


def test_global_names_are_unique_among_global_notebooks(client, make_user):
    h = auth(make_user("admin", is_admin=True))
    assert client.post(URL, json={"name": "HSK 1", "type": "global"}, headers=h).status_code == 201
    assert client.post(URL, json={"name": "HSK 1", "type": "global"}, headers=h).status_code == 409
    assert client.post(URL, json={"name": "HSK 1"}, headers=h).status_code == 201  # a private one may share it
