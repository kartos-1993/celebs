#!/bin/sh

echo "Starting deployment tasks..."

# Sync Prisma schema to database using DIRECT_URL (session mode) if available
if [ -n "$DIRECT_URL" ]; then
  echo "Syncing database schema with DIRECT_URL..."
  DATABASE_URL="$DIRECT_URL" npx prisma db push --schema src/db/schema.prisma --accept-data-loss
else
  echo "Syncing database schema with DATABASE_URL..."
  npx prisma db push --schema src/db/schema.prisma --accept-data-loss
fi

echo "Starting application..."
node dist/src/main.js