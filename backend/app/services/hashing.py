"""
Cryptographic hashing utilities for evidence integrity.
"""
import hashlib


def sha256_file(path: str, chunk_size: int = 65536) -> str:
    """Compute SHA-256 of a file on disk, streaming so large forensic images don't blow memory."""
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def verify_integrity(path: str, expected_hash: str) -> bool:
    """Re-hash the file currently on disk and compare against the recorded original hash."""
    return sha256_file(path) == expected_hash
