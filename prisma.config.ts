import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './apps/api/src/db/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
});

