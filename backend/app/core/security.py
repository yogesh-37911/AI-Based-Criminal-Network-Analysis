"""
Security utilities: password hashing, JWT access/refresh tokens, RBAC helpers.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

import bcrypt

from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")



def hash_password(password: str) -> str:
    secret = password.encode("utf-8")
    # JWT refresh tokens are longer than bcrypt's 72-byte input limit. Hash
    # only oversized inputs first; regular passwords retain their existing
    # bcrypt representation and remain compatible with stored credentials.
    if len(secret) > 72:
        secret = b"sha256$" + hashlib.sha256(secret).hexdigest().encode("ascii")
    return bcrypt.hashpw(secret, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    secret = plain.encode("utf-8")
    if len(secret) > 72:
        secret = b"sha256$" + hashlib.sha256(secret).hexdigest().encode("ascii")
    try:
        return bcrypt.checkpw(secret, hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_token(subject: str, expires_delta: timedelta, extra_claims: Optional[dict] = None, token_type: str = "access") -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + expires_delta,
        "type": token_type,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: str, role: str) -> str:
    return create_token(
        user_id,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        extra_claims={"role": role},
        token_type="access",
    )


def create_refresh_token(user_id: str) -> str:
    return create_token(
        user_id,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        token_type="refresh",
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_token_payload(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    return payload
