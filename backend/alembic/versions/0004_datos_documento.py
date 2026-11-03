"""Columnas adicionales de informacion extraida por IA en la tabla documento.

Revision ID: 0004
Revises: 0003
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("documento", sa.Column("entidad_emisora", sa.String(200), nullable=True))
    op.add_column("documento", sa.Column("numero_documento", sa.String(100), nullable=True))
    op.add_column("documento", sa.Column("titular", sa.String(200), nullable=True))
    op.add_column("documento", sa.Column("identificacion_titular", sa.String(50), nullable=True))
    op.add_column("documento", sa.Column("lugar", sa.String(120), nullable=True))
    op.add_column("documento", sa.Column("objeto", sa.String(300), nullable=True))
    op.add_column("documento", sa.Column("resumen", sa.String(500), nullable=True))


def downgrade() -> None:
    for col in ("resumen", "objeto", "lugar", "identificacion_titular", "titular", "numero_documento", "entidad_emisora"):
        op.drop_column("documento", col)
