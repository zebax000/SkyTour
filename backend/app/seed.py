"""Datos de demostración (ficticios). Se ejecuta con: python -m app.seed

Es seguro repetirlo: no duplica nada de lo que ya existe.
La contraseña de los tres usuarios sale de SEED_PASSWORD en el .env.
"""
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    Documento,
    EstadoProveedor,
    Evaluacion,
    FactorRiesgo,
    Gravedad,
    Incidente,
    Moneda,
    Observacion,
    ParametroRiesgo,
    Proveedor,
    Rol,
    Servicio,
    Tarifa,
    TipoIncidente,
    TipoProveedor,
    Usuario,
    ZonaCobertura,
)

USUARIOS = [
    ("Lucía Restrepo", "admin@skytour.demo", Rol.administrador),
    ("Carlos Mejía", "evaluador@skytour.demo", Rol.evaluador),
    ("Mariana Gómez", "consultor@skytour.demo", Rol.consultor),
]

PUNTOS_MAXIMOS = {
    FactorRiesgo.documentacion: 30,
    FactorRiesgo.calificacion: 25,
    FactorRiesgo.incidentes: 20,
    FactorRiesgo.incumplimientos: 15,
    FactorRiesgo.tarifas: 10,
}

T, E, G = TipoProveedor, EstadoProveedor, Gravedad
INC, INCUM = TipoIncidente.incidente, TipoIncidente.incumplimiento

