"""Unit tests for evidence hashing / integrity (Module 19). No DB needed."""
import hashlib
import os
import tempfile

from app.services.hashing import sha256_file, sha256_bytes, verify_integrity


def test_sha256_bytes_matches_stdlib():
    data = b"forensic evidence content"
    assert sha256_bytes(data) == hashlib.sha256(data).hexdigest()


def test_sha256_file_matches_stdlib():
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(b"a" * 100_000)
        path = f.name
    try:
        expected = hashlib.sha256(b"a" * 100_000).hexdigest()
        assert sha256_file(path) == expected
    finally:
        os.remove(path)


def test_verify_integrity_detects_tampering():
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(b"original evidence bytes")
        path = f.name
    try:
        original_hash = sha256_file(path)
        assert verify_integrity(path, original_hash) is True

        with open(path, "ab") as f:
            f.write(b"tampered")
        assert verify_integrity(path, original_hash) is False
    finally:
        os.remove(path)
