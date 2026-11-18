from app.models.flashcard import UserFlashcard
from app.models.notebook import Notebook, NotebookEntry
from tests.conftest import auth


def _notebook(session, chars, owner_id=None, type="global"):
    nb = Notebook(name="nb", type=type, owner_id=owner_id)
    session.add(nb)
    session.commit()
    session.add_all([NotebookEntry(notebook_id=nb.id, char=c) for c in chars])
    session.commit()
    return nb


def test_returns_the_users_statuses_for_every_word_beyond_500(client, session, make_user):
    a, b = make_user("a"), make_user("b")
    chars = [chr(0x4E00 + i) for i in range(1200)]
    nb = _notebook(session, chars)
    session.add_all([UserFlashcard(user_id=a.id, char=c, status="learned") for c in chars[:1000]])
    session.add(UserFlashcard(user_id=a.id, char=chars[1100], status="not_learned"))
    session.add(UserFlashcard(user_id=b.id, char=chars[1199], status="learned"))  # someone else's
    session.add(UserFlashcard(user_id=a.id, char="外", status="learned"))         # not in the notebook
    session.commit()

    data = client.get(f"/api/v1/notebooks/{nb.id}/statuses", headers=auth(a)).json()
    assert len(data) == 1001
    assert sum(s == "learned" for s in data.values()) == 1000
    assert data[chars[1100]] == "not_learned"
    assert chars[1199] not in data and "外" not in data


def test_someone_elses_private_notebook_is_forbidden(client, session, make_user):
    a, b = make_user("a"), make_user("b")
    nb = _notebook(session, ["学"], owner_id=a.id, type="private")
    assert client.get(f"/api/v1/notebooks/{nb.id}/statuses", headers=auth(b)).status_code == 403
    assert client.get(f"/api/v1/notebooks/{nb.id}/statuses", headers=auth(a)).status_code == 200


def test_missing_notebook_is_404(client, make_user):
    assert client.get("/api/v1/notebooks/999/statuses", headers=auth(make_user("a"))).status_code == 404
