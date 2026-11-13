from pydantic import BaseModel


class WOTDSaveRequest(BaseModel):
    date: str        # YYYY-MM-DD (local date from client)
    chars: list[str]


class WOTDSaveResponse(BaseModel):
    saved: bool
