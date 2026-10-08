"""
FORGE-AI — AI-Powered Digital Forensic Investigation & Evidence Analysis
Platform. FastAPI application entrypoint.
"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.core.config import settings
from app.db.session import Base, engine
from app.api import (
    auth, cases, evidence, analysis, graph, timeline, ai, threat_intel,
    reports, dashboard, users, audit, geolocation,
)

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

app = FastAPI(
    title="FORGE-AI",
    description="AI-Powered Digital Forensic Investigation & Evidence Analysis Platform",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def secure_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if settings.ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


@app.on_event("startup")
def on_startup():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    if engine.dialect.name == "postgresql":
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
        except Exception:
            pass
    Base.metadata.create_all(bind=engine)
    # Pre-warm RAG embedder in background thread to eliminate first-query delay
    try:
        import threading
        from app.services.rag_service import get_embedder
        threading.Thread(target=get_embedder, daemon=True).start()
    except Exception:
        pass



@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}


# --- Routers ---
app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(evidence.router)
app.include_router(analysis.router)
app.include_router(graph.router)
app.include_router(timeline.router)
app.include_router(ai.router)
app.include_router(ai.search_router)
app.include_router(threat_intel.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(users.router)
app.include_router(audit.router)
app.include_router(geolocation.router)


import logging
logger = logging.getLogger("forge.main")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception during {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": f"Request processing failed: {str(exc)}"})

