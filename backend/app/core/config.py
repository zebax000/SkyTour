from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str = "cambia-esta-clave"
    access_token_expire_minutes: int = 60
    frontend_url: str = "http://localhost:5173"
    seed_password: Optional[str] = None  # solo para el script de datos de demostración

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")


settings = Settings()
