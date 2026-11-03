"""Modelo inicial de SkyTour: 12 tablas y 8 enumeraciones

Revision ID: 0001
Revises:
Create Date: 2026-10-19
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _enum(nombre: str, *valores: str) -> postgresql.ENUM:
    return postgresql.ENUM(*valores, name=nombre, create_type=False)


ROL = _enum("rol", "administrador", "evaluador", "consultor")
TIPO_PROVEEDOR = _enum(
    "tipo_proveedor", "hotel", "aerolinea", "transportador", "operador", "guia", "restaurante", "aseguradora"
)
ESTADO_PROVEEDOR = _enum("estado_proveedor", "activo", "en_seguimiento", "suspendido", "inactivo")
MONEDA = _enum("moneda", "COP", "USD")
TIPO_INCIDENTE = _enum("tipo_incidente", "incidente", "incumplimiento")
GRAVEDAD = _enum("gravedad", "baja", "media", "alta", "critica")
NIVEL_RIESGO = _enum("nivel_riesgo", "bajo", "medio", "alto", "sin_datos")
FACTOR_RIESGO = _enum("factor_riesgo", "documentacion", "calificacion", "incidentes", "incumplimientos", "tarifas")
ENUMS = [ROL, TIPO_PROVEEDOR, ESTADO_PROVEEDOR, MONEDA, TIPO_INCIDENTE, GRAVEDAD, NIVEL_RIESGO, FACTOR_RIESGO]


def _ts() -> sa.DateTime:
    return sa.DateTime(timezone=True)


def _pk() -> sa.Column:
    return sa.Column("id", sa.Integer(), primary_key=True)


def _fk(columna: str, destino: str, ondelete: str) -> sa.Column:
    return sa.Column(columna, sa.Integer(), sa.ForeignKey(destino, ondelete=ondelete), nullable=False)


def upgrade() -> None:
    bind = op.get_bind()
    for e in ENUMS:
        e.create(bind, checkfirst=True)

    # ---------- Acceso ----------
    op.create_table(
        "usuario",
        _pk(),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("correo", sa.String(255), nullable=False),
        sa.Column("contrasena_hash", sa.String(255), nullable=False),
        sa.Column("rol", ROL, nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("creado_en", _ts(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_usuario_correo_lower", "usuario", [sa.text("lower(correo)")], unique=True)

    # ---------- Proveedor y sus datos ----------
    op.create_table(
        "proveedor",
        _pk(),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("nit", sa.String(30), nullable=False),
        sa.Column("tipo", TIPO_PROVEEDOR, nullable=False),
        sa.Column("contacto_nombre", sa.String(120)),
        sa.Column("contacto_correo", sa.String(255)),
        sa.Column("contacto_telefono", sa.String(30)),
        sa.Column("ciudad", sa.String(100), nullable=False),
        sa.Column("estado", ESTADO_PROVEEDOR, nullable=False, server_default=sa.text("'activo'")),
        sa.Column("creado_en", _ts(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("nit", name="uq_proveedor_nit"),
    )
    op.create_index("ix_proveedor_tipo_ciudad", "proveedor", ["tipo", "ciudad"])
    op.create_index("ix_proveedor_estado", "proveedor", ["estado"])

    op.create_table(
        "servicio",
        _pk(),
        _fk("proveedor_id", "proveedor.id", "CASCADE"),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("descripcion", sa.Text()),
    )
    op.create_index("ix_servicio_proveedor_id", "servicio", ["proveedor_id"])

    op.create_table(
        "tarifa",
        _pk(),
        _fk("servicio_id", "servicio.id", "CASCADE"),
        sa.Column("valor", sa.Numeric(14, 2), nullable=False),
        sa.Column("moneda", MONEDA, nullable=False, server_default=sa.text("'COP'")),
        sa.Column("vigente_desde", sa.Date(), nullable=False),
        sa.Column("vigente_hasta", sa.Date()),
        sa.CheckConstraint("valor >= 0", name="tarifa_valor_positivo"),
        sa.CheckConstraint(
            "vigente_hasta IS NULL OR vigente_hasta >= vigente_desde", name="tarifa_vigencia_coherente"
        ),
    )
    op.create_index("ix_tarifa_servicio_id", "tarifa", ["servicio_id"])

    op.create_table(
        "zona_cobertura",
        _pk(),
        _fk("proveedor_id", "proveedor.id", "CASCADE"),
        sa.Column("ciudad_o_region", sa.String(120), nullable=False),
        sa.UniqueConstraint("proveedor_id", "ciudad_o_region", name="uq_zona_proveedor_ciudad"),
    )

    # ---------- Documentos ----------
    op.create_table(
        "documento",
        _pk(),
        _fk("proveedor_id", "proveedor.id", "CASCADE"),
        sa.Column("tipo", sa.String(100), nullable=False),
        sa.Column("fecha_emision", sa.Date(), nullable=False),
        sa.Column("fecha_vencimiento", sa.Date(), nullable=False),
        sa.Column("archivo_url", sa.String(500)),
        sa.Column("creado_en", _ts(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("fecha_vencimiento >= fecha_emision", name="documento_fechas_coherentes"),
    )
    op.create_index("ix_documento_proveedor_id", "documento", ["proveedor_id"])
    op.create_index("ix_documento_fecha_vencimiento", "documento", ["fecha_vencimiento"])

    # ---------- Desempeño ----------
    op.create_table(
        "evaluacion",
        _pk(),
        _fk("proveedor_id", "proveedor.id", "RESTRICT"),
        _fk("evaluador_id", "usuario.id", "RESTRICT"),
        sa.Column("calidad", sa.SmallInteger(), nullable=False),
        sa.Column("puntualidad", sa.SmallInteger(), nullable=False),
        sa.Column("cumplimiento", sa.SmallInteger(), nullable=False),
        sa.Column("precio", sa.SmallInteger(), nullable=False),
        sa.Column("comentario", sa.Text()),
        sa.Column("fecha", _ts(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("calidad BETWEEN 1 AND 5", name="evaluacion_calidad_rango"),
        sa.CheckConstraint("puntualidad BETWEEN 1 AND 5", name="evaluacion_puntualidad_rango"),
        sa.CheckConstraint("cumplimiento BETWEEN 1 AND 5", name="evaluacion_cumplimiento_rango"),
        sa.CheckConstraint("precio BETWEEN 1 AND 5", name="evaluacion_precio_rango"),
    )
    op.create_index("ix_evaluacion_proveedor_fecha", "evaluacion", ["proveedor_id", "fecha"])
    op.create_index("ix_evaluacion_evaluador_id", "evaluacion", ["evaluador_id"])

    op.create_table(
        "incidente",
        _pk(),
        _fk("proveedor_id", "proveedor.id", "RESTRICT"),
        _fk("registrado_por", "usuario.id", "RESTRICT"),
        sa.Column("tipo", TIPO_INCIDENTE, nullable=False),
        sa.Column("gravedad", GRAVEDAD, nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("fecha", _ts(), nullable=False, server_default=sa.func.now()),
        sa.Column("resuelto", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("fecha_cierre", _ts()),
        sa.Column("comentario_cierre", sa.Text()),
    )
    op.create_index("ix_incidente_proveedor_fecha", "incidente", ["proveedor_id", "fecha"])
    op.create_index("ix_incidente_registrado_por", "incidente", ["registrado_por"])

    op.create_table(
        "observacion",
        _pk(),
        _fk("proveedor_id", "proveedor.id", "RESTRICT"),
        _fk("autor_id", "usuario.id", "RESTRICT"),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("fecha", _ts(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_observacion_proveedor_fecha", "observacion", ["proveedor_id", "fecha"])
    op.create_index("ix_observacion_autor_id", "observacion", ["autor_id"])

    # ---------- Riesgo ----------
    op.create_table(
        "analisis_riesgo",
        _pk(),
        _fk("proveedor_id", "proveedor.id", "CASCADE"),
        sa.Column("puntaje", sa.SmallInteger()),
        sa.Column("nivel", NIVEL_RIESGO, nullable=False),
        sa.Column("calculado_en", _ts(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("puntaje IS NULL OR puntaje BETWEEN 0 AND 100", name="analisis_puntaje_rango"),
        sa.CheckConstraint("(nivel = 'sin_datos') = (puntaje IS NULL)", name="analisis_sin_datos_coherente"),
    )
    op.create_index(
        "ix_analisis_riesgo_proveedor_calculado", "analisis_riesgo", ["proveedor_id", "calculado_en"]
    )

    op.create_table(
        "analisis_riesgo_factor",
        _pk(),
        _fk("analisis_riesgo_id", "analisis_riesgo.id", "CASCADE"),
        sa.Column("factor", FACTOR_RIESGO, nullable=False),
        sa.Column("puntos", sa.SmallInteger(), nullable=False),
        sa.Column("descripcion", sa.String(255)),
    )
    op.create_index(
        "ix_analisis_riesgo_factor_analisis_riesgo_id", "analisis_riesgo_factor", ["analisis_riesgo_id"]
    )

    op.create_table(
        "parametro_riesgo",
        _pk(),
        sa.Column("factor", FACTOR_RIESGO, nullable=False),
        sa.Column("puntos_maximos", sa.SmallInteger(), nullable=False),
        sa.UniqueConstraint("factor", name="uq_parametro_riesgo_factor"),
    )


def downgrade() -> None:
    for tabla in (
        "parametro_riesgo",
        "analisis_riesgo_factor",
        "analisis_riesgo",
        "observacion",
        "incidente",
        "evaluacion",
        "documento",
        "zona_cobertura",
        "tarifa",
        "servicio",
        "proveedor",
        "usuario",
    ):
        op.drop_table(tabla)
    bind = op.get_bind()
    for e in reversed(ENUMS):
        e.drop(bind, checkfirst=True)
