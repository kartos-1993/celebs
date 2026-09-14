FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc prisma.config.ts ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY turbo.json tsconfig.base.json ./
RUN npm install -g pnpm@10.12.4 && pnpm install --frozen-lockfile
RUN npx prisma generate --config prisma.config.ts
# Build shared packages and API
RUN pnpm turbo run build --filter=api --filter=@celebs/shared-types --filter=@celebs/shared-utils --filter=@celebs/rbac

FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S nodejs && adduser -S app -G nodejs

# Copy built API output (per-package dist: apps/api/src/main.ts -> apps/api/dist/main.js)
COPY --from=builder --chown=app:nodejs /app/apps/api/dist ./dist
# Copy config files needed at runtime
COPY --from=builder --chown=app:nodejs /app/package.json /app/prisma.config.ts ./
# Copy node_modules from builder (has all deps including prisma)
COPY --from=builder --chown=app:nodejs /app/node_modules ./node_modules
# Copy Prisma engine cache from builder
COPY --from=builder --chown=app:nodejs /root/.cache/prisma /home/app/.cache/prisma
# Copy shared packages dist for bare-specifier runtime resolution (@celebs/* -> node_modules/@celebs/*/dist)
COPY --from=builder --chown=app:nodejs /app/packages/shared-utils/package.json ./node_modules/@celebs/shared-utils/package.json
COPY --from=builder --chown=app:nodejs /app/packages/shared-utils/dist ./node_modules/@celebs/shared-utils/dist
COPY --from=builder --chown=app:nodejs /app/packages/shared-types/package.json ./node_modules/@celebs/shared-types/package.json
COPY --from=builder --chown=app:nodejs /app/packages/shared-types/dist ./node_modules/@celebs/shared-types/dist
COPY --from=builder --chown=app:nodejs /app/packages/rbac/package.json ./node_modules/@celebs/rbac/package.json
COPY --from=builder --chown=app:nodejs /app/packages/rbac/dist ./node_modules/@celebs/rbac/dist
# Copy Prisma schema (for migrations)
COPY --from=builder --chown=app:nodejs /app/apps/api/src/db ./src/db
COPY --chown=app:nodejs start.sh ./
RUN chmod +x start.sh

USER app
EXPOSE 3000
CMD ["./start.sh"]
