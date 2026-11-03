"""Tabla restablecimiento_contrasena para recuperar la contraseña por correo

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-02
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "restablecimiento_contrasena",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("vence_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_en", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_restablecimiento_contrasena_usuario_id",
        "restablecimiento_contrasena",
        ["usuario_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_restablecimiento_contrasena_usuario_id", table_name="restablecimiento_contrasena")
    op.drop_table("restablecimiento_contrasena")
