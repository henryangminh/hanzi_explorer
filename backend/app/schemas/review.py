from pydantic import BaseModel, Field

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


class ReviewScheduleRequest(BaseModel):
    char: str
    date: str = Field(pattern=DATE_PATTERN)  # local date the word was marked "not learned"


class ReviewAnswerRequest(BaseModel):
    char: str
    date: str = Field(pattern=DATE_PATTERN)  # local date of the review
    remembered: bool
