from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Hanzi Explorer"
    app_env: str = "development"

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days

    # Database — app.db holds user data (read/write); dictionary.db is reference data (read-only)
    database_url: str = "sqlite:///./data/app.db"
    dictionary_db_path: str = "./data/dictionary.db"

    # CORS
    cors_origins: List[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
