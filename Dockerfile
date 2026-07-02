FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY nx.json tsconfig.base.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN npx prisma generate
# Build shared packages and API
ENV NX_DAEMON=false
RUN npx nx reset
RUN npx nx build shared-types --skip-nx-cache && npx nx build shared-utils --skip-nx-cache && npx nx build api --configuration=staging --skip-nx-cache

FROM node:22-alpine AS runtime
WORKDIR /app
# Copy built API output
COPY --from=builder /app/dist/apps/api ./dist
# Copy config files needed at runtime
COPY --from=builder /app/package.json /app/prisma.config.ts ./
# Copy node_modules from builder (has all deps including prisma)
COPY --from=builder /app/node_modules ./node_modules
# Copy Prisma engine cache from builder
COPY --from=builder /root/.cache/ /root/.cache/
# Place compiled shared packages in node_modules for runtime resolution
# (TypeScript paths are compile-time only; Node.js needs these in node_modules)
COPY --from=builder /app/dist/packages/shared-utils/ ./node_modules/@celebs/shared-utils/
COPY --from=builder /app/dist/packages/shared-types/ ./node_modules/@celebs/shared-types/
# Copy Prisma schema (for migrations) and generated client (for queries)
COPY --from=builder /app/apps/api/src/db ./src/db
COPY --from=builder /app/apps/api/src/generated/prisma ./dist/src/generated/prisma
EXPOSE 3000
COPY start.sh ./
RUN chmod +x start.sh
CMD ["./start.sh"]
