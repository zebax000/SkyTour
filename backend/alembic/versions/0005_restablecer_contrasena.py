<<<<<<< HEAD
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
=======
"""restablecer contrasena

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-29 00:02:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('restablecimiento_contrasena',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('usuario_id', sa.Integer(), nullable=True),
    sa.Column('token_hash', sa.String(length=64), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('vence_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('usado_en', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_restablecimiento_contrasena_id'), 'restablecimiento_contrasena', ['id'], unique=False)
    op.create_index(op.f('ix_restablecimiento_contrasena_token_hash'), 'restablecimiento_contrasena', ['token_hash'], unique=True)
    op.create_index(op.f('ix_restablecimiento_contrasena_usuario_id'), 'restablecimiento_contrasena', ['usuario_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_restablecimiento_contrasena_usuario_id'), table_name='restablecimiento_contrasena')
    op.drop_index(op.f('ix_restablecimiento_contrasena_token_hash'), table_name='restablecimiento_contrasena')
    op.drop_index(op.f('ix_restablecimiento_contrasena_id'), table_name='restablecimiento_contrasena')
    op.drop_table('restablecimiento_contrasena')
>>>>>>> origin/main
