"""Archivos de los documentos guardados en la base de datos

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-19
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # El archivo va en su propia tabla para que listar documentos no cargue los bytes
    op.create_table(
        "documento_archivo",
        sa.Column("documento_id", sa.Integer(), sa.ForeignKey("documento.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("tipo_mime", sa.String(100), nullable=False),
        sa.Column("tamano", sa.Integer(), nullable=False),
        sa.Column("datos", sa.LargeBinary(), nullable=False),
        sa.CheckConstraint("tamano > 0", name="documento_archivo_tamano_positivo"),
    )


def downgrade() -> None:
    op.drop_table("documento_archivo")
