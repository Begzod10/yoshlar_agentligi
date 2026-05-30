#!/bin/sh
# Exit immediately if any command fails
set -e

echo "=== Running Alembic Database Migrations ==="
alembic upgrade head

echo "=== Running User Seed Script ==="
python -m scripts.seed_users

echo "=== Starting FastAPI Application ==="
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
