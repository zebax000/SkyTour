from pwdlib import PasswordHash

_hasher = PasswordHash.recommended()  # Argon2


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _hasher.verify(password, password_hash)


# TODO(backend): en la fase 3 se agregan aquí la creación y verificación de JWT.
