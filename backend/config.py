from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Ephemeral Care Room"
    secret_key: str = "change-in-production-use-env"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24h
    database_url: str = "sqlite+aiosqlite:///./ephemeral_care.db"
    upload_dir: str = "./temp_uploads"
    allowed_extensions: set = frozenset({"pdf", "jpg", "jpeg", "png"})
    max_upload_mb: int = 10
    google_client_id: str | None = None  # set via env GOOGLE_CLIENT_ID
    session_start_early_minutes: int = 10
    session_start_late_minutes: int = 30

    class Config:
        env_file = ".env"


@lru_cache
def get_settings():
    return Settings()
