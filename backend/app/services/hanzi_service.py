"""
Character decomposition service.
Returns all characters that share the given component, using the characters table.
"""
import json
from functools import lru_cache

from sqlalchemy import text
from sqlmodel import Session

from app.models.character import Character


def get_characters_with_component(session: Session, component: str) -> list[str]:
    """
    Return all characters that contain the given component/radical,
    queried from characters.components and characters.components_traditional,
    sorted by stroke_count (simplified first, then traditional).
    """
    # Search by radical column AND inside components JSON arrays
    sql = text("""
        SELECT DISTINCT c.simplified, c.stroke_count, c.stroke_count_traditional
        FROM characters c
        WHERE c.radical = :comp
        OR EXISTS (
            SELECT 1 FROM json_each(c.components) je WHERE je.value = :comp
        )
        OR EXISTS (
            SELECT 1 FROM json_each(c.components_traditional) je WHERE je.value = :comp
        )
        ORDER BY
            COALESCE(c.stroke_count, c.stroke_count_traditional, 9999),
            c.simplified
    """)
    rows = session.execute(sql, {"comp": component}).fetchall()
    return [row[0] for row in rows]


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
