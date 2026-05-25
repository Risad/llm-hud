from pathlib import Path
from cryptography.fernet import Fernet
from backend.config import settings


def _load_or_create_key() -> bytes:
    key_file: Path = settings.secret_key_file
    key_file.parent.mkdir(parents=True, exist_ok=True)
    if key_file.exists():
        return key_file.read_bytes()
    key = Fernet.generate_key()
    key_file.write_bytes(key)
    key_file.chmod(0o600)
    return key


_fernet: Fernet | None = None


def get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(_load_or_create_key())
    return _fernet


def encrypt(value: str) -> bytes:
    return get_fernet().encrypt(value.encode())


def decrypt(token: bytes) -> str:
    return get_fernet().decrypt(token).decode()
