FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY nx.json tsconfig.base.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
# Generate Prisma client before building
RUN npx prisma generate
# Disable Nx Daemon and DB to prevent SQLite constraint errors in Docker
ENV NX_DAEMON=false
ENV NX_DISABLE_DB=true
RUN npx nx build shared-types --skip-nx-cache && npx nx build shared-utils --skip-nx-cache && npx nx build api --configuration=staging --skip-nx-cache

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist/apps/api ./dist
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/prisma.config.ts ./
COPY --from=builder /app/packages ./packages
RUN npm install -g pnpm && pnpm install --prod
COPY --from=builder /app/apps/api/src/db ./src/db
COPY --from=builder /app/apps/api/src/generated/prisma ./dist/src/generated/prisma
EXPOSE 3000
COPY start.sh ./
RUN chmod +x start.sh
CMD ["./start.sh"]

