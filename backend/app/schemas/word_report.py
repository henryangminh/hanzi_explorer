from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

ReportStatus = Literal["open", "resolved"]


class WordReportCreate(BaseModel):
    char: str = Field(min_length=1, max_length=50)
    message: str = Field(min_length=1, max_length=1000)


class WordReportUpdate(BaseModel):
    status: ReportStatus


class WordReportResponse(BaseModel):
    id: int
    char: str
    message: str
    status: ReportStatus
    reporter: str  # display name of the user who reported it
    created_at: datetime
    resolved_at: Optional[datetime]
