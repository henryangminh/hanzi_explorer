import json
from functools import lru_cache

from sqlmodel import Session, select

from app.models.character import Character


def get_characters_with_component(session: Session, component: str) -> list[str]:
    """
    Return all characters that contain the given component/radical,
    searched by radical column and components JSON arrays,
    sorted by stroke_count then simplified form.
    """
    # LIKE pre-filters at DB level; Python validates exact JSON element match.
    like = f'%"{component}"%'
    candidates = session.exec(
        select(Character).where(
            (Character.radical == component)
            | Character.components.like(like)
            | Character.components_traditional.like(like)
        )
    ).all()

    seen: set[str] = set()
    result: list[Character] = []
    for c in candidates:
        if c.simplified in seen:
            continue
        if (
            c.radical == component
            or component in (json.loads(c.components) if c.components else [])
            or component in (json.loads(c.components_traditional) if c.components_traditional else [])
        ):
            seen.add(c.simplified)
            result.append(c)

    result.sort(key=lambda c: (c.stroke_count or c.stroke_count_traditional or 9999, c.simplified))
    return [c.simplified for c in result]


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
