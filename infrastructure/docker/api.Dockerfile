FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install security updates and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Builder stage for compiling wheels
FROM base AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --upgrade pip && \
    pip install build && \
    pip wheel --no-deps --wheel-dir /app/wheels .

# Production runner stage
FROM base AS runner

# Create non-root system user for security hardening
RUN groupadd -g 10001 prime && \
    useradd -u 10001 -g prime -s /bin/sh -d /app prime

# Copy prebuilt wheels and application code
COPY --from=builder /app/wheels /wheels
RUN pip install --no-index --find-links=/wheels /wheels/* && \
    rm -rf /wheels

COPY . .

# Ensure storage directory exists and has permissions
RUN mkdir -p storage/uploads && \
    chown -R prime:prime /app

USER prime

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:8000/api/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers", "--forwarded-allow-ips", "*"]

