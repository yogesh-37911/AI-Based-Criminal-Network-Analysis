"""
FORGE-AI Configuration
Centralised settings loaded from environment variables (.env).
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "FORGE-AI"
    ENV: str = "development"

    # --- Database ---
    DATABASE_URL: str = "postgresql+psycopg2://forge:forge@localhost:5432/forge_ai"

    # --- Security ---
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_32_BYTES_MIN"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MFA_ISSUER: str = "FORGE-AI"

    # --- CORS ---
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"]

    # --- File Upload ---
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 200
    ALLOWED_EXTENSIONS: List[str] = [
        ".pdf", ".txt", ".csv", ".json", ".xml", ".pcap",
        ".log", ".docx", ".png", ".jpg", ".jpeg", ".zip",
    ]

    # --- AI / LLM ---
    NVIDIA_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    KIMI_API_KEY: str = ""
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "meta/llama-3.2-11b-vision-instruct"
    DEEPSEEK_MODEL: str = "deepseek-ai/deepseek-v4.1-flash"
    KIMI_MODEL: str = "moonshotai/kimi-k2.6"
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-6"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # --- Threat Intel (optional external integrations) ---
    VIRUSTOTAL_API_KEY: str = ""
    ABUSEIPDB_API_KEY: str = ""

    # --- Rate limiting ---
    RATE_LIMIT_PER_MINUTE: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
