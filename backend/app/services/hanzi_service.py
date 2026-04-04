"""
Character decomposition service.
Returns all characters that share the given component, using the hanzi_decomposition DB table.
"""
from functools import lru_cache

from sqlmodel import Session, select

from app.models.note import HanziDecomposition


def get_characters_with_component(session: Session, component: str) -> list[str]:
    """
    Return all characters that contain the given component/radical,
    queried from the hanzi_decomposition table.
    """
    rows = session.exec(
        select(HanziDecomposition.character)
        .where(HanziDecomposition.component == component)
    ).all()
    return list(rows)


@lru_cache(maxsize=1)
def _get_decomposer():
    from hanzipy.decomposer import HanziDecomposer
    return HanziDecomposer()


def get_hanzipy_components(char: str) -> list[str]:
    """Return immediate structural components of a character via hanzipy (decompose level 1)."""
    try:
        decomposer = _get_decomposer()
        result = decomposer.decompose(char, 1)
        components = result.get('components', [])
        # Filter out the character itself
        return [c for c in components if c != char]
    except Exception:
        return []
