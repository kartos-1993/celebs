import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    url: process.env.DATABASE_URL,
  },
})