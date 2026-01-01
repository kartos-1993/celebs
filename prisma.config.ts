import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './apps/admin/auth-api/src/db/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
})