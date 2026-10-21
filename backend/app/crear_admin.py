"""Crea el primer administrador de un entorno nuevo.

Uso:  python -m app.crear_admin --nombre "Ana Pérez" --correo ana@empresa.com

La contraseña se pide por teclado (no queda en el historial). Para ejecutarlo sin teclado, define ADMIN_PASSWORD.
Apunta a la base que indique DATABASE_URL: revisa a cuál antes de ejecutarlo.
"""
import argparse
import getpass
import os
import sys

from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import Rol, Usuario
from app.services.usuarios import validar_contrasena, validar_correo


def main() -> int:
    parser = argparse.ArgumentParser(description="Crea un usuario administrador.")
    parser.add_argument("--nombre", required=True)
    parser.add_argument("--correo", required=True)
    args = parser.parse_args()

    try:
        correo = validar_correo(args.correo)
    except ValueError as error:
        print(error)
        return 1
    nombre = " ".join(args.nombre.split())
    if len(nombre) < 2:
        print("El nombre es demasiado corto.")
        return 1

    clave = os.environ.get("ADMIN_PASSWORD")
    if clave is None:
        clave = getpass.getpass("Contraseña: ")
        if clave != getpass.getpass("Repite la contraseña: "):
            print("Las contraseñas no coinciden.")
            return 1
    motivo = validar_contrasena(clave)
    if motivo:
        print(motivo)
        return 1

    with SessionLocal() as db:
        if db.scalar(select(Usuario.id).where(func.lower(Usuario.correo) == correo)) is not None:
            print("Ya existe un usuario con ese correo.")
            return 1
        db.add(Usuario(nombre=nombre, correo=correo, contrasena_hash=hash_password(clave), rol=Rol.administrador))
        db.commit()
    print(f"Administrador creado: {correo}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
