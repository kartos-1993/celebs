#!/bin/sh

echo "Starting deployment tasks..."

# Run Prisma migrations using DIRECT_URL (session mode) if available to avoid hanging on transaction poolers
if [ -n "$DIRECT_URL" ]; then
  echo "Running migrations with DIRECT_URL..."
  DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy --schema src/db/schema.prisma
else
  echo "Running migrations with DATABASE_URL..."
  npx prisma migrate deploy --schema src/db/schema.prisma
fi

echo "Starting application..."
node dist/src/main.js