<<<<<<< HEAD
"""Columnas para guardar la explicacion de riesgo con IA en analisis_riesgo

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-02
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("analisis_riesgo", sa.Column("explicacion_resumen", sa.Text(), nullable=True))
    op.add_column("analisis_riesgo", sa.Column("explicacion_acciones", sa.JSON(), nullable=True))
    op.add_column("analisis_riesgo", sa.Column("explicacion_origen", sa.String(20), nullable=True))
    op.add_column("analisis_riesgo", sa.Column("explicacion_modelo", sa.String(100), nullable=True))
    op.add_column(
        "analisis_riesgo", sa.Column("explicacion_generada_en", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    for col in (
        "explicacion_generada_en",
        "explicacion_modelo",
        "explicacion_origen",
        "explicacion_acciones",
        "explicacion_resumen",
    ):
        op.drop_column("analisis_riesgo", col)
=======
"""explicacion riesgo

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('analisis_riesgo', sa.Column('explicacion_resumen', sa.Text(), nullable=True))
    op.add_column('analisis_riesgo', sa.Column('explicacion_acciones', sa.JSON(), nullable=True))
    op.add_column('analisis_riesgo', sa.Column('explicacion_origen', sa.String(length=20), nullable=True))
    op.add_column('analisis_riesgo', sa.Column('explicacion_modelo', sa.String(length=100), nullable=True))
    op.add_column('analisis_riesgo', sa.Column('explicacion_generada_en', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    op.drop_column('analisis_riesgo', 'explicacion_generada_en')
    op.drop_column('analisis_riesgo', 'explicacion_modelo')
    op.drop_column('analisis_riesgo', 'explicacion_origen')
    op.drop_column('analisis_riesgo', 'explicacion_acciones')
    op.drop_column('analisis_riesgo', 'explicacion_resumen')
>>>>>>> origin/main
