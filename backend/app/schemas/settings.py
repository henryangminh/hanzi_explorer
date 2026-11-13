from typing import Literal
from pydantic import BaseModel


class SettingsResponse(BaseModel):
    language: str
    theme: str


class SettingsUpdate(BaseModel):
    language: Literal["vi", "en"] | None = None
    theme: Literal["light", "dark"] | None = None
