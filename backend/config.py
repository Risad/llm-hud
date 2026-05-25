from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Default DB lives in ~/.llm-hud/ (local disk) so it is never on a cloud drive.
_default_db_path = Path.home() / ".llm-hud" / "llm_hud.db"
_default_db_url = f"sqlite+aiosqlite:///{_default_db_path.as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8000
    database_url: str = _default_db_url
    secret_key_path: str = ""
    cors_origins: str = "http://localhost:5173 http://localhost:4173"

    @property
    def cors_origins_list(self) -> list[str]:
        return self.cors_origins.split()

    @property
    def secret_key_file(self) -> Path:
        if self.secret_key_path:
            return Path(self.secret_key_path)
        return Path.home() / ".llm-hud" / "secret.key"


settings = Settings()
