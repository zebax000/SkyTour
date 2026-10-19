from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str = "cambia-esta-clave"
    access_token_expire_minutes: int = 60
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")


settings = Settings()
