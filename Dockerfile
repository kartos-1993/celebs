FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc prisma.config.ts ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY turbo.json tsconfig.base.json ./
RUN npm install -g pnpm@10.12.4 && pnpm install --no-frozen-lockfile
RUN npx prisma generate --schema=apps/api/src/db/schema.prisma
# Build shared packages and API
RUN pnpm turbo run build --filter=api --filter=@celebs/shared-types --filter=@celebs/shared-utils --filter=@celebs/rbac

FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S nodejs && adduser -S app -G nodejs

# Copy built API output
COPY --from=builder --chown=app:nodejs /app/dist/out-tsc/apps/api ./dist
# Copy config files needed at runtime
COPY --from=builder --chown=app:nodejs /app/package.json /app/prisma.config.ts ./
# Copy node_modules from builder (has all deps including prisma)
COPY --from=builder --chown=app:nodejs /app/node_modules ./node_modules
# Copy Prisma engine cache from builder
COPY --from=builder --chown=app:nodejs /root/.cache/prisma /home/app/.cache/prisma
# Copy shared packages for runtime resolution
COPY --from=builder --chown=app:nodejs /app/packages/shared-utils/ ./node_modules/@celebs/shared-utils/
COPY --from=builder --chown=app:nodejs /app/packages/shared-types/ ./node_modules/@celebs/shared-types/
COPY --from=builder --chown=app:nodejs /app/packages/rbac/ ./node_modules/@celebs/rbac/
# Copy Prisma schema (for migrations)
COPY --from=builder --chown=app:nodejs /app/apps/api/src/db ./src/db
COPY --chown=app:nodejs start.sh ./
RUN chmod +x start.sh

USER app
EXPOSE 3000
CMD ["./start.sh"]
