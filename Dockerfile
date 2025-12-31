FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY nx.json tsconfig.base.json ./
COPY apps/admin/auth-api ./apps/admin/auth-api
# Generate Prisma client before building
RUN cd apps/admin/auth-api/src/db && npx prisma generate
RUN npx nx build auth --configuration=staging

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist/apps/admin/auth-api ./dist
COPY --from=builder /app/package.json ./
RUN npm install -g pnpm && pnpm install --prod
COPY --from=builder /app/apps/admin/auth-api/src/db ./src/db
RUN cd src/db && npx prisma generate
EXPOSE 3000
COPY start.sh ./
RUN chmod +x start.sh
CMD ["./start.sh"]