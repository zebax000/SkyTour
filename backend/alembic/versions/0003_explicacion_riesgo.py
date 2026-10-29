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