# Fechas como días respecto a hoy: negativo = pasado, positivo = futuro.
# servicios: (nombre, descripción, [(valor, moneda, desde, hasta)])
# docs: (tipo, emisión, vencimiento) | evals: (calidad, puntualidad, cumplimiento, precio, hace_dias)
# incidentes: (tipo, gravedad, descripción, hace_dias, resuelto)
PROVEEDORES = [
    dict(
        nombre="Hotel Aurora Boutique", nit="901000001-1", tipo=T.hotel, ciudad="Cartagena",
        contacto=("Marta Ruiz", "reservas@aurora.demo", "3001110001"), estado=E.activo,
        servicios=[
            ("Habitación doble", "Alojamiento con desayuno", [(280000, Moneda.COP, -200, 165)]),
            ("Suite frente al mar", "Alojamiento con desayuno y cena", [(520000, Moneda.COP, -200, 165)]),
        ],
        zonas=["Cartagena", "Islas del Rosario"],
        docs=[("Registro Nacional de Turismo (RNT)", -300, 65), ("Póliza de responsabilidad civil", -100, 265)],
        evals=[(5, 4, 5, 4, 20), (4, 5, 5, 4, 60)],
        incidentes=[], obs=["Excelente atención en temporada alta."],
    ),
    dict(
        nombre="Operador Ruta Verde", nit="901000002-2", tipo=T.operador, ciudad="Medellín",
        contacto=("Julián Cano", "info@rutaverde.demo", "3001110002"), estado=E.activo,
        servicios=[("Tour Guatapé y Piedra del Peñol", "Excursión de día completo", [(190000, Moneda.COP, -120, 240)])],
        zonas=["Medellín", "Antioquia"],
        docs=[("Registro Nacional de Turismo (RNT)", -250, 115), ("Póliza de seguro de viajeros", -90, 275)],
        evals=[(4, 4, 5, 4, 15), (4, 5, 4, 3, 50)],
        incidentes=[(INC, G.baja, "Retraso de 20 minutos en la recogida.", 70, True)],
        obs=["Buen manejo de grupos grandes."],
    ),
    dict(
        nombre="Restaurante Sabor de Mar", nit="901000003-3", tipo=T.restaurante, ciudad="Santa Marta",
        contacto=("Rosa Pineda", "contacto@sabordemar.demo", "3001110003"), estado=E.activo,
        servicios=[("Menú grupal pescado y mariscos", "Almuerzo para grupos de hasta 40 personas", [(65000, Moneda.COP, -90, 275)])],
        zonas=["Santa Marta", "Taganga"],
        docs=[("Registro Nacional de Turismo (RNT)", -200, 165), ("Concepto sanitario", -150, 215)],
        evals=[(5, 5, 4, 4, 30)],
        incidentes=[], obs=[],
    ),
    dict(
        nombre="Aerolínea Cóndor Andino", nit="901000004-4", tipo=T.aerolinea, ciudad="Bogotá",
        contacto=("Felipe Arango", "alianzas@condorandino.demo", "3001110004"), estado=E.activo,
        servicios=[("Tiquetes nacionales para grupos", "Tarifa corporativa Bogotá, Cartagena y Medellín", [(310000, Moneda.COP, -60, 305)])],
        zonas=["Bogotá", "Cartagena", "Medellín"],
        docs=[("Certificado de operación aérea", -347, 18), ("Póliza de responsabilidad aeronáutica", -120, 245)],
        evals=[(3, 4, 3, 3, 30), (4, 3, 3, 4, 75)],
        incidentes=[(INC, G.media, "Cancelación de un vuelo con aviso tardío.", 40, False)],
        obs=["Conviene renovar el certificado antes de la temporada alta."],
    ),
    dict(
        nombre="Guías Eje Cafetero", nit="901000005-5", tipo=T.guia, ciudad="Armenia",
        contacto=("Camilo Andrade", "camilo@guiasejecafetero.demo", "3001110005"), estado=E.activo,
        servicios=[("Guianza en fincas cafeteras", "Recorrido de medio día", [(120000, Moneda.COP, -400, -15)])],
        zonas=["Armenia", "Salento", "Pereira"],
        docs=[("Tarjeta profesional de guía", -340, 25)],
        evals=[(3, 3, 4, 3, 25)],
        incidentes=[(INCUM, G.baja, "No entregó el informe de la salida en el plazo acordado.", 50, False)],
        obs=[],
    ),
    dict(
        nombre="Transportes Rápido Caribe", nit="901000006-6", tipo=T.transportador, ciudad="Barranquilla",
        contacto=("Hernán Villa", "operaciones@rapidocaribe.demo", "3001110006"), estado=E.en_seguimiento,
        servicios=[("Traslado aeropuerto - hotel", "Van para hasta 12 pasajeros", [(95000, Moneda.COP, -300, -30)])],
        zonas=["Barranquilla", "Cartagena"],
        docs=[("SOAT", -385, -20), ("Revisión técnico-mecánica", -370, -5)],
        evals=[(2, 2, 3, 2, 15), (2, 1, 2, 2, 45)],
        incidentes=[
            (INC, G.alta, "Vehículo con falla mecánica durante un traslado de grupo.", 10, False),
            (INC, G.alta, "Conductor sin documentos al día en un control vial.", 35, False),
            (INC, G.critica, "Accidente leve sin heridos con un vehículo del proveedor.", 70, True),
            (INCUM, G.media, "No se presentó a un traslado programado.", 25, False),
            (INCUM, G.media, "Llegó 90 minutos tarde a un servicio.", 60, False),
        ],
        obs=["Se solicitó la renovación inmediata del SOAT y de la revisión técnico-mecánica."],
    ),
    dict(
        nombre="Hotel Sierra Nevada Lodge", nit="901000007-7", tipo=T.hotel, ciudad="Santa Marta",
        contacto=("Paula Duarte", "reservas@sierranevadalodge.demo", "3001110007"), estado=E.activo,
        servicios=[("Habitación estándar", "Alojamiento sin desayuno", [(210000, Moneda.COP, -500, -45)])],
        zonas=["Santa Marta", "Minca"],
        docs=[("Registro Nacional de Turismo (RNT)", -377, -12)],
        evals=[(3, 2, 3, 2, 20)],
        incidentes=[
            (INC, G.alta, "Sobreventa de habitaciones: se reubicó a un grupo.", 20, False),
            (INCUM, G.media, "No cumplió el servicio de desayuno pactado.", 30, False),
        ],
        obs=[],
    ),
    dict(
        nombre="Aseguradora Viaje Seguro", nit="901000008-8", tipo=T.aseguradora, ciudad="Bogotá",
        contacto=("Andrea Lozano", "corporativo@viajeseguro.demo", "3001110008"), estado=E.activo,
        servicios=[("Asistencia en viaje", "Cobertura médica y de equipaje", [(45000, Moneda.USD, -30, 335)])],
        zonas=["Bogotá"],
        docs=[], evals=[], incidentes=[], obs=[],
    ),
    dict(
        nombre="Operador Andes Extremos", nit="901000009-9", tipo=T.operador, ciudad="Bucaramanga",
        contacto=("Iván Torres", "info@andesextremos.demo", "3001110009"), estado=E.suspendido,
        servicios=[("Rafting y canotaje", "Actividad de aventura de medio día", [(150000, Moneda.COP, -200, 165)])],
        zonas=["San Gil", "Bucaramanga"],
        docs=[("Registro Nacional de Turismo (RNT)", -380, -15)],
        evals=[(3, 3, 2, 3, 40)],
        incidentes=[(INC, G.critica, "Lesión de un turista durante una actividad.", 55, False)],
        obs=["Suspendido hasta presentar el plan de seguridad actualizado."],
    ),
]


