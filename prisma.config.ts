import * as fs from 'node:fs';
import { defineConfig } from 'prisma/config';

// Builder/local: ./apps/api/src/db/schema.prisma (WORKDIR = repo root)
// Runtime (Docker): ./src/db/schema.prisma (WORKDIR = /app, schema copied to ./src/db)
const schema = fs.existsSync('./apps/api/src/db/schema.prisma')
  ? './apps/api/src/db/schema.prisma'
  : './src/db/schema.prisma';

export default defineConfig({
  schema,
  datasource: {
    url:
      process.env.DIRECT_URL ||
      process.env.DIRECT_URI ||
      process.env.DATABASE_URL ||
      'postgresql://postgres:celebs@localhost:5432/celebs-auth',
  },
});
