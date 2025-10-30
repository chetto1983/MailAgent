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

echo "Setting up database schema..."
# Use db push for initial setup (creates tables from schema)
# Accept data loss warnings since this is initialization
npx prisma db push --skip-generate --accept-data-loss

echo "Seeding database..."
# Try to seed, but don't fail if seed script doesn't exist
npx prisma db seed || echo "Warning: Database seeding failed or not configured. Application will start anyway."

echo "Starting application..."
exec npm run start:prod
