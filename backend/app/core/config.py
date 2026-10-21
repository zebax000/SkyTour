from typing import Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CLAVE_DE_EJEMPLO = "cambia-esta-clave"


class Settings(BaseSettings):
    database_url: str
    secret_key: str = CLAVE_DE_EJEMPLO
    access_token_expire_minutes: int = 60
    frontend_url: str = "http://localhost:5173"
    seed_password: Optional[str] = None  # solo para el script de datos de demostración

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    @model_validator(mode="after")
    def exigir_clave_propia_fuera_de_local(self) -> "Settings":
        # Con la clave de ejemplo cualquiera podría fabricar sesiones válidas: solo se tolera en tu equipo.
        es_local = self.frontend_url.startswith(("http://localhost", "http://127.0.0.1"))
        if not es_local and self.secret_key == CLAVE_DE_EJEMPLO:
            raise ValueError("SECRET_KEY sigue con el valor de ejemplo: define una clave propia antes de publicar la aplicación.")
        return self


settings = Settings()
