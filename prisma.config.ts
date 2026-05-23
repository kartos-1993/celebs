import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './apps/auth/src/db/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
