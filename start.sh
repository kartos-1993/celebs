#!/bin/sh

# Run Prisma migrations
npx prisma migrate deploy --schema src/db/schema.prisma --url $DATABASE_URL

# Start the application
node dist/src/main.js