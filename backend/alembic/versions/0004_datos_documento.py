"""datos documento

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-29 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('documento', sa.Column('entidad_emisora', sa.String(length=200), nullable=True))
    op.add_column('documento', sa.Column('numero_documento', sa.String(length=100), nullable=True))
    op.add_column('documento', sa.Column('titular', sa.String(length=200), nullable=True))
    op.add_column('documento', sa.Column('identificacion_titular', sa.String(length=50), nullable=True))
    op.add_column('documento', sa.Column('lugar', sa.String(length=120), nullable=True))
    op.add_column('documento', sa.Column('objeto', sa.String(length=300), nullable=True))
    op.add_column('documento', sa.Column('resumen', sa.String(length=500), nullable=True))

def downgrade() -> None:
    op.drop_column('documento', 'resumen')
    op.drop_column('documento', 'objeto')
    op.drop_column('documento', 'lugar')
    op.drop_column('documento', 'identificacion_titular')
    op.drop_column('documento', 'titular')
    op.drop_column('documento', 'numero_documento')
    op.drop_column('documento', 'entidad_emisora')