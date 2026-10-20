from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routers import auth, desempeno, documentos, proveedores, proveedores_quitar
from app.core.config import settings
from app.core.database import engine

app = FastAPI(title="SkyTour API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(proveedores.router)
app.include_router(proveedores_quitar.router)
app.include_router(documentos.router)
app.include_router(desempeno.router)


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}
