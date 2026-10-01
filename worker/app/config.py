from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"

    transcribe_provider: str = "groq"
    groq_api_key: str = ""
    openai_api_key: str = ""

    worker_shared_secret: str = ""

    ytdlp_cookies_file: str = ""
    ytdlp_cookies_b64: str = ""

    daily_import_limit: int = 20
    max_video_seconds: int = 600
    max_video_mb: int = 200
    max_frames: int = 8
    worker_poll_seconds: int = 5
    tmp_dir: str = "/app/tmp"

    @property
    def configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


settings = Settings()
