from pydantic import BaseModel, Field


class WOTDSaveRequest(BaseModel):
    date: str        # YYYY-MM-DD (local date from client)
    chars: list[str]


class WOTDSaveResponse(BaseModel):
    saved: bool


class StudyDayRequest(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")  # YYYY-MM-DD (local date from client)
