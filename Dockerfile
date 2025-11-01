FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY nx.json tsconfig.base.json ./
COPY apps/admin/auth-api ./apps/admin/auth-api
# Generate Prisma client before building
RUN npx prisma generate --schema=./apps/admin/auth-api/src/db/schema.prisma
RUN npx nx build auth --configuration=staging

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist/apps/admin/auth-api ./dist
COPY --from=builder /app/apps/admin/auth-api/package.json ./
RUN npm install --only=production
# Prisma generate again if needed (optional, since client is copied)
RUN npx prisma generate --schema=./src/db/schema.prisma
RUN npx prisma migrate deploy --schema=./src/db/schema.prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]