def _fecha(dias: int) -> date:
    return date.today() + timedelta(days=dias)


def _hace(dias: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=dias)


def _parametros(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(ParametroRiesgo)):
        return
    db.add_all(ParametroRiesgo(factor=f, puntos_maximos=p) for f, p in PUNTOS_MAXIMOS.items())


def _usuarios(db: Session) -> None:
    existentes = {c.lower() for c in db.scalars(select(Usuario.correo))}
    nuevos = [u for u in USUARIOS if u[1] not in existentes]
    if not nuevos:
        return
    if not settings.seed_password:
        raise SystemExit("Falta SEED_PASSWORD en el archivo .env (la contraseña de los usuarios de demostración).")
    clave = hash_password(settings.seed_password)
    db.add_all(Usuario(nombre=n, correo=c, contrasena_hash=clave, rol=r) for n, c, r in nuevos)


def _proveedores(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(Proveedor)):
        return
    evaluador = db.scalar(select(Usuario).where(Usuario.rol == Rol.evaluador))
    admin = db.scalar(select(Usuario).where(Usuario.rol == Rol.administrador))
    for d in PROVEEDORES:
        nombre_c, correo_c, tel_c = d["contacto"]
        db.add(
            Proveedor(
                nombre=d["nombre"], nit=d["nit"], tipo=d["tipo"], ciudad=d["ciudad"], estado=d["estado"],
                contacto_nombre=nombre_c, contacto_correo=correo_c, contacto_telefono=tel_c,
                servicios=[
                    Servicio(
                        nombre=n, descripcion=desc,
                        tarifas=[
                            Tarifa(valor=v, moneda=m, vigente_desde=_fecha(desde), vigente_hasta=_fecha(hasta))
                            for v, m, desde, hasta in tarifas
                        ],
                    )
                    for n, desc, tarifas in d["servicios"]
                ],
                zonas=[ZonaCobertura(ciudad_o_region=z) for z in d["zonas"]],
                documentos=[
                    Documento(tipo=t, fecha_emision=_fecha(emi), fecha_vencimiento=_fecha(ven))
                    for t, emi, ven in d["docs"]
                ],
                evaluaciones=[
                    Evaluacion(
                        evaluador_id=evaluador.id, calidad=c, puntualidad=p, cumplimiento=cu, precio=pr,
                        fecha=_hace(dias),
                    )
                    for c, p, cu, pr, dias in d["evals"]
                ],
                incidentes=[
                    Incidente(
                        registrado_por=evaluador.id, tipo=tipo, gravedad=g, descripcion=desc,
                        fecha=_hace(dias), resuelto=res, fecha_cierre=_hace(dias - 5) if res else None,
                        comentario_cierre="Resuelto con el proveedor." if res else None,
                    )
                    for tipo, g, desc, dias, res in d["incidentes"]
                ],
                observaciones=[Observacion(autor_id=admin.id, texto=t, fecha=_hace(5)) for t in d["obs"]],
            )
        )


def main() -> None:
    with SessionLocal() as db:
        _parametros(db)
        _usuarios(db)
        db.flush()  # los usuarios necesitan su id antes de crear evaluaciones e incidentes
        _proveedores(db)
        db.commit()
    print("Datos de demostración listos.")


if __name__ == "__main__":
    main()
