#!/bin/sh
echo "Starting deployment tasks..."

# Use migrate deploy for production/staging (requires migrations to be committed to git)
if [ -n "$DIRECT_URL" ]; then
  echo "Applying database migrations with DIRECT_URL..."
  DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy --schema src/db/schema.prisma
else
  echo "Applying database migrations with DATABASE_URL..."
  npx prisma migrate deploy --schema src/db/schema.prisma
fi

echo "Starting background worker..."
node dist/src/worker-main.js &

echo "Starting application..."
exec node dist/src/main.js