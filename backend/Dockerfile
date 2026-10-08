FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev libmagic1 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.4.1+cpu \
    && pip install --no-cache-dir -r requirements.txt
# passlib 1.7.4 is incompatible with bcrypt 5's stricter >72-byte handling.
RUN pip install --no-cache-dir bcrypt==4.0.1

# The app falls back to deterministic regex entity extraction when the spaCy
# English model is absent. Keep model downloads out of the image build because
# spaCy's downloader requires raw.githubusercontent.com at build time.

COPY . .

RUN mkdir -p uploads
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
