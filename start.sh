#!/bin/sh

# Run Prisma migrations
cd src/db && npx prisma migrate deploy

# Start the application
node dist/src/main.js