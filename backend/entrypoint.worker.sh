#!/bin/sh
set -e

# Build DATABASE_URL from environment variables
export DATABASE_URL="postgresql://${DB_USER:-mailuser}:${DB_PASSWORD:-mailpass}@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-mailagent}"

echo "Waiting for database to be ready..."
# Simple retry loop to wait for database
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
  if nc -z ${DB_HOST:-localhost} ${DB_PORT:-5432} 2>/dev/null; then
    echo "Database is ready!"
    break
  fi
  echo "Attempt $attempt/$max_attempts: Database not ready yet, waiting..."
  sleep 1
  attempt=$((attempt + 1))
done

echo "Starting worker..."
# Determine which worker to run based on WORKER_TYPE environment variable
: "${WORKER_TYPE:=email}"
if [ "$WORKER_TYPE" = "email" ]; then
  exec npm run worker:email
else
  exec npm run worker:ai
fi
