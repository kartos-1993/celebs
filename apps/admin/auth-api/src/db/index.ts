import { PrismaClient } from '@prisma/client';

// Environment variables are now loaded in main.ts
const prisma = new PrismaClient();

export default prisma;
