from datetime import datetime

from pydantic import BaseModel


class UserActivity(BaseModel):
    id: int
    username: str
    display_name: str
    studied_dates: list[str]  # newest first; streaks are computed by the client in its local time
    learned_count: int
    not_learned_count: int
    review_due: int


class RecentSearch(BaseModel):
    display_name: str
    char: str
    searched_at: datetime


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    deleted_users: int
    global_notebooks: int
    global_entries: int
    open_reports: int
    learners: list[UserActivity]
    recent_searches: list[RecentSearch]
