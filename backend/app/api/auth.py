"""
Authentication endpoints (Module 18): register, login, refresh, logout.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db
from app.models.models import User, UserSession, RoleEnum
from app.schemas.schemas import UserRegister, UserLogin, TokenPair, RefreshRequest, UserOut
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token,
)
from app.core.config import settings
from app.api.deps import get_current_user, write_audit_log

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=UserOut)
def register(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        role = RoleEnum(payload.role)
    except ValueError:
        role = RoleEnum.VIEWER

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role,
        department=payload.department,
        badge_id=payload.badge_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    write_audit_log(db, user, "USER_REGISTERED", "user", user.id, request)
    return user


@router.post("/login", response_model=TokenPair)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    if user.mfa_enabled:
        if not payload.mfa_code:
            raise HTTPException(status_code=401, detail="MFA code required")
        # MFA verification (TOTP) — pluggable; pyotp.TOTP(user.mfa_secret).verify(code)
        import pyotp  # local import: optional dependency, only needed if MFA enabled
        if not pyotp.TOTP(user.mfa_secret).verify(payload.mfa_code):
            raise HTTPException(status_code=401, detail="Invalid MFA code")

    access = create_access_token(user.id, user.role.value)
    refresh = create_refresh_token(user.id)

    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_password(refresh),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    db.add(session)
    user.last_login = datetime.utcnow()
    db.commit()

    write_audit_log(db, user, "LOGIN", "user", user.id, request)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = db.query(User).filter(User.id == data["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid session")

    access = create_access_token(user.id, user.role.value)
    new_refresh = create_refresh_token(user.id)
    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.revoked == False).update(
        {"revoked": True}
    )
    db.commit()
    write_audit_log(db, user, "LOGOUT", "user", user.id, request)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
