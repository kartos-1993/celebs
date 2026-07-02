FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY nx.json tsconfig.base.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
# Generate Prisma client
RUN npx prisma generate
# Build shared packages and API (daemon off, fresh DB, no cache)
ENV NX_DAEMON=false
RUN npx nx reset
RUN npx nx build shared-types --skip-nx-cache && npx nx build shared-utils --skip-nx-cache && npx nx build api --configuration=staging --skip-nx-cache

FROM node:22-alpine AS runtime
WORKDIR /app
# Copy built API
COPY --from=builder /app/dist/apps/api ./dist
# Copy package files for dependency installation
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/prisma.config.ts ./
# Copy workspace packages (source first, then overlay compiled JS output)
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/dist/packages/shared-utils/ ./packages/shared-utils/
COPY --from=builder /app/dist/packages/shared-types/ ./packages/shared-types/
# Install prod deps + prisma globally (needed for migrations in start.sh)
RUN npm install -g pnpm prisma && pnpm install --prod
# Copy Prisma schema and generated client
COPY --from=builder /app/apps/api/src/db ./src/db
COPY --from=builder /app/apps/api/src/generated/prisma ./dist/src/generated/prisma
EXPOSE 3000
COPY start.sh ./
RUN chmod +x start.sh
CMD ["./start.sh"]
