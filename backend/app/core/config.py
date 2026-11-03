from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CLAVE_DE_EJEMPLO = "cambia-esta-clave"


class Settings(BaseSettings):
    database_url: str
    secret_key: str = CLAVE_DE_EJEMPLO
    access_token_expire_minutes: int = 60
    reset_token_expire_minutes: int = 30
    frontend_url: str = "http://localhost:5173"
    seed_password: str | None = None
    brevo_api_key: str | None = None
    correo_remitente: str | None = None
    correo_nombre_remitente: str = "SkyTour"

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    @model_validator(mode="after")
    def exigir_clave_propia_fuera_de_local(self) -> "Settings":
        es_local = self.frontend_url.startswith(("http://localhost", "http://127.0.0.1"))
        if not es_local and self.secret_key == CLAVE_DE_EJEMPLO:
            raise ValueError("SECRET_KEY sigue con el valor de ejemplo: define una clave propia antes de publicar la aplicación.")
        return self


settings = Settings()
