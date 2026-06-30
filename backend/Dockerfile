# Mizan backend image.
FROM python:3.12-slim

# Keep Python lean and unbuffered for container logs.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source.
COPY . .

EXPOSE 8000

# Default command; docker-compose overrides with --reload for local dev.
# NOTE: once Alembic + migrations exist, the startup will run
# `alembic upgrade head` before uvicorn (see docs/setup.md).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
