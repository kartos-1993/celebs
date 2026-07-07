FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY turbo.json tsconfig.base.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN npx prisma generate
# Build shared packages and API
RUN pnpm turbo run build --filter=api

FROM node:22-alpine AS runtime
WORKDIR /app
# Copy built API output
COPY --from=builder /app/dist/out-tsc/apps/api ./dist
# Copy config files needed at runtime
COPY --from=builder /app/package.json /app/prisma.config.ts ./
# Copy node_modules from builder (has all deps including prisma)
COPY --from=builder /app/node_modules ./node_modules
# Copy Prisma engine cache from builder
COPY --from=builder /root/.cache/ /root/.cache/
# Copy shared packages for runtime resolution
COPY --from=builder /app/packages/shared-utils/ ./node_modules/@celebs/shared-utils/
COPY --from=builder /app/packages/shared-types/ ./node_modules/@celebs/shared-types/
COPY --from=builder /app/packages/rbac/ ./node_modules/@celebs/rbac/
# Copy Prisma schema (for migrations) and generated client (for queries)
COPY --from=builder /app/apps/api/src/db ./src/db
COPY --from=builder /app/apps/api/src/generated/prisma ./dist/src/generated/prisma
EXPOSE 3000
COPY start.sh ./
RUN chmod +x start.sh
CMD ["./start.sh"]
