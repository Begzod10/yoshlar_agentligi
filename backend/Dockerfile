# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
# Create a dummy app directory so pip install . succeeds and caches dependencies
RUN mkdir app && touch app/__init__.py
RUN pip install --no-cache-dir --user .

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
COPY . .

# Set path and env vars
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# Expose backend internal port
EXPOSE 8000

# Make start.sh executable and configure as entrypoint
RUN chmod +x start.sh

CMD ["/bin/sh", "start.sh"]
