import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './apps/api/src/db/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:celebs@localhost:5432/celebs-auth',
  },
});
