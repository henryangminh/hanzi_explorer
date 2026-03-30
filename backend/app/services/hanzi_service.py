"""
Hanzipy-based character decomposition service.
Returns all characters that share the given radical/component.
"""
from functools import lru_cache
from hanzipy.decomposer import HanziDecomposer


@lru_cache(maxsize=1)
def _get_decomposer() -> HanziDecomposer:
    """Singleton — compiling 12k chars is expensive, do it once."""
    return HanziDecomposer()


def get_characters_with_component(component: str) -> list[str]:
    """
    Return all characters that contain the given component/radical.
    Handles radical variants automatically (氵↔水, 忄↔心, etc.)
    """
    decomposer = _get_decomposer()
    if component in decomposer.radicals:
        components = decomposer.find_same_meaning_radicals(component)
        characters: list[str] = []
        for comp in components:
            chars = decomposer.characters_with_component.get(comp)
            if chars:
                characters.extend(chars)
        return characters
    return decomposer.characters_with_component.get(component) or []
